#!/usr/bin/env node
// B10 — policy RLS con USING(true)/WITH CHECK(true) — seguridad/19 §4.
// Detección: TRIPWIRE. Enforcement: GATE. El nombre de la policy nunca
// se acepta como prueba de seguridad por sí mismo (corrección Kimi
// RT-002) — cualquier aparición nueva, tenga el nombre que tenga, exige
// override explícito, igual que una ya inventariada como legítima.

import { readFileSync } from 'node:fs';
import { getChangedFiles, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

const MIGRATIONS_DIR = 'supabase/migrations';
const inventory = JSON.parse(readFileSync('security-baseline/manifests/using-true-policies.json', 'utf8')).policies;
const knownNames = new Set(inventory.map((p) => p.policy));

let failed = false;
const lines = [];

const { base, added } = getChangedFiles();
if (base === null) {
	console.log('check-using-true — PASS (sin base de comparación)');
	process.exit(0);
}

const newMigrations = added.filter((p) => p.startsWith(`${MIGRATIONS_DIR}/`) && p.endsWith('.sql'));

if (newMigrations.length === 0) {
	console.log('check-using-true: sin migraciones nuevas en este PR');
	console.log('');
	console.log('check-using-true — PASS');
	process.exit(0);
}

// create policy "nombre" on tabla for operacion ... using (true) / with check (true)
const policyRe = /create\s+policy\s+"([^"]+)"\s+on\s+([\w.]+)\s+for\s+(\w+)[\s\S]*?(?:using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\))/gis;

for (const path of newMigrations) {
	const content = getFileNow(path) ?? readFileSync(path, 'utf8');
	for (const m of content.matchAll(policyRe)) {
		const [, name, table, op] = m;
		if (knownNames.has(name)) {
			lines.push(`ok    ${path}: "${name}" sobre ${table} (${op}) — ya inventariada como legítima en security-baseline/manifests/using-true-policies.json`);
			continue;
		}
		if (isOverridden('using-true', name)) {
			lines.push(`WARN  ${path}: "${name}" sobre ${table} (${op}) — no estaba en el inventario, pero tiene override registrado en este commit`);
		} else {
			failed = true;
			lines.push(
				`FAIL  GATE: ${path} introduce la policy "${name}" sobre ${table} (${op}) con using(true)/with check(true), no listada en security-baseline/manifests/using-true-policies.json. ` +
					`El nombre por sí solo no demuestra que el acceso público sea intencional. Revisa qué columnas expone realmente, y si es correcto añade la entrada al manifest y "Security-Baseline-Override: using-true:${name}" al commit.`
			);
		}
	}
}

if (lines.length === 0) {
	lines.push('ok    sin policies using(true)/with check(true) nuevas en las migraciones añadidas');
}

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-using-true — FAIL' : 'check-using-true — PASS');
process.exit(failed ? 1 : 0);
