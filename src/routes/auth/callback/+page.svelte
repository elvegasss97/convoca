<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Loader2, AlertCircle } from '@lucide/svelte';
	import { supabase } from '$lib/supabase/client';
	import { safeRedirect } from '$lib/utils/safeRedirect';
	import Seo from '$lib/components/Seo.svelte';

	/**
	 * Destino de "Continuar con Google" (flujo PKCE, redirección de página
	 * completa): `$lib/supabase/client.ts` crea el cliente con
	 * `detectSessionInUrl: true`, que en cuanto esta página carga (una carga
	 * completa, no una navegación interna de SvelteKit) detecta el `?code=`
	 * de la URL y lo intercambia automáticamente por una sesión — este
	 * componente no llama a `exchangeCodeForSession` a mano, solo espera el
	 * evento `onAuthStateChange` (o comprueba `getSession()` por si ya se
	 * resolvió antes de montar) y redirige al destino original.
	 */

	let status = $state<'working' | 'error'>('working');
	let errorMessage = $state('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');

	const DEFAULT_DESTINATION = '/organizador';

	function destination(): string {
		return safeRedirect(page.url.searchParams.get('redirect'), DEFAULT_DESTINATION);
	}

	onMount(() => {
		// Google/Supabase devuelven `?error=...&error_description=...` en vez de
		// `?code=...` cuando la persona cancela el consentimiento o algo falla
		// del lado de Google.
		const oauthError =
			page.url.searchParams.get('error_description') || page.url.searchParams.get('error');
		if (oauthError) {
			status = 'error';
			errorMessage =
				page.url.searchParams.get('error') === 'access_denied'
					? 'Has cancelado el acceso con Google. Puedes volver a intentarlo cuando quieras.'
					: 'Google no ha podido completar el inicio de sesión. Inténtalo de nuevo.';
			return;
		}

		let settled = false;

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (settled || !session) return;
			settled = true;
			goto(destination(), { replaceState: true });
		});

		// Por si el intercambio del código ya terminó antes de que este
		// componente llegara a suscribirse (detectSessionInUrl arranca en
		// cuanto se crea el cliente, que puede ser antes de este onMount).
		supabase.auth.getSession().then(({ data }) => {
			if (!settled && data.session) {
				settled = true;
				goto(destination(), { replaceState: true });
			}
		});

		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			status = 'error';
		}, 10_000);

		return () => {
			subscription.unsubscribe();
			clearTimeout(timeout);
		};
	});
</script>

<Seo title="Iniciando sesión" description="Completando el inicio de sesión en Convoca." noindex />

<div class="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
	{#if status === 'working'}
		<Loader2 class="size-8 animate-spin text-brand-600" />
		<p class="text-sm text-ink-600">Completando el inicio de sesión con Google…</p>
	{:else}
		<AlertCircle class="size-8 text-critical-500" />
		<p class="font-semibold text-ink-800">No se ha podido iniciar sesión</p>
		<p class="text-sm text-ink-600">{errorMessage}</p>
		<a
			href="/login"
			class="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
		>
			Volver a iniciar sesión
		</a>
	{/if}
</div>
