#!/usr/bin/env node
// B9 (SECURITY DEFINER nuevo/modificado) + B9b (manifest de triggers
// críticos) — seguridad/19_..._diseno.md §4. Detección: TRIPWIRE.
// Enforcement: GATE — cada hallazgo exige un override explícito por
// nombre exacto de función/trigger en el mensaje del commit (ver
// scripts/security/lib/override.mjs), nunca un bypass general.
//
// Alcance: solo migraciones NUEVAS de este PR (0043+). Las migraciones
// históricas (0001-0042) ya están cubiertas por el gate separado de
// check-migrations-structure.mjs — si se modifican, ese check ya falla
// por sí solo.
//
// Checklist mínimo que debe confirmar quien registra el override (no
// automatizable, ver seguridad/19 §4 tabla B9): search_path explícito y
// restringido; validación de auth.uid() si la identidad importa;
// parámetros de usuario validados; revoke/grant explícito, no heredado
// de PUBLIC; sin redefinición encubierta de lógica existente.

import { readFileSync } from 'node:fs';
import { getChangedFiles, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

const MIGRATIONS_DIR = 'supabase/migrations';
const triggerManifest = JSON.parse(readFileSync('security-baseline/manifests/critical-triggers.json', 'utf8')).triggers;
const criticalTriggerNames = new Set(triggerManifest.map((t) => t.trigger));
const criticalFunctionNames = new Set(triggerManifest.map((t) => t.function));

let failed = false;
const lines = [];

const { base, added } = getChangedFiles();
if (base === null) {
	console.log('sin base de comparación — se omite check-security-definer');
	console.log('check-security-definer — PASS (sin diff que evaluar)');
	process.exit(0);
}

const newMigrations = added.filter((p) => p.startsWith(`${MIGRATIONS_DIR}/`) && p.endsWith('.sql'));

if (newMigrations.length === 0) {
	console.log('check-security-definer: sin migraciones nuevas en este PR');
	console.log('');
	console.log('check-security-definer — PASS');
	process.exit(0);
}

for (const path of newMigrations) {
	const content = getFileNow(path) ?? readFileSync(path, 'utf8');

	// SECURITY DEFINER nuevo: buscar cada bloque CREATE (OR REPLACE) FUNCTION
	// que contenga "security definer" y extraer el nombre de la función.
	const funcBlocks = content.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\([^;]*?security definer/gis);
	for (const m of funcBlocks) {
		const fname = m[1];
		if (isOverridden('security-definer', fname)) {
			lines.push(`WARN  ${path}: SECURITY DEFINER en "${fname}" — override registrado (Security-Baseline-Override: security-definer:${fname})`);
		} else {
			failed = true;
			lines.push(
				`FAIL  GATE: ${path} define/modifica "${fname}" como SECURITY DEFINER. Requiere revisión defensiva independiente (checklist: search_path explícito y restringido, validación de auth.uid(), parámetros validados, revoke/grant explícito, sin redefinición encubierta) y luego "Security-Baseline-Override: security-definer:${fname}" en el commit.`
			);
		}
	}

	// Triggers críticos: función subyacente redefinida, o CREATE/DROP TRIGGER con ese nombre.
	for (const trig of criticalTriggerNames) {
		if (new RegExp(`\\b${trig}\\b`, 'i').test(content)) {
			if (isOverridden('critical-trigger', trig)) {
				lines.push(`WARN  ${path}: trigger crítico "${trig}" referenciado — override registrado`);
			} else {
				failed = true;
				lines.push(
					`FAIL  GATE: ${path} referencia el trigger crítico "${trig}" (manifest: security-baseline/manifests/critical-triggers.json). Requiere confirmar que sigue apuntando a la función esperada y no se eliminó silenciosamente, luego "Security-Baseline-Override: critical-trigger:${trig}".`
				);
			}
		}
	}
	for (const fn of criticalFunctionNames) {
		if (new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${fn}\\b`, 'i').test(content)) {
			if (isOverridden('critical-trigger', fn)) {
				lines.push(`WARN  ${path}: función de trigger crítico "${fn}" redefinida — override registrado`);
			} else {
				failed = true;
				lines.push(
					`FAIL  GATE: ${path} redefine "${fn}", función de un trigger crítico del manifest. Confirma que la relación trigger→función sigue siendo la esperada, luego "Security-Baseline-Override: critical-trigger:${fn}".`
				);
			}
		}
	}
}

if (lines.length === 0) {
	lines.push('ok    sin SECURITY DEFINER nuevo ni triggers críticos tocados en las migraciones añadidas');
}

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-security-definer — FAIL' : 'check-security-definer — PASS');
process.exit(failed ? 1 : 0);
