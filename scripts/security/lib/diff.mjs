// Helper compartido: qué cambió respecto a una base, para los checks
// diff-based de la Security Baseline P0 (ver seguridad/30_...md).
//
// Resolución de la base de comparación, en orden:
//   1. BASE_REF explícito en el entorno (lo fija el workflow: para
//      pull_request, origin/<base>; para push, el SHA anterior).
//   2. origin/main, si existe y es distinto de HEAD.
//   3. HEAD~1, como último recurso (ejecución local sobre main tras un
//      merge, o repo con un solo commit de diferencia).
//
// Ningún check de este directorio debe intentar resolver esto por su
// cuenta — todos usan este módulo para que la noción de "qué es nuevo en
// este PR" sea consistente entre checks.

import { execFileSync } from 'node:child_process';

function run(args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function refExists(ref) {
	try {
		run(['rev-parse', '--verify', '--quiet', ref]);
		return true;
	} catch {
		return false;
	}
}

export function resolveBaseRef() {
	const explicit = process.env.BASE_REF;
	if (explicit && explicit.trim() && !/^0+$/.test(explicit.trim())) {
		if (refExists(explicit)) return explicit;
		console.warn(`[security-baseline] BASE_REF="${explicit}" no resuelve a un commit válido, usando fallback.`);
	}
	// HEAD == origin/main es un caso válido (sin commits nuevos todavía en
	// esta rama) — el diff resultante debe ser vacío, no un motivo para
	// seguir buscando una base distinta más atrás en el historial.
	if (refExists('origin/main')) return 'origin/main';
	if (refExists('HEAD~1')) return 'HEAD~1';
	// Repo de un solo commit: no hay base — todo se trata como "nuevo".
	return null;
}

/**
 * @returns {{ base: string|null, added: string[], modified: string[], deleted: string[], all: string[] }}
 */
export function getChangedFiles() {
	const base = resolveBaseRef();
	if (base === null) {
		const all = run(['ls-files']).split('\n').filter(Boolean);
		return { base: null, added: all, modified: [], deleted: [], all };
	}
	const raw = run(['diff', '--name-status', '--no-renames', `${base}...HEAD`]);
	const added = [];
	const modified = [];
	const deleted = [];
	for (const line of raw.split('\n')) {
		if (!line.trim()) continue;
		const [status, ...pathParts] = line.split('\t');
		const path = pathParts.join('\t');
		if (status === 'A') added.push(path);
		else if (status === 'D') deleted.push(path);
		else modified.push(path); // M, R (no-renames desactivado, pero por si acaso), etc.
	}
	return { base, added, modified, deleted, all: [...added, ...modified] };
}

/** Contenido de un archivo tal como estaba en la base (o null si no existía). */
export function getFileAtBase(base, path) {
	if (base === null) return null;
	try {
		return execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
	} catch {
		return null;
	}
}

/** Contenido actual (working tree / HEAD checked out) de un archivo. */
export function getFileNow(path) {
	try {
		return execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
	} catch {
		return null;
	}
}

/** Diff unificado de un solo archivo entre base y HEAD (para grep de líneas añadidas). */
export function getFileDiff(base, path) {
	if (base === null) return null;
	try {
		return execFileSync('git', ['diff', '--no-color', `${base}...HEAD`, '--', path], { encoding: 'utf8' });
	} catch {
		return null;
	}
}

/** Líneas realmente añadidas (prefijo '+', sin contar la cabecera '+++') de un diff unificado. */
export function addedLines(unifiedDiff) {
	if (!unifiedDiff) return [];
	return unifiedDiff
		.split('\n')
		.filter((l) => l.startsWith('+') && !l.startsWith('+++'))
		.map((l) => l.slice(1));
}
