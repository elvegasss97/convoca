#!/usr/bin/env node
// §6 del encargo — sobre la DB clean-room resultante: toda tabla de
// `public` debe tener RLS habilitada. GATE (no TRIPWIRE): se demuestra
// contra un esquema real reconstruido desde las migraciones versionadas
// (Supabase CLI 2.113.0), no contra el texto de las migraciones — más
// fuerte que B1 de seguridad/19 (que es solo texto). No asume que el
// número de tablas se mantenga en 47: evalúa cualquier tabla que exista
// de verdad tras aplicar las migraciones versionadas.
//
// Mecanismo: `supabase db diff --from <réplica vacía y desechable>
// --to migrations --schema public`. El CLI construye el shadow con
// TODAS las migraciones aplicadas (incluye el bootstrap de storage/auth
// que necesita, p.ej., 0006 al insertar en storage.buckets — replicar
// eso a mano con Docker puro no es fiable, ver seguridad/30_...md) y
// calcula el diff necesario para llevar la réplica vacía a ese estado.
// Cada "ALTER TABLE public.X ... ENABLE ROW LEVEL SECURITY" en ese diff
// es prueba de que X tiene RLS en el esquema reconstruido; cada
// "CREATE TABLE public.X" sin esa línea es una tabla sin RLS.
//
// No se conecta a producción ni a staging: la réplica "--from" es un
// contenedor Postgres vacío recién creado, nunca un proyecto real.

import { spawnSync, execSync } from 'node:child_process';

const CLI_VERSION = '2.113.0';
// Imagen ligera (no la de Supabase) para el destino vacío: el propio CLI
// levanta ADEMÁS su shadow completo (postgres+storage-api+gotrue+realtime)
// para aplicar las migraciones — con las dos réplicas de Supabase-postgres
// vivas a la vez, este check moría en silencio (sin mensaje de error, a
// mitad del diff) en el runner estándar de GitHub Actions, confirmado
// ejecutándolo de verdad sobre un PR real antes de fusionarlo. postgres
// vacío no necesita ninguna extensión de Supabase — solo sirve de
// destino "vacío" contra el que medir el diff.
const IMAGE = 'postgres:17-alpine';
const CONTAINER = `security_baseline_rls_${process.pid}`;
const PORT = 55000 + (process.pid % 1000);

function sh(cmd, opts = {}) {
	return execSync(cmd, { encoding: 'utf8', ...opts });
}

function cleanup() {
	try {
		sh(`docker rm -f ${CONTAINER}`, { stdio: 'ignore' });
	} catch {
		/* no-op */
	}
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

console.log('check-rls-cleanroom: levantando réplica vacía desechable...');
// shared_buffers/max_connections bajos deliberadamente: este Postgres
// nunca recibe carga real, solo sirve de destino vacío para el diff —
// minimizar su huella de memoria deja más margen al shadow completo que
// levanta el propio CLI en paralelo (ver comentario de IMAGE arriba).
sh(
	`docker run --rm -d --name ${CONTAINER} -e POSTGRES_PASSWORD=test -p ${PORT}:5432 ${IMAGE} -c shared_buffers=16MB -c max_connections=20`,
	{ stdio: 'ignore' }
);

let ready = false;
for (let i = 0; i < 30; i++) {
	try {
		sh(`docker exec ${CONTAINER} pg_isready -U postgres`, { stdio: 'ignore' });
		ready = true;
		break;
	} catch {
		sh('sleep 1');
	}
}
if (!ready) {
	console.log('FAIL: la réplica desechable nunca quedó lista');
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

console.log(`check-rls-cleanroom: supabase@${CLI_VERSION} db diff --from <réplica vacía> --to migrations --schema public`);
// --output-format json explícito: el formato por defecto ("text") varía
// según el entorno (confirmado: JSON en local, texto plano en GitHub
// Actions con la misma versión de CLI) — sin fijarlo, este parseo deja
// de ser fiable de forma no determinista entre entornos.
const result = spawnSync(
	'npx',
	[`supabase@${CLI_VERSION}`, 'db', 'diff', '--from', `postgresql://postgres:test@127.0.0.1:${PORT}/postgres`, '--to', 'migrations', '--schema', 'public', '--output-format', 'json'],
	{ encoding: 'utf8', timeout: 10 * 60 * 1000 }
);

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

// Nunca console.log() del blob completo: un solo write() de decenas de KB
// mató el proceso en silencio (exit 1, sin mensaje) en GitHub Actions,
// confirmado ejecutándolo de verdad sobre un PR real. Se trocea en líneas
// cortas y, si hace falta, se recorta — preferible perder detalle de log
// a perder el mensaje de error por completo.
function safePrint(text, maxChars = 4000) {
	const clipped = text.length > maxChars ? `${text.slice(0, maxChars)}\n... [recortado, ${text.length} caracteres totales] ...` : text;
	for (const line of clipped.split('\n')) {
		console.log(line);
	}
}

if (result.status !== 0) {
	safePrint(output);
	console.log(`FAIL: el comando de comparación falló (status=${result.status}, signal=${result.signal ?? 'ninguna'}) — revisar si es un error de aplicación de migración o de conexión`);
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

// Búsqueda robusta del bloque JSON: por posición de '{"diff"' en todo el
// output (no solo como inicio de línea), ya que --output-format json no
// garantiza por sí solo que no haya texto adicional de npx/logging antes.
const jsonStart = output.indexOf('{"diff"');
let parsed = null;
if (jsonStart !== -1) {
	try {
		parsed = JSON.parse(output.slice(jsonStart).trim());
	} catch {
		parsed = null;
	}
}
if (!parsed) {
	safePrint(output);
	console.log('FAIL: no se pudo encontrar/parsear el bloque JSON de diff en la salida del CLI');
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}
const { diff } = parsed;

const createdTables = new Set([...diff.matchAll(/CREATE TABLE public\.(\w+)\s*\(/g)].map((m) => m[1]));
const rlsEnabledTables = new Set([...diff.matchAll(/ALTER TABLE public\.(\w+)\s*\n\s*ENABLE ROW LEVEL SECURITY;/g)].map((m) => m[1]));

console.log(`ok: ${createdTables.size} tablas en public reconstruidas desde las migraciones`);

const withoutRls = [...createdTables].filter((t) => !rlsEnabledTables.has(t)).sort();

if (withoutRls.length > 0) {
	console.log(`FAIL: ${withoutRls.length} tabla(s) sin RLS habilitada: ${withoutRls.join(', ')}`);
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

console.log(`ok: las ${createdTables.size} tablas tienen RLS habilitada`);
console.log('\ncheck-rls-cleanroom — PASS');
process.exit(0);
