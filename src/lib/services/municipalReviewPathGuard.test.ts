import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync('supabase/migrations/0054_municipal_radar_and_petitions.sql', 'utf8');
const hardening = readFileSync(
	'supabase/migrations/0060_municipal_issue_review_path_guard.sql',
	'utf8'
);

const guardFunction =
	hardening.match(
		/create or replace function public\.enforce_municipal_issue_review_path\(\)[\s\S]*?\n\$\$;/i
	)?.[0] ?? '';
const reviewFunction =
	hardening.match(
		/create or replace function public\.review_municipal_issue\([\s\S]*?\n\$\$;/i
	)?.[0] ?? '';

describe('Radar municipal — camino único de revisión', () => {
	it('las fuentes almacenadas solo admiten HTTPS', () => {
		expect(base).toMatch(/municipal_issue_sources[\s\S]*?url text not null check \(url ~ '\^https:\/\/'\)/i);
	});

	it('ningún INSERT puede crear directamente un hallazgo público', () => {
		expect(guardFunction).toMatch(/if tg_op = 'INSERT'[\s\S]*?new\.status <> 'detected'/i);
	});

	it('detected solo puede salir por publish o dismiss con contexto exacto', () => {
		expect(guardFunction).toMatch(/old\.status = 'detected' and new\.status = 'verified'/i);
		expect(guardFunction).toMatch(/old\.status = 'detected' and new\.status = 'dismissed'/i);
		expect(guardFunction).toMatch(/municipal_issue_review_context/i);
		expect(guardFunction).toMatch(/new\.id::text \|\| ':publish'/i);
		expect(guardFunction).toMatch(/new\.id::text \|\| ':dismiss'/i);
		expect(guardFunction).toMatch(/is_moderator_or_admin\(\)/i);
	});

	it('la RPC establece contexto transaccional actor + issue + acción antes del UPDATE', () => {
		const contextPosition = reviewFunction.indexOf("'convoca.municipal_issue_review_context'");
		const updatePosition = reviewFunction.indexOf('update public.municipal_issues');
		expect(contextPosition).toBeGreaterThanOrEqual(0);
		expect(updatePosition).toBeGreaterThan(contextPosition);
		expect(reviewFunction).toMatch(/v_actor_id::text \|\| ':' \|\| p_issue_id::text \|\| ':' \|\| p_action/i);
		expect(reviewFunction).toMatch(/set_config\([\s\S]*?true\s*\)/i);
	});

	it('la RPC mantiene fuente, punto canónico y audit trail como requisitos', () => {
		expect(reviewFunction).toMatch(/municipal_issue_sources/i);
		expect(reviewFunction).toMatch(/municipal_map_points/i);
		expect(reviewFunction).toMatch(/municipal_issue_verified/i);
		expect(reviewFunction).toMatch(/municipal_issue_dismissed/i);
	});

	it('un dismissed no puede reactivarse mediante UPDATE directo', () => {
		expect(guardFunction).toMatch(/if old\.status = 'dismissed'[\s\S]*?raise exception/i);
	});
});
