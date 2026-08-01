<script lang="ts">
	import { goto } from '$app/navigation';
	import { ShieldCheck, Loader2 } from '@lucide/svelte';
	import { acceptLegalTerms } from '$lib/auth/authService';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let acceptedTerms = $state(false);
	let acceptedPrivacy = $state(false);
	let acceptedPeacefulUse = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const canContinue = $derived(acceptedTerms && acceptedPrivacy && acceptedPeacefulUse);

	async function handleSubmit() {
		if (!canContinue || submitting) return;
		submitting = true;
		error = null;
		try {
			await acceptLegalTerms(data.userId);
			await goto(data.destination, { replaceState: true });
		} catch {
			error = 'No se ha podido guardar tu aceptación. Inténtalo de nuevo.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Antes de continuar — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-10 sm:px-6">
	<div class="flex flex-col items-center gap-2 text-center">
		<span class="grid size-12 place-items-center rounded-full bg-brand-100 text-brand-700">
			<ShieldCheck class="size-6" />
		</span>
		<h1 class="font-display text-xl font-semibold text-ink-900">Antes de crear tu convocatoria</h1>
		<p class="max-w-sm text-sm text-ink-600">
			Necesitamos que confirmes estas tres cosas para poder publicar en Convoca. Solo se te pedirá
			de nuevo si el texto cambia de forma sustancial.
		</p>
	</div>

	<div class="mt-8 flex flex-col gap-3">
		<label
			class="flex items-start gap-2.5 rounded-2xl border border-ink-200 p-3.5 text-sm text-ink-700"
		>
			<input
				type="checkbox"
				bind:checked={acceptedTerms}
				class="mt-0.5 size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
			/>
			Acepto las
			<a
				href="/legal/terminos"
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
				class="underline hover:text-brand-700">condiciones de uso</a
			> de Convoca.
		</label>

		<label
			class="flex items-start gap-2.5 rounded-2xl border border-ink-200 p-3.5 text-sm text-ink-700"
		>
			<input
				type="checkbox"
				bind:checked={acceptedPrivacy}
				class="mt-0.5 size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
			/>
			He leído y acepto la
			<a
				href="/legal/privacidad"
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
				class="underline hover:text-brand-700">política de privacidad</a
			> de Convoca.
		</label>

		<label
			class="flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-medium text-brand-900 {acceptedPeacefulUse
				? 'border-brand-100 bg-brand-50'
				: 'border-ink-200'}"
		>
			<input
				type="checkbox"
				bind:checked={acceptedPeacefulUse}
				class="mt-0.5 size-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
			/>
			Declaro que utilizaré Convoca únicamente para difundir acciones legales y pacíficas, conforme a
			la
			<a
				href="/legal/uso-pacifico"
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
				class="underline hover:text-brand-800">declaración de uso pacífico</a
			>.
		</label>

		{#if error}
			<p class="text-critical-600 text-sm">{error}</p>
		{/if}

		<button
			type="button"
			onclick={handleSubmit}
			disabled={!canContinue || submitting}
			class="mt-2 flex items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
		>
			{#if submitting}
				<Loader2 class="size-4 animate-spin" />
			{/if}
			Continuar
		</button>
	</div>
</div>
