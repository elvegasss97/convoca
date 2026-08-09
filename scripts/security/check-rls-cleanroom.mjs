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
const IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.155';
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
sh(`docker run --rm -d --name ${CONTAINER} -e POSTGRES_PASSWORD=test -p ${PORT}:5432 ${IMAGE}`, { stdio: 'ignore' });

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
const result = spawnSync('npx', [`supabase@${CLI_VERSION}`, 'db', 'diff', '--from', `postgresql://postgres:test@127.0.0.1:${PORT}/postgres`, '--to', 'migrations', '--schema', 'public'], {
	encoding: 'utf8',
	timeout: 10 * 60 * 1000
});

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

if (result.status !== 0) {
	console.log(output);
	console.log('FAIL: el comando de comparación falló (revisar si es un error de aplicación de migración o de conexión)');
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

const jsonLine = output.split('\n').find((l) => l.startsWith('{"diff"'));
if (!jsonLine) {
	console.log(output);
	console.log('FAIL: no se encontró el bloque JSON de diff en la salida del CLI');
	console.log('\ncheck-rls-cleanroom — FAIL');
	process.exit(1);
}

const { diff } = JSON.parse(jsonLine);

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
