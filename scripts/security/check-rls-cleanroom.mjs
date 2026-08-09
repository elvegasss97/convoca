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
// --to migrations --schema public --output <archivo>`. El CLI construye
// el shadow con TODAS las migraciones aplicadas (incluye el bootstrap de
// storage/auth que necesita, p.ej., 0006 al insertar en storage.buckets
// — replicar eso a mano con Docker puro no es fiable, ver
// seguridad/30_...md) y escribe el diff necesario para llevar la réplica
// vacía a ese estado directamente a un archivo — nunca se captura como
// string gigante de stdout/stderr en el proceso Node (ver historial de
// fallos abajo). Cada "ALTER TABLE public.X ... ENABLE ROW LEVEL
// SECURITY" en ese diff es prueba de que X tiene RLS en el esquema
// reconstruido; cada "CREATE TABLE public.X" sin esa línea es una tabla
// sin RLS.
//
// No se conecta a producción ni a staging: la réplica "--from" es un
// contenedor Postgres vacío recién creado, nunca un proyecto real.
//
// Historial de fallos reales encontrados ejecutando este check sobre un
// PR real en GitHub Actions (antes de esta versión): (1) capturar el
// resultado vía spawnSync({encoding:'utf8'}) y hacer console.log() de un
// blob de ~100-200KB en una sola llamada mataba el proceso Node en
// silencio (exit 1, sin ningún mensaje) en el runner estándar — no
// reproducible en local. (2) --output-format json mezclaba en stdout
// contenido variable entre ejecuciones (npx, avisos de la propia CLI),
// haciendo el parseo de JSON no fiable. La vía por archivo (--output)
// evita ambos problemas de raíz: nunca pasa por un console.log() grande,
// y el archivo contiene únicamente el SQL del diff, sin ningún ruido de
// npx/logging mezclado.

import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI_VERSION = '2.113.0';
// Imagen ligera (no la de Supabase) para el destino vacío: el propio CLI
// levanta ADEMÁS su shadow completo (postgres+storage-api+gotrue+realtime)
// para aplicar las migraciones — con las dos réplicas de Supabase-postgres
// vivas a la vez, este check llegó a agotar recursos en el runner estándar
// de GitHub Actions. postgres vacío no necesita ninguna extensión de
// Supabase — solo sirve de destino "vacío" contra el que medir el diff.
const IMAGE = 'postgres:17-alpine';
const CONTAINER = `security_baseline_rls_${process.pid}`;
const PORT = 55000 + (process.pid % 1000);
const DIFF_FILE = join(tmpdir(), `security-baseline-rls-diff-${process.pid}.sql`);

function sh(cmd, opts = {}) {
	return execSync(cmd, { encoding: 'utf8', ...opts });
}

function cleanup() {
	try {
		sh(`docker rm -f ${CONTAINER}`, { stdio: 'ignore' });
	} catch {
		/* no-op */
	}
	try {
		if (existsSync(DIFF_FILE)) unlinkSync(DIFF_FILE);
	} catch {
		/* no-op */
	}
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

// Nunca console.log() de un blob grande de una vez: confirmado que eso
// solo, por sí mismo, mataba el proceso en silencio en GitHub Actions.
function safePrint(text, maxChars = 4000) {
	const clipped = text.length > maxChars ? `${text.slice(0, maxChars)}\n... [recortado, ${text.length} caracteres totales] ...` : text;
	for (const line of clipped.split('\n')) console.log(line);
}

console.log('check-rls-cleanroom: levantando réplica vacía desechable...');
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

console.log(`check-rls-cleanroom: supabase@${CLI_VERSION} db diff --from <réplica vacía> --to migrations --schema public --output <archivo>`);
const result = spawnSync(
	'npx',
	[`supabase@${CLI_VERSION}`, 'db', 'diff', '--from', `postgresql://postgres:test@127.0.0.1:${PORT}/postgres`, '--to', 'migrations', '--schema', 'public', '--output', DIFF_FILE],
	{ encoding: 'utf8', timeout: 10 * 60 * 1000 }
);

if (result.status !== 0) {
	safePrint(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
	console.log(`FAIL: el comando de comparación falló (status=${result.status}, signal=${result.signal ?? 'ninguna'}) — revisar si es un error de aplicación de migración o de conexión`);
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

if (!existsSync(DIFF_FILE)) {
	safePrint(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
	console.log(`FAIL: el CLI terminó con exit 0 pero no escribió ${DIFF_FILE}`);
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

const diff = readFileSync(DIFF_FILE, 'utf8');

const createdTables = new Set([...diff.matchAll(/CREATE TABLE public\.(\w+)\s*\(/g)].map((m) => m[1]));
const rlsEnabledTables = new Set([...diff.matchAll(/ALTER TABLE public\.(\w+)\s*\n\s*ENABLE ROW LEVEL SECURITY;/g)].map((m) => m[1]));

console.log(`ok: ${createdTables.size} tablas en public reconstruidas desde las migraciones (diff: ${diff.length} caracteres)`);

const withoutRls = [...createdTables].filter((t) => !rlsEnabledTables.has(t)).sort();

if (createdTables.size === 0) {
	console.log('FAIL: el diff no contiene ningún "CREATE TABLE public.X" — revisar si el mecanismo de comparación sigue siendo válido');
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

if (withoutRls.length > 0) {
	console.log(`FAIL: ${withoutRls.length} tabla(s) sin RLS habilitada: ${withoutRls.join(', ')}`);
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

console.log(`ok: las ${createdTables.size} tablas tienen RLS habilitada`);
console.log('\ncheck-rls-cleanroom — PASS');
process.exit(0);
