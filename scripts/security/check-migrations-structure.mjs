#!/usr/bin/env node
// B1 (nueva tabla sin RLS) + B2 (disable row level security literal) +
// B3 (numeración de migraciones) + gate de modificación de migraciones
// históricas (0001-0042, ya aplicadas — ver seguridad/29_cierre_b_0042.md).
//
// Todos TRIPWIRE de texto (B1/B2/B3) salvo el gate de históricas, que es
// GATE puro. Nivel declarado explícitamente en cada fallo — ver
// seguridad/19_security_baseline_v1_diseno.md §1.1 y §4 (B1/B2/B3, B9b
// para el principio de "archivo histórico ya aplicado no se toca sin
// revisión").
//
// Alcance declarado de B1 (igual que en el diseño): solo esquema `public`,
// identificadores `snake_case` sin comillas. No cubre otros esquemas ni
// identificadores citados/con mayúsculas — límite conocido, no oculto.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getChangedFiles, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

const MIGRATIONS_DIR = 'supabase/migrations';
const HISTORICAL_LAST_VERSION = 42; // 0001-0042 ya reconciliadas y aplicadas (Bloque B).

let failed = false;
const findings = [];

function fail(msg) {
	failed = true;
	findings.push(`FAIL  ${msg}`);
}
function ok(msg) {
	findings.push(`ok    ${msg}`);
}
function warn(msg) {
	findings.push(`WARN  ${msg}`);
}

// --- B3: numeración de migraciones (TRIPWIRE) ---------------------------

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
const versionRe = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const versions = [];
for (const f of files) {
	const m = f.match(versionRe);
	if (!m) {
		fail(`B3: "${f}" no cumple el formato NNNN_descripcion.sql`);
		continue;
	}
	versions.push({ file: f, num: parseInt(m[1], 10) });
}
versions.sort((a, b) => a.num - b.num);

const seen = new Set();
for (const v of versions) {
	if (seen.has(v.num)) fail(`B3: versión duplicada ${String(v.num).padStart(4, '0')} (${v.file})`);
	seen.add(v.num);
}
for (let i = 0; i < versions.length; i++) {
	const expected = i + 1;
	if (versions[i].num !== expected) {
		fail(
			`B3: hueco/orden inesperado en la numeración — se esperaba ${String(expected).padStart(4, '0')}, se encontró ${String(versions[i].num).padStart(4, '0')} (${versions[i].file})`
		);
		break; // un solo hueco ya es suficiente señal; evita ruido en cascada
	}
}
if (!failed) ok(`B3: ${versions.length} migraciones, numeración secuencial ${versions[0]?.file} → ${versions.at(-1)?.file}, sin huecos ni duplicados`);

// --- Gate de migraciones históricas modificadas (0001-0042) -------------

const { base, added, modified } = getChangedFiles();
if (base === null) {
	warn('sin base de comparación (repo de un solo commit) — se omite el gate de históricas y B1/B2 sobre diff');
} else {
	for (const path of modified) {
		if (!path.startsWith(`${MIGRATIONS_DIR}/`)) continue;
		const fname = path.slice(MIGRATIONS_DIR.length + 1);
		const m = fname.match(versionRe);
		if (!m) continue;
		const num = parseInt(m[1], 10);
		if (num <= HISTORICAL_LAST_VERSION) {
			const versionStr = m[1];
			if (isOverridden('historical-migration', versionStr)) {
				warn(`histórica ${fname} modificada — override registrado en el commit (Security-Baseline-Override: historical-migration:${versionStr})`);
			} else {
				fail(
					`GATE: "${fname}" es una migración histórica ya aplicada en producción (0001-${String(HISTORICAL_LAST_VERSION).padStart(4, '0')}) y este PR la modifica. ` +
						`Requiere revisión explícita: añade al mensaje del commit "Security-Baseline-Override: historical-migration:${versionStr}" solo si el cambio es intencional y ya se evaluó su impacto en el tracking real de producción.`
				);
			}
		}
	}

	// --- B1/B2 solo sobre archivos NUEVOS de este PR ---------------------

	const newMigrationFiles = added.filter((p) => p.startsWith(`${MIGRATIONS_DIR}/`) && p.endsWith('.sql'));
	const createdTables = new Set();
	const rlsEnabledTables = new Set();
	let anyDisableRls = false;

	for (const path of newMigrationFiles) {
		const content = getFileNow(path) ?? readFileSync(path, 'utf8');
		if (/disable\s+row\s+level\s+security/i.test(content)) {
			anyDisableRls = true;
			fail(`B2: "${path}" contiene "disable row level security" — no hay variante legítima conocida de este literal en este esquema.`);
		}
		for (const m of content.matchAll(/create\s+table\s+public\.(\w+)/gi)) {
			createdTables.add(m[1].toLowerCase());
		}
		for (const m of content.matchAll(/alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi)) {
			rlsEnabledTables.add(m[1].toLowerCase());
		}
	}

	if (newMigrationFiles.length === 0) {
		ok('B1/B2: sin migraciones nuevas en este PR');
	} else {
		for (const table of createdTables) {
			if (!rlsEnabledTables.has(table)) {
				fail(`B1: la tabla nueva "public.${table}" no tiene "alter table public.${table} enable row level security" en las migraciones añadidas por este PR.`);
			}
		}
		if (createdTables.size > 0 && [...createdTables].every((t) => rlsEnabledTables.has(t))) {
			ok(`B1: ${createdTables.size} tabla(s) nueva(s), todas con RLS habilitada en el mismo PR`);
		}
		if (!anyDisableRls) ok('B2: sin "disable row level security" en migraciones nuevas');
	}

	// --- Tripwires de seguridad/44_revision_0044_r2.md -------------------
	// 4 regresiones concretas ya encontradas y corregidas una vez en la
	// revisión 0044-R2: si una migración futura vuelve a redefinir alguna
	// de estas funciones/tabla, debe seguir conteniendo el patrón que la
	// protege. No fallan al crear el objeto (todas son sintácticamente
	// válidas sin la protección) — solo cambian el comportamiento en
	// tiempo de ejecución, así que ni el cleanroom ni el chequeo de tipos
	// las detectarían por sí solos.
	for (const path of newMigrationFiles) {
		const content = getFileNow(path) ?? readFileSync(path, 'utf8');

		if (/create\s+table\s+public\.write_rate_limits/i.test(content)) {
			if (!/revoke\s+all\s+on\s+public\.write_rate_limits\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(content)) {
				fail(
					`0044-tripwire: "${path}" crea public.write_rate_limits sin el REVOKE ALL explícito para PUBLIC/anon/authenticated (regresión de seguridad/44_revision_0044_r2.md §2 — antes solo dependía de RLS-sin-políticas).`
				);
			} else {
				ok('0044-tripwire: write_rate_limits mantiene el REVOKE ALL explícito para PUBLIC/anon/authenticated');
			}
		}

		if (/create\s+(?:or\s+replace\s+)?function\s+public\.enforce_write_rate_limit/i.test(content)) {
			if (!/pg_advisory_xact_lock/i.test(content)) {
				fail(
					`0044-tripwire: "${path}" redefine enforce_write_rate_limit() sin pg_advisory_xact_lock — reintroduce la carrera de concurrencia confirmada empíricamente en seguridad/44_revision_0044_r2.md §1 (10 inserts concurrentes bypasseaban el límite por completo).`
				);
			} else {
				ok('0044-tripwire: enforce_write_rate_limit mantiene el advisory lock transaccional');
			}
		}

		if (/create\s+(?:or\s+replace\s+)?function\s+public\.set_concern_listening_survey_response/i.test(content)) {
			if (!/p_community\s+not\s+in\s*\(/i.test(content)) {
				fail(
					`0044-tripwire: "${path}" redefine set_concern_listening_survey_response() sin el catálogo cerrado de p_community — reintroduce el hallazgo de seguridad/44_revision_0044_r2.md §3 (categorías inventadas suprimen el desglose territorial público).`
				);
			} else {
				ok('0044-tripwire: set_concern_listening_survey_response mantiene el catálogo cerrado de p_community');
			}
		}

		if (/create\s+(?:or\s+replace\s+)?function\s+public\.get_attendance_counts/i.test(content)) {
			if (!/status\s+not\s+in\s*\(\s*'draft'/i.test(content)) {
				fail(
					`0044-tripwire: "${path}" redefine get_attendance_counts() sin el filtro de estado no público — reintroduce el hallazgo de seguridad/44_revision_0044_r2.md §5 (enumeración de eventos draft/pending_review/hidden/rejected).`
				);
			} else {
				ok('0044-tripwire: get_attendance_counts mantiene el filtro de estado no público');
			}
		}
	}
}

console.log(findings.join('\n'));
console.log('');
console.log(failed ? 'check-migrations-structure — FAIL' : 'check-migrations-structure — PASS');
process.exit(failed ? 1 : 0);
