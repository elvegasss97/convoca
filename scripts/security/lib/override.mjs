// Mecanismo único de override para todos los GATE de la baseline (ver
// seguridad/30_..._implementacion.md, "Cómo registrar una excepción").
//
// Un GATE nunca se salta en silencio. La única vía es una línea trailer
// EXACTA en el mensaje del commit HEAD, de la forma:
//
//   Security-Baseline-Override: <check-id>:<detalle-exacto>
//
// Ejemplos:
//   Security-Baseline-Override: historical-migration:0041
//   Security-Baseline-Override: security-definer:set_new_thing
//   Security-Baseline-Override: using-true:new_policy_name
//   Security-Baseline-Override: session-architecture:accepted
//   Security-Baseline-Override: service-role:new-function-name
//   Security-Baseline-Override: storage:new-bucket-name
//
// Cada override queda permanentemente en el historial de git, atado a un
// commit y autor concretos — no es un archivo de configuración que crezca
// sin revisión. Un GATE con override sigue imprimiendo su hallazgo (no lo
// oculta), pero no hace fallar el check.

import { execFileSync } from 'node:child_process';

function getHeadCommitMessage() {
	try {
		return execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' });
	} catch {
		return '';
	}
}

/**
 * @param {string} checkId
 * @returns {Set<string>} detalles exactos autorizados para ese check-id en el commit HEAD
 */
export function getOverrides(checkId) {
	const message = getHeadCommitMessage();
	const prefix = 'Security-Baseline-Override:';
	const details = new Set();
	for (const line of message.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed.startsWith(prefix)) continue;
		const rest = trimmed.slice(prefix.length).trim();
		const sep = rest.indexOf(':');
		if (sep === -1) continue;
		const id = rest.slice(0, sep).trim();
		const detail = rest.slice(sep + 1).trim();
		if (id === checkId && detail) details.add(detail);
	}
	return details;
}

export function isOverridden(checkId, detail) {
	return getOverrides(checkId).has(detail);
}
