import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Creación de recogidas municipales con geografía autoritativa.
 *
 * El navegador NUNCA envía lat/lng. La función:
 *   1) valida el JWT real de la persona;
 *   2) resuelve el municipio del catálogo INE de CONVOCA;
 *   3) reutiliza una coordenada oficial cacheada o consulta el Geocoder REST
 *      de CartoCiudad/CNIG y valida que muniCode coincide con el INE pedido;
 *   4) llama a una RPC interna que solo puede ejecutar el rol privilegiado
 *      del servidor; esa RPC vuelve a leer la coordenada desde la caché,
 *      por lo que ni siquiera la Edge Function puede inyectar lat/lng.
 *
 * Usa una Secret API Key nombrada "municipal_write" desde SUPABASE_SECRET_KEYS.
 * Esa clave elevada nunca se loguea, nunca se devuelve y solo se resuelve tras
 * autenticar al caller. La superficie privilegiada de esta función es estrecha:
 * cachear un punto municipal validado y ejecutar create_municipal_petition_server.
 */

const MUNICIPAL_SECRET_KEY_NAME = 'municipal_write';
const CARTOCIUDAD_CANDIDATES = 'https://www.cartociudad.es/geocoder/api/geocoder/candidates';
const CARTOCIUDAD_FIND = 'https://www.cartociudad.es/geocoder/api/geocoder/find';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface CreatePetitionBody {
	title?: unknown;
	requestText?: unknown;
	targetName?: unknown;
	municipalityIneCode?: unknown;
	issueId?: unknown;
}

interface CartoCandidate {
	id?: string | number;
	type?: string;
	address?: string;
	muni?: string;
	muniCode?: string | number;
	province?: string;
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

function asTrimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
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

	let body: CreatePetitionBody;
	try {
		body = (await req.json()) as CreatePetitionBody;
	} catch {
		return json({ error: 'Solicitud no válida' }, 400);
	}

	const title = asTrimmedString(body.title);
	const requestText = asTrimmedString(body.requestText);
	const targetName = asTrimmedString(body.targetName);
	const municipalityIneCode = normalizeIne(body.municipalityIneCode);
	const issueId = body.issueId == null ? null : asTrimmedString(body.issueId);

	if (title.length < 8 || title.length > 160) return json({ error: 'Título no válido' }, 400);
	if (requestText.length < 20 || requestText.length > 2200)
		return json({ error: 'Petición no válida' }, 400);
	if (targetName.length < 2 || targetName.length > 200)
		return json({ error: 'Destinatario no válido' }, 400);
	if (!/^\d{5}$/.test(municipalityIneCode)) return json({ error: 'Municipio no válido' }, 400);
	if (
		issueId &&
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			issueId
		)
	)
		return json({ error: 'Problema asociado no válido' }, 400);

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

	let point: { lat: number; lng: number; source_entity_id: string | null } | null = null;
	const { data: cached, error: cacheReadError } = await adminClient
		.from('municipal_map_points')
		.select('lat, lng, source_entity_id')
		.eq('municipality_ine_code', municipalityIneCode)
		.maybeSingle();
	if (cacheReadError) return json({ error: 'No se ha podido ubicar el municipio.' }, 502);
	if (cached) point = cached;

	if (!point) {
		// El límite se consume ANTES de hacer I/O externo. Así un usuario no puede
		// convertir la función en un proxy ilimitado hacia CartoCiudad provocando
		// fallos posteriores. Solo se consume en cache miss: una petición sobre un
		// municipio ya resuelto no genera tráfico adicional al proveedor oficial.
		const { error: resolutionGuardError } = await adminClient.rpc(
			'guard_municipal_map_resolution_server',
			{ p_user_id: userData.user.id }
		);
		if (resolutionGuardError) {
			if (/demasiadas ubicaciones|límite diario de verificaciones/i.test(resolutionGuardError.message)) {
				return json({ error: resolutionGuardError.message }, 429);
			}
			if (/condiciones|privacidad vigentes/i.test(resolutionGuardError.message)) {
				return json(
					{ error: 'Debes aceptar las condiciones y la política de privacidad vigentes.' },
					403
				);
			}
			return json({ error: 'No se ha podido verificar la ubicación del municipio.' }, 500);
		}

		// No confiamos en nombres/provincia enviados por el navegador: se busca
		// por el nombre del catálogo INE y se acepta exclusivamente el candidato
		// de tipo municipio cuyo muniCode coincide exactamente con el INE elegido.
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
			point = {
				lat: resolved.lat,
				lng: resolved.lng,
				source_entity_id: resolved.sourceEntityId
			};
		} catch {
			return json({ error: 'No se ha podido verificar la ubicación oficial del municipio.' }, 502);
		}
	}

	const { data: petitionId, error: createError } = await adminClient.rpc(
		'create_municipal_petition_server',
		{
			p_user_id: userData.user.id,
			p_title: title,
			p_request_text: requestText,
			p_target_name: targetName,
			p_municipality_ine_code: municipalityIneCode,
			p_issue_id: issueId
		}
	);
	if (createError) {
		// No devolver detalles de Postgres: pueden revelar reglas internas.
		const safeMessage = /demasiadas recogidas|límite diario/i.test(createError.message)
			? createError.message
			: /condiciones|privacidad vigentes/i.test(createError.message)
				? 'Debes aceptar las condiciones y la política de privacidad vigentes.'
				: /otro municipio|problema asociado/i.test(createError.message)
					? 'El problema asociado no corresponde con el municipio seleccionado.'
					: 'No se ha podido abrir la recogida.';
		return json({ error: safeMessage }, 400);
	}

	return json({ id: petitionId }, 201);
});
