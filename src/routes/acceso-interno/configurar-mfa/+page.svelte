<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { ShieldCheck, Loader2, AlertCircle, KeyRound } from '@lucide/svelte';
	import { enrollTotp, verifyTotpCode } from '$lib/auth/staffAuthService';

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let factorId = $state('');
	let qrCodeSvg = $state('');
	let secret = $state('');

	let code = $state('');
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	/**
	 * Comprobado empíricamente (capturando el valor real que devuelve
	 * `supabase.auth.mfa.enroll()` contra convoca-staging, no solo
	 * confiando en el comentario del SDK): `data.totp.qr_code` YA es una
	 * URI `data:image/svg+xml;utf-8,<...>` completa, no SVG en crudo — el
	 * comentario del SDK ("prepend `data:image/svg+xml;utf-8,` al valor")
	 * está desactualizado para esta versión de la API. Envolverla nosotros
	 * otra vez (como hacía la versión anterior de este archivo) produce una
	 * URI anidada e inválida: el navegador la interpreta bien como
	 * `base64`, pero al decodificarla obtiene el TEXTO
	 * "data:image/svg+xml;utf-8,<?xml..." en vez de una imagen — de ahí que
	 * se viera el texto alternativo en lugar del QR. Se usa el valor tal
	 * cual si ya viene como `data:`, con un envoltorio de reserva por si
	 * una versión futura de la API vuelve a devolver solo el SVG en crudo.
	 */
	function toQrImageSrc(qrCode: string): string {
		if (qrCode.startsWith('data:')) return qrCode;
		const bytes = new TextEncoder().encode(qrCode);
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return `data:image/svg+xml;base64,${btoa(binary)}`;
	}

	const qrDataUrl = $derived(qrCodeSvg ? toQrImageSrc(qrCodeSvg) : '');

	onMount(async () => {
		try {
			const enrollment = await enrollTotp();
			factorId = enrollment.factorId;
			qrCodeSvg = enrollment.qrCodeSvg;
			secret = enrollment.secret;
		} catch (err) {
			loadError =
				err instanceof Error
					? err.message
					: 'No se ha podido iniciar la configuración de verificación en dos pasos.';
		} finally {
			loading = false;
		}
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		errorMessage = null;
		submitting = true;
		try {
			await verifyTotpCode(factorId, code);
			await goto('/moderacion', { replaceState: true });
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Código incorrecto o caducado.';
		} finally {
			submitting = false;
		}
	}
</script>

<Seo
	title="Configurar verificación en dos pasos"
	description="Configura la verificación en dos pasos para acceder al Centro de Operaciones."
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">
			Configura la verificación en dos pasos
		</h1>
	</div>
	<p class="mt-1 text-sm text-ink-500">
		Es obligatoria para acceder al Centro de Operaciones. Necesitas una app de autenticación (Google
		Authenticator, Authy, 1Password…) en tu teléfono.
	</p>

	<div class="mt-6 space-y-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
		{#if loading}
			<div class="flex items-center justify-center gap-2 py-6 text-sm text-ink-500">
				<Loader2 class="size-4 animate-spin" /> Preparando…
			</div>
		{:else if loadError}
			<div
				class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				{loadError}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-3">
				<img
					src={qrDataUrl}
					alt="Código QR para configurar la verificación en dos pasos"
					class="size-48 rounded-2xl border border-ink-100"
				/>
				<p class="text-center text-xs text-ink-500">
					¿No puedes escanearlo? Introduce este código manualmente en tu app:
				</p>
				<code class="rounded-lg bg-ink-50 px-3 py-1.5 text-xs break-all text-ink-700">{secret}</code
				>
			</div>

			<form class="space-y-4" onsubmit={submit}>
				{#if errorMessage}
					<div
						class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
						role="alert"
					>
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						{errorMessage}
					</div>
				{/if}

				<div>
					<label for="code" class="mb-1 block text-sm font-medium text-ink-700"
						>Código de 6 dígitos</label
					>
					<input
						id="code"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						pattern="[0-9]*"
						maxlength="6"
						bind:value={code}
						required
						placeholder="123456"
						class="w-full rounded-xl border-ink-200 text-center text-lg tracking-[0.3em] focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>

				<button
					type="submit"
					disabled={submitting || code.trim().length !== 6}
					class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{#if submitting}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<KeyRound class="size-4" />
					{/if}
					{submitting ? 'Comprobando…' : 'Confirmar y entrar'}
				</button>
			</form>
		{/if}
	</div>
</div>
