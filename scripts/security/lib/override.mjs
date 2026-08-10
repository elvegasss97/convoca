// Mecanismo único de override para todos los GATE de la baseline (ver
// seguridad/30_..._implementacion.md, "Cómo registrar una excepción").
//
// Un GATE nunca se salta en silencio. La única vía es una línea trailer
// EXACTA en el mensaje del "commit de atestación" (ver más abajo qué
// commit es ese en cada evento), de la forma:
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
//
// BUG histórico corregido aquí: en eventos `pull_request`,
// `actions/checkout` resuelve por defecto el commit de MERGE SINTÉTICO
// que GitHub genera (`refs/pull/<N>/merge`, mensaje autogenerado tipo
// "Merge <head> into <base>"), no la punta real de la rama del PR. Un
// `git log -1 --format=%B` sin más lee ESE mensaje sintético, que nunca
// contiene los trailers que alguien escribió en su propio commit — el
// override queda estructuralmente inalcanzable desde cualquier PR,
// aunque el commit real sí tenga el trailer exacto (confirmado
// empíricamente: ver seguridad/35_bugfix_override_pr_head.md).
//
// Corrección: el workflow fija `SECURITY_BASELINE_OVERRIDE_SHA` al SHA
// real de la punta del PR (`github.event.pull_request.head.sha`) solo en
// eventos `pull_request` — nunca un ref/PR concreto hardcodeado, es la
// misma expresión para cualquier PR presente o futuro. Si esa variable
// está presente, se lee el mensaje de ESE commit exacto. Si no se puede
// resolver (objeto no encontrado, checkout insuficiente, etc.), se falla
// cerrado: se trata como si no hubiera overrides — NUNCA se hace
// fallback silencioso al mensaje del HEAD sintético ni de ningún otro
// commit. En push/schedule/ejecución local (sin PR de por medio) la
// variable se deja vacía a propósito: el commit checkouteado ya es el
// real, `git log -1` sin argumento sigue siendo correcto ahí.

import { execFileSync } from 'node:child_process';

function getHeadCommitMessage() {
	const explicitSha = (process.env.SECURITY_BASELINE_OVERRIDE_SHA ?? '').trim();
	if (explicitSha) {
		try {
			return execFileSync('git', ['log', '-1', '--format=%B', explicitSha], { encoding: 'utf8' });
		} catch {
			console.error(
				`[security-baseline] No se pudo resolver SECURITY_BASELINE_OVERRIDE_SHA="${explicitSha}" como commit — se trata como "sin overrides" (fail-closed). No se usa ningún otro commit como sustituto.`
			);
			return '';
		}
	}
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
