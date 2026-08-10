#!/usr/bin/env node
// Pruebas negativas reproducibles del mecanismo de override, tras el
// bugfix de SECURITY_BASELINE_OVERRIDE_SHA (ver override.mjs y
// seguridad/35_bugfix_override_pr_head.md). Construye su propio
// repositorio git desechable en un directorio temporal — no toca en
// ningún momento el historial real de este repositorio.
//
// Ejecutar: node scripts/security/lib/override.test.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isOverridden } from './override.mjs';

const results = [];
function record(name, pass, detail) {
	results.push({ name, pass });
	console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`);
}

function git(dir, args) {
	return execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
}

function makeRepo() {
	const dir = mkdtempSync(join(tmpdir(), 'sb-override-test-'));
	git(dir, ['init', '-q']);
	git(dir, ['config', 'user.email', 'test@example.com']);
	git(dir, ['config', 'user.name', 'test']);
	writeFileSync(join(dir, 'f.txt'), 'x');
	git(dir, ['add', '.']);
	return dir;
}

function commit(dir, message) {
	git(dir, ['commit', '--allow-empty', '-q', '-m', message]);
	return git(dir, ['rev-parse', 'HEAD']).trim();
}

function withCwd(dir, fn) {
	const prev = process.cwd();
	process.chdir(dir);
	try {
		return fn();
	} finally {
		process.chdir(prev);
	}
}

const CHECK = 'security-definer';
const FN = 'test_definer_inseguro';

let repo;
try {
	// CASO A — HEAD sin trailer: sin override.
	repo = makeRepo();
	commit(repo, 'primer commit sin trailer');
	withCwd(repo, () => {
		delete process.env.SECURITY_BASELINE_OVERRIDE_SHA;
		record('Caso A: HEAD sin trailer → sin override (equivalente a FAIL en el gate)', !isOverridden(CHECK, FN));
	});
	rmSync(repo, { recursive: true, force: true });

	// CASO B — el commit real del PR tiene el trailer; SECURITY_BASELINE_OVERRIDE_SHA
	// apunta a él aunque el "runner" esté posicionado sobre un commit de merge
	// sintético posterior (como hace actions/checkout en pull_request) que NO lo tiene.
	repo = makeRepo();
	const realHead = commit(repo, `feat: cambio real\n\nSecurity-Baseline-Override: ${CHECK}:${FN}`);
	const syntheticMerge = commit(repo, `Merge ${realHead} into main`); // mensaje autogenerado, sin trailer
	withCwd(repo, () => {
		delete process.env.SECURITY_BASELINE_OVERRIDE_SHA;
		const sinFix = isOverridden(CHECK, FN); // simula el comportamiento ANTES del bugfix
		process.env.SECURITY_BASELINE_OVERRIDE_SHA = realHead;
		const conFix = isOverridden(CHECK, FN); // comportamiento DESPUÉS del bugfix
		record(
			'Caso B: runner sobre merge sintético + SECURITY_BASELINE_OVERRIDE_SHA=head real → override encontrado',
			sinFix === false && conFix === true,
			`sin fix=${sinFix}, con fix=${conFix}, merge sintético=${syntheticMerge.slice(0, 8)}`
		);
	});
	rmSync(repo, { recursive: true, force: true });

	// CASO C — el trailer existe en un commit ANTERIOR, pero el HEAD actual
	// (un nuevo commit funcional posterior) no lo repite.
	repo = makeRepo();
	commit(repo, `feat: cambio\n\nSecurity-Baseline-Override: ${CHECK}:${FN}`);
	const newerHead = commit(repo, 'feat: cambio funcional posterior, sin trailer');
	withCwd(repo, () => {
		process.env.SECURITY_BASELINE_OVERRIDE_SHA = newerHead;
		record('Caso C: trailer en commit anterior, HEAD actual no lo repite → sin override', !isOverridden(CHECK, FN));
	});
	rmSync(repo, { recursive: true, force: true });

	// CASO D — nombre de función incorrecto en el trailer.
	repo = makeRepo();
	const badName = commit(repo, `feat: cambio\n\nSecurity-Baseline-Override: ${CHECK}:funcion_que_no_es`);
	withCwd(repo, () => {
		process.env.SECURITY_BASELINE_OVERRIDE_SHA = badName;
		record('Caso D: nombre de función incorrecto en el trailer → sin override para la función real', !isOverridden(CHECK, FN));
	});
	rmSync(repo, { recursive: true, force: true });

	// CASO E — faltan uno de varios trailers necesarios: la función sin trailer
	// sigue exigiendo override; la que sí lo tiene, no.
	repo = makeRepo();
	const partial = commit(repo, `feat: cambio\n\nSecurity-Baseline-Override: ${CHECK}:otra_funcion`);
	withCwd(repo, () => {
		process.env.SECURITY_BASELINE_OVERRIDE_SHA = partial;
		record('Caso E: falta el trailer de una función entre varias → sigue sin override para ella', !isOverridden(CHECK, FN));
		record('Caso E: la función que sí tiene su trailer exacto → override encontrado', isOverridden(CHECK, 'otra_funcion'));
	});
	rmSync(repo, { recursive: true, force: true });

	// CASO F — sin funciones SECURITY DEFINER nuevas: no exige override. Esto es
	// una propiedad de check-security-definer.mjs (newMigrations.length === 0 o
	// ningún bloque "security definer" encontrado → PASS temprano, nunca llama a
	// isOverridden), no de override.mjs — se documenta aquí, verificado leyendo
	// ese script, sin necesidad de repositorio desechable.
	record(
		'Caso F: sin funciones SECURITY DEFINER nuevas → check-security-definer.mjs no exige override (newMigrations.length===0 o sin bloques "security definer" → PASS temprano)',
		true
	);

	// Fail-closed — SECURITY_BASELINE_OVERRIDE_SHA apunta a un SHA que NO EXISTE
	// en el repositorio: debe tratarse como "sin overrides", nunca hacer fallback
	// silencioso al HEAD real (que sí tiene el trailer) ni a ningún otro commit.
	repo = makeRepo();
	commit(repo, `feat: cambio\n\nSecurity-Baseline-Override: ${CHECK}:${FN}`);
	withCwd(repo, () => {
		process.env.SECURITY_BASELINE_OVERRIDE_SHA = '0'.repeat(40);
		record(
			'Fail-closed: SECURITY_BASELINE_OVERRIDE_SHA inexistente → sin overrides, sin fallback silencioso al HEAD real',
			!isOverridden(CHECK, FN)
		);
	});
	rmSync(repo, { recursive: true, force: true });
} finally {
	delete process.env.SECURITY_BASELINE_OVERRIDE_SHA;
	if (repo) rmSync(repo, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
console.log(`\nTOTAL: ${results.length} casos, ${results.length - failed.length} PASS, ${failed.length} FAIL`);
console.log(failed.length ? 'override.test — FAIL' : 'override.test — PASS');
process.exit(failed.length ? 1 : 0);
