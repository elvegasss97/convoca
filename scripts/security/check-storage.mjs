#!/usr/bin/env node
// G-STORAGE — bucket de Storage nuevo/modificado — seguridad/19 §4.
// Detección: TRIPWIRE. Enforcement: GATE.
//
// LIMITACIÓN P0 declarada explícitamente (no oculta): este check solo lee
// lo que hay versionado en supabase/migrations/. No se conecta a
// producción/staging para confirmar que el estado real de Storage
// coincide con lo versionado — eso es P-D5 (periódico), fuera de P0.
//
// La ausencia de una policy no se asume insegura por defecto (RLS
// habilitado sin ninguna policy es un patrón deny-all ya usado
// deliberadamente en este repo para otras tablas) — este check no
// penaliza eso, solo exige revisión humana cuando aparece algo nuevo.

import { readFileSync } from 'node:fs';
import { getChangedFiles, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

const MIGRATIONS_DIR = 'supabase/migrations';
const manifest = JSON.parse(readFileSync('security-baseline/manifests/storage-buckets.json', 'utf8')).buckets;
const knownBucketIds = new Set(manifest.map((b) => b.bucket));

let failed = false;
const lines = [];

const { base, added } = getChangedFiles();
if (base === null) {
	console.log('check-storage — PASS (sin base de comparación)');
	process.exit(0);
}

const newMigrations = added.filter((p) => p.startsWith(`${MIGRATIONS_DIR}/`) && p.endsWith('.sql'));
if (newMigrations.length === 0) {
	console.log('check-storage: sin migraciones nuevas en este PR');
	console.log('');
	console.log('check-storage — PASS');
	process.exit(0);
}

for (const path of newMigrations) {
	const content = getFileNow(path) ?? readFileSync(path, 'utf8');

	for (const m of content.matchAll(/insert\s+into\s+storage\.buckets[\s\S]*?values\s*\(\s*'([^']+)'/gi)) {
		const bucketId = m[1];
		if (knownBucketIds.has(bucketId)) {
			lines.push(`ok    ${path}: bucket "${bucketId}" ya inventariado — re-declaración (probable idempotencia)`);
			continue;
		}
		if (isOverridden('storage', bucketId)) {
			lines.push(`WARN  ${path}: bucket nuevo "${bucketId}" — override registrado`);
		} else {
			failed = true;
			lines.push(
				`FAIL  GATE: ${path} crea el bucket "${bucketId}", no inventariado en security-baseline/manifests/storage-buckets.json. ` +
					`Revisar: flag public (justificar si true), file_size_limit definido, allowed_mime_types definido, políticas para cada operación relevante o justificación explícita de por qué falta alguna, convención de ruta por uid. ` +
					`Añade la entrada al manifest y "Security-Baseline-Override: storage:${bucketId}".`
			);
		}
	}

	if (/update\s+storage\.buckets[\s\S]{0,200}set[\s\S]{0,200}public\s*=/i.test(content)) {
		if (isOverridden('storage', 'bucket-visibility-change')) {
			lines.push(`WARN  ${path}: cambio de visibilidad (public) de un bucket — override registrado`);
		} else {
			failed = true;
			lines.push(`FAIL  GATE: ${path} cambia el flag "public" de un bucket existente. Requiere justificación explícita, luego "Security-Baseline-Override: storage:bucket-visibility-change".`);
		}
	}

	for (const m of content.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+storage\.objects/gi)) {
		const policyName = m[1];
		if (isOverridden('storage', policyName)) {
			lines.push(`WARN  ${path}: nueva policy "${policyName}" sobre storage.objects — override registrado`);
		} else {
			failed = true;
			lines.push(
				`FAIL  GATE: ${path} añade la policy "${policyName}" sobre storage.objects. Revisar convención de ruta/propiedad (prefijo por uid como ya hace verification-documents) antes de aprobar. Luego "Security-Baseline-Override: storage:${policyName}".`
			);
		}
	}
}

if (lines.length === 0) {
	lines.push('ok    sin buckets/policies de Storage nuevos en las migraciones añadidas');
}

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-storage — FAIL' : 'check-storage — PASS');
process.exit(failed ? 1 : 0);
