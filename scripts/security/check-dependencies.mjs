#!/usr/bin/env node
// §11 — doble auditoría de dependencias (seguridad/19_..._diseno.md §10).
//
// pnpm audit --prod: GARANTÍA VERIFICADA + GATE. Cualquier HIGH/CRITICAL
//   nuevo bloquea, salvo excepción registrada en
//   security-baseline/manifests/dependency-exceptions.json con scope
//   "prod" o "both" y reviewBy no vencido.
// pnpm audit (completo): TRIPWIRE + GATE. HIGH/CRITICAL que solo aparece
//   aquí requiere excepción registrada (scope "full-only" o "both") con
//   clasificación de alcanzabilidad — nunca se silencia globalmente.
//
// No hace auto-fix. No actualiza dependencias.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXCEPTIONS_PATH = 'security-baseline/manifests/dependency-exceptions.json';
const exceptions = JSON.parse(readFileSync(EXCEPTIONS_PATH, 'utf8')).exceptions;

function runAudit(args) {
	try {
		const out = execSync(`pnpm audit ${args} --json`, { encoding: 'utf8' });
		return JSON.parse(out);
	} catch (e) {
		// pnpm audit sale con exit != 0 cuando encuentra vulnerabilidades; el JSON sigue en stdout.
		try {
			return JSON.parse(e.stdout);
		} catch {
			console.error('No se pudo parsear la salida de pnpm audit:', e.message);
			process.exit(1);
		}
	}
}

function findException(pkg, severity) {
	const today = new Date().toISOString().slice(0, 10);
	return exceptions.find((ex) => {
		if (ex.package !== pkg) return false;
		if (ex.reviewBy < today) return false; // vencida: no cuenta, aunque exista
		return true;
	});
}

function isVencida(pkg) {
	const today = new Date().toISOString().slice(0, 10);
	return exceptions.some((ex) => ex.package === pkg && ex.reviewBy < today);
}

let failed = false;
const lines = [];

function evaluate(label, data, allowedScopes) {
	const advisories = Object.values(data.advisories ?? {});
	const highOrCritical = advisories.filter((a) => a.severity === 'high' || a.severity === 'critical');
	if (highOrCritical.length === 0) {
		lines.push(`ok    ${label}: sin advisories HIGH/CRITICAL`);
		return;
	}
	for (const adv of highOrCritical) {
		const pkg = adv.module_name;
		if (isVencida(pkg)) {
			failed = true;
			lines.push(`FAIL  ${label}: excepción de "${pkg}" venció (reviewBy superado) — requiere reclasificación en ${EXCEPTIONS_PATH}`);
			continue;
		}
		const ex = findException(pkg, adv.severity);
		if (ex && allowedScopes.includes(ex.scope)) {
			lines.push(`WARN  ${label}: ${pkg} (${adv.severity}) — cubierto por excepción registrada [${ex.classification}], revisar antes de ${ex.reviewBy}`);
		} else {
			failed = true;
			lines.push(
				`FAIL  ${label}: ${pkg} (${adv.severity}) — "${adv.title}" — sin excepción registrada con scope válido en ${EXCEPTIONS_PATH}. Requiere clasificar alcanzabilidad antes de continuar.`
			);
		}
	}
}

const prod = runAudit('--prod');
evaluate('pnpm audit --prod', prod, ['prod', 'both']);

const full = runAudit('');
evaluate('pnpm audit (completo)', full, ['full-only', 'both', 'prod']);

console.log(lines.join('\n'));
console.log('');
console.log(failed ? 'check-dependencies — FAIL' : 'check-dependencies — PASS');
process.exit(failed ? 1 : 0);
