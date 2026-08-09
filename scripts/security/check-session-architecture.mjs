#!/usr/bin/env node
// G-SSR — cambio de arquitectura de sesión — seguridad/19 §4/§2.
// Detección: TRIPWIRE. Enforcement: GATE.
//
// El estado hoy: sin src/hooks.server.*, sin @supabase/ssr, toda la
// autenticación es JWT de cliente. Esto NO prohíbe que eso cambie —
// significa que el PR es, por definición, un cambio de modelo de
// amenazas y no puede mergearse sin revisión explícita de qué asumía la
// baseline y cómo cambia (ver seguridad/19 §2, SvelteKit/Vercel).

import { readFileSync } from 'node:fs';
import { getChangedFiles, getFileDiff, addedLines, getFileNow } from './lib/diff.mjs';
import { isOverridden } from './lib/override.mjs';

let failed = false;
const lines = [];
const triggers = [];

const { base, added, modified } = getChangedFiles();
if (base === null) {
	console.log('check-session-architecture — PASS (sin base de comparación)');
	process.exit(0);
}

const allChanged = [...added, ...modified];

for (const path of allChanged) {
	if (/^src\/hooks\.server\.(ts|js)$/.test(path)) {
		triggers.push(`archivo "${path}" (hooks de servidor) ${added.includes(path) ? 'creado' : 'modificado'}`);
	}
}

for (const path of allChanged) {
	if (!/^src\/routes\/.*\+page\.server\.(ts|js)$/.test(path)) continue;
	const content = getFileNow(path) ?? readFileSync(path, 'utf8');
	if (/@supabase\/ssr/.test(content) || /\bcookies\.(set|get|delete)\s*\(/.test(content)) {
		triggers.push(`"${path}" ${added.includes(path) ? 'nuevo' : 'modificado'}, usa @supabase/ssr o gestiona cookies de sesión`);
	}
}

for (const path of ['package.json', 'pnpm-lock.yaml']) {
	if (!allChanged.includes(path)) continue;
	const diff = getFileDiff(base, path);
	const lines_ = addedLines(diff);
	if (lines_.some((l) => l.includes('@supabase/ssr'))) {
		triggers.push(`"@supabase/ssr" aparece añadido en ${path}`);
	}
}

if (triggers.length === 0) {
	lines.push('ok    sin hooks.server.*, sin +page.server.ts con @supabase/ssr/cookies, sin @supabase/ssr en package.json/lockfile');
} else {
	for (const t of triggers) {
		if (isOverridden('session-architecture', 'accepted')) {
			lines.push(`WARN  ${t} — override registrado en este commit (revisión de arquitectura de sesión ya realizada)`);
		} else {
			failed = true;
			lines.push(`FAIL  GATE: ${t}. Esto es un cambio de arquitectura de sesión, no está prohibido pero exige revisión explícita del modelo de amenazas antes de mergear (ver seguridad/19_..._diseno.md §2). Añade "Security-Baseline-Override: session-architecture:accepted" al commit tras completarla.`);
		}
	}
}

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-session-architecture — FAIL' : 'check-session-architecture — PASS');
process.exit(failed ? 1 : 0);
