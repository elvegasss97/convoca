<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { ShieldCheck, Loader2, AlertCircle, KeyRound } from '@lucide/svelte';
	import { getVerifiedTotpFactorId, verifyTotpCode } from '$lib/auth/staffAuthService';

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let factorId = $state('');

	let code = $state('');
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	onMount(async () => {
		const id = await getVerifiedTotpFactorId();
		if (!id) {
			loadError = 'No se ha encontrado ningún factor de verificación configurado.';
		} else {
			factorId = id;
		}
		loading = false;
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
	title="Verificación en dos pasos"
	description="Introduce tu código de verificación en dos pasos para acceder al Centro de Operaciones."
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">Verificación en dos pasos</h1>
	</div>
	<p class="mt-1 text-sm text-ink-500">
		Introduce el código de tu app de autenticación para continuar.
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
					{submitting ? 'Comprobando…' : 'Verificar y entrar'}
				</button>
			</form>
		{/if}
	</div>
</div>
