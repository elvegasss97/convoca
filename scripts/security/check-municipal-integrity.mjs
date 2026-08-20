#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const migration = readFileSync(
	'supabase/migrations/0056_municipal_integrity_privacy_hardening.sql',
	'utf8'
);
const edge = readFileSync('supabase/functions/create-municipal-petition/index.ts', 'utf8');
const service = readFileSync('src/lib/services/municipalService.ts', 'utf8');
const createPage = readFileSync('src/routes/pulso/municipal/crear/+page.svelte', 'utf8');
const legalVersions = readFileSync('src/lib/legal/versions.ts', 'utf8');
const labels = readFileSync('src/lib/labels.ts', 'utf8');
const postflight = readFileSync('supabase/ops/0056_postflight.sql', 'utf8');

const supportFunction =
	migration.match(
		/create or replace function public\.set_municipal_petition_support\([\s\S]*?\n\$\$;/i
	)?.[0] ?? '';
const moderationFunction =
	migration.match(
		/create or replace function public\.review_municipal_petition_report\([\s\S]*?\n\$\$;/i
	)?.[0] ?? '';
const privilegedFunctionBlocks = [
	'create_municipal_petition_server',
	'guard_municipal_map_resolution_server',
	'set_municipal_petition_support',
	'report_municipal_petition',
	'review_municipal_petition_report'
].map((name) =>
	migration.match(
		new RegExp(
			`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
			'i'
		)
	)?.[0] ?? ''
);

const checks = [
	[
		'created_by se anonimiza al borrar cuenta',
		/municipal_petitions_created_by_fkey[\s\S]*?on delete set null/i.test(migration)
	],
	[
		'RPC pública antigua con coordenadas queda eliminada',
		/drop function public\.create_municipal_petition\(text, text, text, text, double precision, double precision, uuid\)/i.test(
			migration
		)
	],
	[
		'RPC interna obtiene el punto desde municipal_map_points',
		/select \* into v_point[\s\S]*?from public\.municipal_map_points/i.test(migration) &&
			!/create or replace function public\.create_municipal_petition_server\([\s\S]*?p_lat/i.test(
				migration.match(
					/create or replace function public\.create_municipal_petition_server\([\s\S]*?\)\nreturns uuid/i
				)?.[0] ?? ''
			)
	],
	[
		'issue vinculado debe pertenecer al mismo municipio',
		/municipality_ine_code = p_municipality_ine_code/i.test(migration)
	],
	[
		'problemas públicos también usan ubicación canónica',
		/create trigger municipal_issues_public_location_guard/i.test(migration) &&
			/select lat, lng into v_lat, v_lng[\s\S]*?from public\.municipal_map_points/i.test(
				migration
			) &&
			/new\.lat := v_lat/i.test(migration) &&
			/new\.lng := v_lng/i.test(migration)
	],
	[
		'apoyo exige versión exacta de consentimiento',
		/p_explicit_consent is not true[\s\S]*?p_consent_version[\s\S]*?<> '2026-08-20'/i.test(
			supportFunction
		)
	],
	[
		'firmar exige también versiones legales vigentes en servidor',
		/accepted_terms_version = '2026-08-20'/i.test(supportFunction) &&
			/accepted_privacy_version = '2026-08-20'/i.test(supportFunction) &&
			/accepted_peaceful_use_version = '2026-08-01'/i.test(supportFunction)
	],
	[
		'retirar apoyo no depende de que la petición siga abierta',
		/if p_supported then[\s\S]*?status = 'open'[\s\S]*?else[\s\S]*?delete from public\.municipal_petition_supports/i.test(
			supportFunction
		)
	],
	[
		'filas de apoyo activas no admiten consentimiento NULL',
		/alter column consent_version set not null[\s\S]*?alter column consented_at set not null/i.test(
			migration
		)
	],
	[
		'ocultar una recogida elimina relaciones de apoyo activas',
		/delete from public\.municipal_petition_supports[\s\S]*?where petition_id = v_petition_id/i.test(
			moderationFunction
		)
	],
	[
		'reportes municipales y moderación auditada existen',
		/create table public\.municipal_petition_reports/i.test(migration) &&
			/create or replace function public\.review_municipal_petition_report/i.test(migration) &&
			/municipal_petition_hidden/i.test(migration)
	],
	[
		'funciones privilegiadas priorizan pg_catalog en search_path',
		privilegedFunctionBlocks.every(
			(block) => block.length > 0 && /set search_path = pg_catalog, public/i.test(block)
		)
	],
	[
		'Edge Function usa credencial privilegiada nombrada y JWT validado',
		/SUPABASE_SECRET_KEYS/.test(edge) && /callerClient\.auth\.getUser\(\)/.test(edge)
	],
	[
		'rate-limit geográfico se ejecuta antes de consultar CartoCiudad en cache miss',
		/guard_municipal_map_resolution_server/.test(edge) &&
			edge.indexOf('guard_municipal_map_resolution_server') <
				edge.indexOf('resolveCartoCiudadPoint(municipality.name') &&
		/municipal_map_resolutions/.test(migration) &&
		/create or replace function public\.guard_municipal_map_resolution_server/i.test(migration)
	],
	[
		'body público de la Edge no define lat/lng',
		!(/interface CreatePetitionBody \{[\s\S]*?\n\}/.exec(edge)?.[0] ?? '').match(
			/\b(?:lat|lng|point)\??\s*:/
		)
	],
	[
		'servicio cliente tampoco acepta point/lat/lng al crear',
		!(/export interface CreateMunicipalPetitionInput \{[\s\S]*?\n\}/.exec(service)?.[0] ?? '').match(
			/\b(?:lat|lng|point)\??\s*:/
		)
	],
	[
		'formulario municipal ya no usa Nominatim desde el navegador',
		!/nominatim|resolveMunicipalityPoint/i.test(createPage)
	],
	[
		'audit trail municipal tiene etiquetas visibles',
		/municipal_petition_report_dismissed/.test(labels) &&
			/municipal_petition_hidden/.test(labels) &&
			/municipal_petition:\s*'Recogida municipal'/.test(labels)
	],
	[
		'postflight cubre trigger territorial y privacidad de reportes',
		/municipal_issues_public_location_guard/.test(postflight) &&
		/municipal_petition_reports[^\n]*reporter_id/.test(postflight) &&
		/reviewed_by/.test(postflight)
	],
	[
		'versiones legales del módulo coinciden con el gate SQL',
		/terms:\s*'2026-08-20'/.test(legalVersions) &&
		/privacy:\s*'2026-08-20'/.test(legalVersions) &&
		/peacefulUse:\s*'2026-08-01'/.test(legalVersions) &&
		/accepted_terms_version = '2026-08-20'/.test(migration) &&
		/accepted_privacy_version = '2026-08-20'/.test(migration) &&
		/accepted_peaceful_use_version = '2026-08-01'/.test(migration)
	]
];

let failed = false;
for (const [label, passed] of checks) {
	console.log(`${passed ? 'ok  ' : 'FAIL'}  ${label}`);
	if (!passed) failed = true;
}
console.log('');
console.log(failed ? 'check-municipal-integrity — FAIL' : 'check-municipal-integrity — PASS');
process.exit(failed ? 1 : 0);
