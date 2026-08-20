import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync('supabase/migrations/0054_municipal_radar_and_petitions.sql', 'utf8');
const reviewPath = readFileSync(
	'supabase/migrations/0061_municipal_issue_review_context_unforgeable.sql',
	'utf8'
);

const guardFunction =
	reviewPath.match(
		/create or replace function public\.enforce_municipal_issue_review_path\(\)[\s\S]*?\n\$\$;/i
	)?.[0] ?? '';
const reviewFunction =
	reviewPath.match(
		/create or replace function public\.review_municipal_issue\([\s\S]*?\n\$\$;/i
	)?.[0] ?? '';

describe('Radar municipal — camino único de revisión', () => {
	it('las fuentes almacenadas solo admiten HTTPS', () => {
		expect(base).toMatch(
			/municipal_issue_sources[\s\S]*?url text not null check \(url ~ '\^https:\/\/'\)/i
		);
	});

	it('ningún INSERT puede crear directamente un hallazgo público', () => {
		expect(guardFunction).toMatch(/if tg_op = 'INSERT'[\s\S]*?new\.status <> 'detected'/i);
	});

	it('detected solo puede salir con autorización owner-only ligada a actor, issue, acción y txid', () => {
		expect(guardFunction).toMatch(/old\.status = 'detected' and new\.status = 'verified'/i);
		expect(guardFunction).toMatch(/old\.status = 'detected' and new\.status = 'dismissed'/i);
		expect(guardFunction).toMatch(/_municipal_issue_review_authorizations/i);
		expect(guardFunction).toMatch(/a\.issue_id = new\.id/i);
		expect(guardFunction).toMatch(/a\.actor_id = v_actor_id/i);
		expect(guardFunction).toMatch(/a\.txid = txid_current\(\)/i);
		expect(guardFunction).toMatch(/is_moderator_or_admin\(\)/i);
		expect(guardFunction).not.toMatch(/municipal_issue_review_context/i);
	});

	it('la tabla de autorización revoca explícitamente todos los roles API', () => {
		expect(reviewPath).toMatch(
		/revoke all on public\._municipal_issue_review_authorizations from public, anon, authenticated, service_role;/i
	);
		expect(reviewPath).not.toMatch(/create policy[\s\S]*?_municipal_issue_review_authorizations/i);
	});

	it('la RPC crea la autorización antes del UPDATE y la consume después', () => {
		const authorizationPosition = reviewFunction.indexOf(
			'insert into public._municipal_issue_review_authorizations'
		);
		const updatePosition = reviewFunction.indexOf('update public.municipal_issues');
		const cleanupPosition = reviewFunction.indexOf(
			'delete from public._municipal_issue_review_authorizations'
		);
		expect(authorizationPosition).toBeGreaterThanOrEqual(0);
		expect(updatePosition).toBeGreaterThan(authorizationPosition);
		expect(cleanupPosition).toBeGreaterThan(updatePosition);
		expect(reviewFunction).not.toMatch(/set_config\(/i);
	});

	it('la decisión humana no concede EXECUTE a service_role', () => {
		expect(reviewPath).toMatch(
		/revoke all on function public\.review_municipal_issue\(uuid, text\) from public, anon, service_role;/i
	);
		expect(reviewPath).toMatch(
		/grant execute on function public\.review_municipal_issue\(uuid, text\) to authenticated;/i
	);
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
