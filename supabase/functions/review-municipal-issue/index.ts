import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MUNICIPAL_SECRET_KEY_NAME = 'municipal_write';
const CARTOCIUDAD_CANDIDATES = 'https://www.cartociudad.es/geocoder/api/geocoder/candidates';
const CARTOCIUDAD_FIND = 'https://www.cartociudad.es/geocoder/api/geocoder/find';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface ReviewIssueBody {
	issueId?: unknown;
	action?: unknown;
}

interface CartoCandidate {
	id?: string | number;
	type?: string;
	muniCode?: string | number;
	lat?: number | string;
	lng?: number | string;
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

function resolvePrivilegedSecret(): string | undefined {
	const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return undefined;
		const value = (parsed as Record<string, unknown>)[MUNICIPAL_SECRET_KEY_NAME];
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function normalizeIne(value: unknown): string {
	const raw = String(value ?? '').trim();
	return /^\d{1,5}$/.test(raw) ? raw.padStart(5, '0') : '';
}

function finiteCoordinate(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url: URL): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 7000);
	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'CONVOCA/1.0 (contacto@convoca.cloud)'
			},
			signal: controller.signal
		});
		if (!response.ok) throw new Error(`upstream_${response.status}`);
		return await response.json();
	} finally {
		clearTimeout(timeout);
	}
}

async function resolveCartoCiudadPoint(
	municipalityName: string,
	ineCode: string
): Promise<{ lat: number; lng: number; sourceEntityId: string | null }> {
	const candidatesUrl = new URL(CARTOCIUDAD_CANDIDATES);
	candidatesUrl.searchParams.set('q', municipalityName);
	candidatesUrl.searchParams.set('countrycodes', 'es');
	candidatesUrl.searchParams.set('limit', '33');

	const rawCandidates = await fetchJson(candidatesUrl);
	const candidates = Array.isArray(rawCandidates)
		? (rawCandidates as CartoCandidate[])
		: Array.isArray((rawCandidates as { candidates?: unknown[] } | null)?.candidates)
			? ((rawCandidates as { candidates: CartoCandidate[] }).candidates ?? [])
			: [];

	const candidate = candidates.find(
		(item) => item?.type?.toLowerCase() === 'municipio' && normalizeIne(item.muniCode) === ineCode
	);
	if (!candidate?.id) throw new Error('municipality_not_verified');

	const findUrl = new URL(CARTOCIUDAD_FIND);
	findUrl.searchParams.set('id', String(candidate.id));
	findUrl.searchParams.set('type', 'municipio');
	const rawFound = await fetchJson(findUrl);
	const found = (Array.isArray(rawFound) ? rawFound[0] : rawFound) as CartoCandidate | null;
	if (!found || normalizeIne(found.muniCode) !== ineCode) throw new Error('municipality_mismatch');

	const lat = finiteCoordinate(found.lat);
	const lng = finiteCoordinate(found.lng);
	if (lat === null || lng === null || lat < 27 || lat > 44.5 || lng < -19 || lng > 5) {
		throw new Error('municipality_coordinates_invalid');
	}
	return { lat, lng, sourceEntityId: String(found.id ?? candidate.id) };
}

Deno.serve(async (req: Request) => {
	if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
	if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

	const authHeader = req.headers.get('Authorization');
	if (!authHeader) return json({ error: 'No autenticado' }, 401);

	const supabaseUrl = Deno.env.get('SUPABASE_URL');
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
	if (!supabaseUrl || !anonKey) return json({ error: 'No se ha podido procesar la solicitud.' }, 500);

	const callerClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } }
	});
	const { data: userData, error: userError } = await callerClient.auth.getUser();
	if (userError || !userData.user) return json({ error: 'No autenticado' }, 401);

	// Esta RPC usa el JWT del caller y por tanto exige rol staff + aal2 en BD.
	const { data: isStaff, error: staffError } = await callerClient.rpc('is_moderator_or_admin');
	if (staffError || isStaff !== true) return json({ error: 'Acceso restringido a moderación.' }, 403);

	let body: ReviewIssueBody;
	try {
		body = (await req.json()) as ReviewIssueBody;
	} catch {
		return json({ error: 'Solicitud no válida' }, 400);
	}

	const issueId = typeof body.issueId === 'string' ? body.issueId.trim() : '';
	const action = body.action === 'publish' || body.action === 'dismiss' ? body.action : '';
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(issueId)) {
		return json({ error: 'Hallazgo no válido' }, 400);
	}
	if (!action) return json({ error: 'Acción no válida' }, 400);

	if (action === 'dismiss') {
		const { error } = await callerClient.rpc('review_municipal_issue', {
			p_issue_id: issueId,
			p_action: 'dismiss'
		});
		if (error) {
			const safe = /ya no está pendiente/i.test(error.message)
				? 'El hallazgo ya no está pendiente de revisión.'
				: 'No se ha podido descartar el hallazgo.';
			return json({ error: safe }, 400);
		}
		return json({ ok: true });
	}

	// Antes de resolver la clave privilegiada comprobamos el hallazgo y que
	// haya al menos una fuente. Evita hacer I/O externo para contenido que aún
	// no cumple el mínimo editorial de publicación.
	const { data: issue, error: issueError } = await callerClient
		.from('municipal_issues')
		.select('id, status, municipality_ine_code')
		.eq('id', issueId)
		.maybeSingle();
	if (issueError || !issue || issue.status !== 'detected') {
		return json({ error: 'El hallazgo ya no está pendiente de revisión.' }, 400);
	}
	const municipalityIneCode = normalizeIne(issue.municipality_ine_code);
	if (!municipalityIneCode) return json({ error: 'El hallazgo necesita un municipio INE.' }, 400);

	const { data: sourceRow, error: sourceError } = await callerClient
		.from('municipal_issue_sources')
		.select('id')
		.eq('issue_id', issueId)
		.limit(1)
		.maybeSingle();
	if (sourceError) return json({ error: 'No se han podido comprobar las fuentes.' }, 500);
	if (!sourceRow) return json({ error: 'Añade al menos una fuente verificable antes de publicar.' }, 400);

	const secretKey = resolvePrivilegedSecret();
	if (!secretKey) return json({ error: 'No se ha podido procesar la solicitud.' }, 500);
	const adminClient = createClient(supabaseUrl, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { data: municipality, error: municipalityError } = await adminClient
		.from('ine_municipalities')
		.select('ine_code, name, province_code')
		.eq('ine_code', municipalityIneCode)
		.maybeSingle();
	if (municipalityError || !municipality) return json({ error: 'Municipio no válido' }, 400);

	const { data: cached, error: cacheReadError } = await adminClient
		.from('municipal_map_points')
		.select('municipality_ine_code')
		.eq('municipality_ine_code', municipalityIneCode)
		.maybeSingle();
	if (cacheReadError) return json({ error: 'No se ha podido ubicar el municipio.' }, 502);

	if (!cached) {
		const { error: guardError } = await adminClient.rpc(
			'guard_municipal_staff_map_resolution_server',
			{ p_user_id: userData.user.id }
		);
		if (guardError) {
			if (/demasiadas verificaciones|límite diario/i.test(guardError.message)) {
				return json({ error: 'Se ha alcanzado temporalmente el límite de verificaciones.' }, 429);
			}
			return json({ error: 'No se ha podido verificar la ubicación del municipio.' }, 500);
		}

		try {
			const resolved = await resolveCartoCiudadPoint(municipality.name, municipalityIneCode);
			const { error: cacheWriteError } = await adminClient.from('municipal_map_points').upsert({
				municipality_ine_code: municipalityIneCode,
				lat: resolved.lat,
				lng: resolved.lng,
				source_provider: 'cartociudad_cnig',
				source_entity_id: resolved.sourceEntityId,
				source_checked_at: new Date().toISOString()
			});
			if (cacheWriteError) throw new Error('cache_write_failed');
		} catch {
			return json({ error: 'No se ha podido verificar la ubicación oficial del municipio.' }, 502);
		}
	}

	// La decisión final vuelve a pasar con el JWT original: review_municipal_issue
	// exige de nuevo staff + aal2 y el trigger canonicaliza nombre/provincia/coords.
	const { error: publishError } = await callerClient.rpc('review_municipal_issue', {
		p_issue_id: issueId,
		p_action: 'publish'
	});
	if (publishError) {
		const safe = /fuente verificable/i.test(publishError.message)
			? 'Añade al menos una fuente verificable antes de publicar.'
			: /ya no está pendiente/i.test(publishError.message)
				? 'El hallazgo ya no está pendiente de revisión.'
				: 'No se ha podido publicar el hallazgo.';
		return json({ error: safe }, 400);
	}

	return json({ ok: true });
});
