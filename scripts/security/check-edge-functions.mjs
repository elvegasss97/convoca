#!/usr/bin/env node
// G-SR — Edge Function nueva/modificada que usa service_role — seguridad/19 §4.
// Detección: TRIPWIRE. Enforcement: GATE con checklist de 8 puntos
// (justificación, auth previa, identidad vía JWT nunca del body, errores
// sanitizados, CORS, rate limiting, tests mínimos, secreto nunca logueado).
//
// Heurística deliberada para no generar fricción en cada retoque trivial
// de una función ya auditada (ver security-baseline/manifests/
// edge-functions-service-role.json): una función YA inventariada solo
// dispara el gate si el diff toca líneas relacionadas con autorización
// (service_role, createClient, auth.) — no por cualquier cambio de texto.
// Una función NUEVA que use service_role, o una NO inventariada que
// empiece a usarlo, siempre dispara el gate.

import { readFileSync } from 'node:fs';
import { getChangedFiles, getFileDiff, addedLines, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

const FUNCTIONS_DIR = 'supabase/functions';
const inventory = JSON.parse(readFileSync('security-baseline/manifests/edge-functions-service-role.json', 'utf8')).functions;
const inventoryByPath = new Map(inventory.map((f) => [f.path, f]));

let failed = false;
const lines = [];

const { base, added, modified } = getChangedFiles();
if (base === null) {
	console.log('check-edge-functions — PASS (sin base de comparación)');
	process.exit(0);
}

const changedFunctionFiles = [...added, ...modified].filter((p) => p.startsWith(`${FUNCTIONS_DIR}/`));

if (changedFunctionFiles.length === 0) {
	console.log('check-edge-functions: sin cambios en supabase/functions/ en este PR');
	console.log('');
	console.log('check-edge-functions — PASS');
	process.exit(0);
}

const AUTH_RELATED = /service_role|SUPABASE_SERVICE_ROLE_KEY|createClient|\bauth\./i;

for (const path of changedFunctionFiles) {
	const content = getFileNow(path) ?? readFileSync(path, 'utf8');
	const usesServiceRole = /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(content);
	if (!usesServiceRole) continue;

	const isNew = added.includes(path);
	const known = inventoryByPath.get(path);

	let mustGate = isNew || !known;
	if (!mustGate && known) {
		// Ya inventariada: solo re-abrir el gate si el diff toca líneas de autorización.
		const diff = getFileDiff(base, path);
		const changed = addedLines(diff);
		mustGate = changed.some((l) => AUTH_RELATED.test(l));
	}

	if (!mustGate) {
		lines.push(`ok    ${path}: ya inventariada (${known.function}), cambios en este PR no tocan líneas de autorización`);
		continue;
	}

	const fnName = known?.function ?? path.split('/')[2] ?? path;
	if (isOverridden('service-role', fnName)) {
		lines.push(`WARN  ${path}: usa service_role — override registrado (Security-Baseline-Override: service-role:${fnName})`);
	} else {
		failed = true;
		lines.push(
			`FAIL  GATE: ${path} usa SUPABASE_SERVICE_ROLE_KEY (${isNew ? 'función nueva' : known ? 'cambio en línea de autorización de función ya inventariada' : 'función no inventariada'}). ` +
				`Checklist obligatorio antes de mergear (seguridad/19 §4, G-SR): (1) justificación explícita de privilegios administrativos; (2) autenticación previa a cualquier operación privilegiada; ` +
				`(3) identidad derivada del JWT/sesión validado, nunca del body ni de una cabecera custom; (4) errores sanitizados; (5) revisión de CORS; (6) revisión de rate limiting; ` +
				`(7) tests mínimos; (8) el secreto nunca se loguea ni se devuelve en una respuesta. Si "${fnName}" no está en el manifest, añádela. Luego "Security-Baseline-Override: service-role:${fnName}".`
		);
	}
}

if (lines.length === 0) {
	lines.push('ok    ningún archivo modificado en supabase/functions/ usa service_role');
}

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-edge-functions — FAIL' : 'check-edge-functions — PASS');
process.exit(failed ? 1 : 0);
