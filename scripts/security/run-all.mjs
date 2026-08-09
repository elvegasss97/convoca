#!/usr/bin/env node
// Entrada única de la Security Baseline P0, ejecutable en local:
//
//   pnpm security:baseline
//
// Ejecuta los mismos checks que .github/workflows/security-baseline.yml,
// en el mismo orden, contra el mismo tipo de réplica desechable (nunca
// contra producción/staging). Termina con:
//
//   SECURITY BASELINE P0 — PASS
// o
//   SECURITY BASELINE P0 — FAIL   (con el check concreto que falló)
//
// Flags:
//   --skip-build       omite pnpm install/build (checks rápidos primero)
//   --skip-docker       omite los checks que necesitan Docker (cleanroom, RLS, secretos)

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const skipDocker = args.includes('--skip-docker');

const steps = [];

steps.push({ id: 'migrations-structure', cmd: 'node', args: ['scripts/security/check-migrations-structure.mjs'] });

if (!skipDocker) {
	steps.push({ id: 'cleanroom', cmd: 'node', args: ['scripts/security/check-cleanroom.mjs'] });
	steps.push({ id: 'rls-cleanroom', cmd: 'node', args: ['scripts/security/check-rls-cleanroom.mjs'] });
}

steps.push({ id: 'security-definer', cmd: 'node', args: ['scripts/security/check-security-definer.mjs'] });
steps.push({ id: 'using-true', cmd: 'node', args: ['scripts/security/check-using-true.mjs'] });
steps.push({ id: 'session-architecture', cmd: 'node', args: ['scripts/security/check-session-architecture.mjs'] });
steps.push({ id: 'edge-functions', cmd: 'node', args: ['scripts/security/check-edge-functions.mjs'] });
steps.push({ id: 'storage', cmd: 'node', args: ['scripts/security/check-storage.mjs'] });

if (!skipBuild) {
	steps.push({ id: 'install', cmd: 'pnpm', args: ['install', '--frozen-lockfile'] });
	steps.push({
		id: 'build',
		cmd: 'pnpm',
		args: ['build'],
		env: {
			PUBLIC_SUPABASE_URL: 'https://tu-proyecto-ficticio.supabase.co',
			PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_valor_ficticio_de_ejemplo',
			PUBLIC_APP_ENV: 'test',
			PUBLIC_AUTH_GOOGLE_ENABLED: 'false',
			PUBLIC_AUTH_PASSWORD_ENABLED: 'true',
			PUBLIC_ENABLE_DEMO_DATA: 'false',
			PUBLIC_ENABLE_DEV_TOOLS: 'false'
		}
	});
}

steps.push({ id: 'dependencies', cmd: 'node', args: ['scripts/security/check-dependencies.mjs'] });

if (!skipDocker) {
	steps.push({
		id: 'secrets',
		cmd: 'docker',
		args: ['run', '--rm', '-v', `${process.cwd()}:/repo`, '-w', '/repo', 'zricethezav/gitleaks:latest', 'detect', '--source', '.', '--config', '.gitleaks.toml', '--redact', '--no-banner']
	});
}

const results = [];
for (const step of steps) {
	console.log(`\n=== ${step.id} ===`);
	const res = spawnSync(step.cmd, step.args, { stdio: 'inherit', env: { ...process.env, ...(step.env ?? {}) } });
	const passed = res.status === 0;
	results.push({ id: step.id, passed });
	if (!passed) {
		console.log(`\nSECURITY BASELINE P0 — FAIL (check: ${step.id})`);
		process.exit(1);
	}
}

console.log('\n' + results.map((r) => `  ok  ${r.id}`).join('\n'));
console.log('\nSECURITY BASELINE P0 — PASS');
process.exit(0);
