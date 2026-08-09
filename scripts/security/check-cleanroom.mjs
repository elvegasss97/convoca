#!/usr/bin/env node
// §5 del encargo — GARANTÍA VERIFICADA: una base local vacía debe poder
// reconstruirse aplicando supabase/migrations/*.sql en orden, con
// Supabase CLI 2.113.0. No se conecta a producción ni a staging: se pasa
// un --db-url deliberadamente inalcanzable como destino de comparación,
// de forma que la fase de "aplicar migraciones al shadow" (la que nos
// interesa) ocurre igual, y la fase de comparación posterior falla rápido
// sin llegar a ningún proyecto real — el propio CLI construye el shadow
// vía Docker antes de intentar conectar al destino, comportamiento
// verificado empíricamente antes de escribir este script (ver
// seguridad/30_..._implementacion.md).
//
// Requiere Docker disponible localmente/en el runner. No requiere
// SUPABASE_ACCESS_TOKEN ni SUPABASE_DB_PASSWORD.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const CLI_VERSION = '2.113.0';
const DUMMY_TARGET = 'postgresql://postgres:postgres@127.0.0.1:1/postgres';

const expectedFiles = readdirSync('supabase/migrations')
	.filter((f) => f.endsWith('.sql'))
	.sort();

console.log(`check-cleanroom: aplicando ${expectedFiles.length} migraciones con supabase@${CLI_VERSION} (db diff --db-url <destino inalcanzable>, --schema public)`);

const result = spawnSync('npx', [`supabase@${CLI_VERSION}`, 'db', 'diff', '--db-url', DUMMY_TARGET, '--schema', 'public', '--output-format', 'json'], {
	encoding: 'utf8',
	timeout: 10 * 60 * 1000
});

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
// Imprimir en líneas cortas, nunca como un solo write() de todo el
// bloque: un output grande matando el proceso en silencio en GitHub
// Actions ya se confirmó una vez en check-rls-cleanroom.mjs — mismo
// cuidado aquí aunque este output normalmente sea pequeño (el destino
// dummy hace fallar la comparación antes de generar un diff grande).
for (const line of output.split('\n')) console.log(line);

const appliedLines = [...output.matchAll(/Applying migration ([\w.-]+)\.\.\./g)].map((m) => m[1]);
const appliedSet = new Set(appliedLines);
const missing = expectedFiles.filter((f) => !appliedSet.has(f.replace(/\.sql$/, '')) && !appliedSet.has(f));

// El CLI imprime "Applying migration <nombre-sin-extensión>...": normalizamos.
const appliedBase = new Set(appliedLines.map((n) => n.replace(/\.sql$/, '')));
const missingReal = expectedFiles.filter((f) => !appliedBase.has(f.replace(/\.sql$/, '')));

// ¿Apareció algún ERROR real de Postgres (no el de conexión al destino dummy)?
const hasMigrationError = /ERROR:.*\n(?:.*\n)*?At statement:/m.test(output) || /failed to provision the shadow database/i.test(output);

let failed = false;

if (missingReal.length > 0) {
	failed = true;
	console.log(`FAIL: ${missingReal.length} migración(es) nunca llegaron a aplicarse: ${missingReal.join(', ')}`);
} else {
	console.log(`ok: las ${expectedFiles.length} migraciones aparecen aplicadas en el shadow (0001 → ${expectedFiles.at(-1)})`);
}

if (hasMigrationError) {
	failed = true;
	console.log('FAIL: el output contiene un error de aplicación de migración (no solo el fallo esperado de conexión al destino dummy).');
}

console.log('');
console.log(failed ? 'check-cleanroom — FAIL' : 'check-cleanroom — PASS');
process.exit(failed ? 1 : 0);
