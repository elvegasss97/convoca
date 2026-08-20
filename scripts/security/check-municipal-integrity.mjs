#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const migration = readFileSync(
	'supabase/migrations/0056_municipal_integrity_privacy_hardening.sql',
	'utf8'
);
const ingestionMigration = readFileSync(
	'supabase/migrations/0058_municipal_detected_location_nullable.sql',
	'utf8'
);
const reviewMigration = readFileSync(
	'supabase/migrations/0059_municipal_issue_review_workflow.sql',
	'utf8'
);
const edge = readFileSync('supabase/functions/create-municipal-petition/index.ts', 'utf8');
const reviewEdge = readFileSync('supabase/functions/review-municipal-issue/index.ts', 'utf8');
const service = readFileSync('src/lib/services/municipalService.ts', 'utf8');
const radarService = readFileSync('src/lib/services/municipalRadarModerationService.ts', 'utf8');
const createPage = readFileSync('src/routes/pulso/municipal/crear/+page.svelte', 'utf8');
const legalVersions = readFileSync('src/lib/legal/versions.ts', 'utf8');
const labels = readFileSync('src/lib/labels.ts', 'utf8');
const postflight = readFileSync('supabase/ops/0056_postflight.sql', 'utf8');

const supportFunction =
	migration.match(/create or replace function public\.set_municipal_petition_support\([\s\S]*?\n\$\$;/i)?.[0] ?? '';
const moderationFunction =
	migration.match(/create or replace function public\.review_municipal_petition_report\([\s\S]*?\n\$\$;/i)?.[0] ?? '';
const reviewIssueFunction =
	reviewMigration.match(/create or replace function public\.review_municipal_issue\([\s\S]*?\n\$\$;/i)?.[0] ?? '';
const staffMapGuardFunction =
	reviewMigration.match(/create or replace function public\.guard_municipal_staff_map_resolution_server\([\s\S]*?\n\$\$;/i)?.[0] ?? '';

const privilegedFunctionBlocks = [
	...['create_municipal_petition_server','guard_municipal_map_resolution_server','set_municipal_petition_support','report_municipal_petition','review_municipal_petition_report'].map((name) =>
		migration.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`, 'i'))?.[0] ?? ''
	),
	reviewIssueFunction,
	staffMapGuardFunction
];

const checks = [
	['created_by se anonimiza al borrar cuenta', /municipal_petitions_created_by_fkey[\s\S]*?on delete set null/i.test(migration)],
	['RPC pública antigua con coordenadas queda eliminada', /drop function public\.create_municipal_petition\(text, text, text, text, double precision, double precision, uuid\)/i.test(migration)],
	['RPC interna obtiene el punto desde municipal_map_points', /select \* into v_point[\s\S]*?from public\.municipal_map_points/i.test(migration)],
	['issue vinculado debe pertenecer al mismo municipio', /municipality_ine_code = p_municipality_ine_code/i.test(migration)],
	['problemas públicos también usan ubicación canónica', /create trigger municipal_issues_public_location_guard/i.test(migration) && /new\.lat := v_lat/i.test(migration) && /new\.lng := v_lng/i.test(migration)],
	['hallazgos detected pueden esperar geocodificación sin coordenadas inventadas', /alter column lat drop not null/i.test(ingestionMigration) && /alter column lng drop not null/i.test(ingestionMigration)],
	['detected/dismissed siguen privados y estados públicos exigen ubicación', /status in \('detected', 'dismissed'\)[\s\S]*?municipality_ine_code is not null[\s\S]*?lat is not null[\s\S]*?lng is not null/i.test(reviewMigration)],
	['revisión de Radar solo admite publish/dismiss y exige MFA vía puerta staff', /p_action not in \('publish', 'dismiss'\)/i.test(reviewIssueFunction) && /is_moderator_or_admin\(\)/i.test(reviewIssueFunction)],
	['publicar Radar exige fuente y punto municipal canónico', /municipal_issue_sources/i.test(reviewIssueFunction) && /municipal_map_points/i.test(reviewIssueFunction) && /status = 'verified'/i.test(reviewIssueFunction)],
	['descartar Radar conserva el hallazgo como estado interno', /status = 'dismissed'/i.test(reviewIssueFunction) && /municipal_issue_dismissed/i.test(reviewIssueFunction)],
	['decisiones de Radar quedan en audit_trail', /municipal_issue_verified/i.test(reviewMigration) && /municipal_issue_dismissed/i.test(reviewMigration) && /target_type[\s\S]*municipal_issue/i.test(reviewMigration)],
	['apoyo exige versión exacta de consentimiento', /p_explicit_consent is not true[\s\S]*?p_consent_version[\s\S]*?<> '2026-08-20'/i.test(supportFunction)],
	['firmar exige versiones legales vigentes en servidor', /accepted_terms_version = '2026-08-20'/i.test(supportFunction) && /accepted_privacy_version = '2026-08-20'/i.test(supportFunction) && /accepted_peaceful_use_version = '2026-08-01'/i.test(supportFunction)],
	['retirar apoyo no depende de que la petición siga abierta', /if p_supported then[\s\S]*?status = 'open'[\s\S]*?else[\s\S]*?delete from public\.municipal_petition_supports/i.test(supportFunction)],
	['filas de apoyo activas no admiten consentimiento NULL', /alter column consent_version set not null[\s\S]*?alter column consented_at set not null/i.test(migration)],
	['ocultar una recogida elimina relaciones de apoyo activas', /delete from public\.municipal_petition_supports[\s\S]*?where petition_id = v_petition_id/i.test(moderationFunction)],
	['reportes municipales y moderación auditada existen', /create table public\.municipal_petition_reports/i.test(migration) && /create or replace function public\.review_municipal_petition_report/i.test(migration)],
	['funciones privilegiadas priorizan pg_catalog en search_path', privilegedFunctionBlocks.every((block) => block.length > 0 && /set search_path = pg_catalog, public/i.test(block))],
	['Edge de petición usa Secret nombrada y JWT validado', /SUPABASE_SECRET_KEYS/.test(edge) && /callerClient\.auth\.getUser\(\)/.test(edge)],
	['rate-limit ciudadano ocurre antes de CartoCiudad en cache miss', /guard_municipal_map_resolution_server/.test(edge) && edge.indexOf('guard_municipal_map_resolution_server') < edge.indexOf('resolveCartoCiudadPoint(municipality.name')],
	['Edge de revisión valida JWT + staff MFA antes de resolver Secret', /callerClient\.auth\.getUser\(\)/.test(reviewEdge) && /callerClient\.rpc\('is_moderator_or_admin'\)/.test(reviewEdge) && reviewEdge.indexOf("rpc('is_moderator_or_admin')") < reviewEdge.indexOf('resolvePrivilegedSecret()')],
	['Edge de revisión exige fuente antes de privilegio/geocoder', /municipal_issue_sources/.test(reviewEdge) && reviewEdge.indexOf("from('municipal_issue_sources')") < reviewEdge.indexOf('resolvePrivilegedSecret()')],
	['rate-limit staff ocurre antes de CartoCiudad en cache miss', /guard_municipal_staff_map_resolution_server/.test(reviewEdge) && reviewEdge.indexOf('guard_municipal_staff_map_resolution_server') < reviewEdge.indexOf('resolveCartoCiudadPoint(municipality.name') && /municipal_staff_map_resolutions/.test(reviewMigration)],
	['decisión final de Radar vuelve a usar JWT del caller', /callerClient\.rpc\('review_municipal_issue'/.test(reviewEdge) && !/adminClient\.rpc\('review_municipal_issue'/.test(reviewEdge)],
	['body público de creación no define lat/lng', !(/interface CreatePetitionBody \{[\s\S]*?\n\}/.exec(edge)?.[0] ?? '').match(/\b(?:lat|lng|point)\??\s*:/)],
	['servicio cliente tampoco acepta point/lat/lng al crear', !(/export interface CreateMunicipalPetitionInput \{[\s\S]*?\n\}/.exec(service)?.[0] ?? '').match(/\b(?:lat|lng|point)\??\s*:/)],
	['formulario municipal ya no usa Nominatim desde navegador', !/nominatim|resolveMunicipalityPoint/i.test(createPage)],
	['servicio de Radar solo revisa mediante Edge Function', /functions\.invoke\('review-municipal-issue'/.test(radarService) && !/\.update\(\{\s*status:\s*'verified'/i.test(radarService)],
	['audit trail municipal previo mantiene etiquetas visibles', /municipal_petition_report_dismissed/.test(labels) && /municipal_petition_hidden/.test(labels) && /municipal_petition:\s*'Recogida municipal'/.test(labels)],
	['postflight 0056 cubre trigger territorial y privacidad de reportes', /municipal_issues_public_location_guard/.test(postflight) && /municipal_petition_reports[^\n]*reporter_id/.test(postflight) && /reviewed_by/.test(postflight)],
	['versiones legales del módulo coinciden con gate SQL', /terms:\s*'2026-08-20'/.test(legalVersions) && /privacy:\s*'2026-08-20'/.test(legalVersions) && /peacefulUse:\s*'2026-08-01'/.test(legalVersions)]
];

let failed = false;
for (const [label, passed] of checks) {
	console.log(`${passed ? 'ok  ' : 'FAIL'}  ${label}`);
	if (!passed) failed = true;
}
console.log('');
console.log(failed ? 'check-municipal-integrity — FAIL' : 'check-municipal-integrity — PASS');
process.exit(failed ? 1 : 0);
