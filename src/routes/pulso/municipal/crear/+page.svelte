<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { ArrowLeft, CheckCircle2, FileSignature, Loader2, MapPin, Send } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';
	import MunicipalitySearchCombobox from '$lib/components/pulso/MunicipalitySearchCombobox.svelte';
	import { authState } from '$lib/auth/session.svelte';
	import { getMyOrganizerPrivateProfile, hasCompletedLegalAcceptance } from '$lib/auth/authService';
	import { createMunicipalPetition } from '$lib/services/municipalService';

	let { data }: { data: PageData } = $props();

	let title = $state(data.issue ? `Actuar sobre: ${data.issue.title}` : '');
	let requestText = $state('');
	let targetName = $state(data.issue?.competenceLabel ?? 'Ayuntamiento');
	let municipalityIneCode = $state<string | undefined>(data.issue?.municipalityIneCode);
	let municipalityName = $state<string | undefined>(data.issue?.municipalityName);
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let done = $state(false);
	let createdPetitionId = $state<string | null>(null);

	const DRAFT_KEY = 'convoca:municipal-petition:draft:v1';

	const titleValid = $derived(title.trim().length >= 8 && title.trim().length <= 160);
	const requestValid = $derived(
		requestText.trim().length >= 20 && requestText.trim().length <= 2200
	);
	const targetValid = $derived(targetName.trim().length >= 2 && targetName.trim().length <= 200);
	const municipalityValid = $derived(Boolean(municipalityIneCode && municipalityName));
	const formValid = $derived(titleValid && requestValid && targetValid && municipalityValid);

	function redirectBack(): string {
		return `/pulso/municipal/crear${data.issue ? `?issue=${encodeURIComponent(data.issue.id)}` : ''}`;
	}

	function persistDraft() {
		if (!browser) return;
		try {
			sessionStorage.setItem(
				DRAFT_KEY,
				JSON.stringify({
					title,
					requestText,
					targetName,
					municipalityIneCode,
					municipalityName,
					issueId: data.issue?.id ?? null
				})
			);
		} catch {
			// Si el almacenamiento está bloqueado, el flujo sigue funcionando;
			// simplemente no se puede restaurar el borrador tras login/legal.
		}
	}

	function clearDraft() {
		if (!browser) return;
		try {
			sessionStorage.removeItem(DRAFT_KEY);
		} catch {
			// Sin almacenamiento disponible no hay nada que limpiar.
		}
	}

	onMount(() => {
		try {
			const raw = sessionStorage.getItem(DRAFT_KEY);
			if (!raw) return;
			const draft = JSON.parse(raw) as {
				title?: unknown;
				requestText?: unknown;
				targetName?: unknown;
				municipalityIneCode?: unknown;
				municipalityName?: unknown;
				issueId?: unknown;
			};
			if ((draft.issueId ?? null) !== (data.issue?.id ?? null)) return;
			if (typeof draft.title === 'string') title = draft.title;
			if (typeof draft.requestText === 'string') requestText = draft.requestText;
			if (typeof draft.targetName === 'string') targetName = draft.targetName;
			if (typeof draft.municipalityIneCode === 'string') municipalityIneCode = draft.municipalityIneCode;
			if (typeof draft.municipalityName === 'string') municipalityName = draft.municipalityName;
		} catch {
			clearDraft();
		}
	});

	async function submit() {
		if (submitting || !formValid) return;
		const session = authState.session;
		if (!session) {
			persistDraft();
			await goto(`/login?redirect=${encodeURIComponent(redirectBack())}`);
			return;
		}
		if (!municipalityIneCode) return;

		const profile = await getMyOrganizerPrivateProfile(session.user.id);
		if (!hasCompletedLegalAcceptance(profile)) {
			persistDraft();
			await goto(`/aceptar-condiciones?redirect=${encodeURIComponent(redirectBack())}`);
			return;
		}

		submitting = true;
		submitError = null;
		try {
			createdPetitionId = await createMunicipalPetition({
				title: title.trim(),
				requestText: requestText.trim(),
				targetName: targetName.trim(),
				municipalityIneCode,
				issueId: data.issue?.id
			});
			clearDraft();
			done = true;
		} catch (err) {
			console.error('No se pudo abrir la recogida municipal', err);
			submitError = err instanceof Error ? err.message : 'No se ha podido abrir la recogida.';
		} finally {
			submitting = false;
		}
	}
</script>

<Seo
	title="Abrir recogida de firmas"
	description="Abre una recogida de apoyos ciudadanos sobre un problema concreto de tu municipio."
/>

<div class="mx-auto max-w-2xl px-4 pt-5 pb-20 sm:px-6">
	<a
		href="/pulso/municipal"
		class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-700"
	>
		<ArrowLeft class="size-4" /> Volver al mapa municipal
	</a>

	{#if done}
		<section
			class="mt-8 rounded-3xl border border-brand-200 bg-white p-7 text-center shadow-card sm:p-10"
		>
			<div
				class="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700"
			>
				<CheckCircle2 class="size-7" />
			</div>
			<h1 class="mt-4 font-display text-2xl font-semibold text-ink-900">Recogida publicada</h1>
			<p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
				Ya forma parte del mapa de Firmas. Cada cuenta puede apoyarla una sola vez.
			</p>
			<a
				href={`/pulso/municipal?view=petitions${createdPetitionId ? `&petition=${encodeURIComponent(createdPetitionId)}` : ''}`}
				class="mt-5 inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Verla en el mapa
			</a>
		</section>
	{:else}
		<header class="mt-6">
			<div class="flex items-center gap-2">
				<FileSignature class="size-6 text-brand-700" />
				<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
					Abrir recogida de firmas
				</h1>
			</div>
			<p class="mt-2 text-sm leading-relaxed text-ink-600">
				Pide una actuación concreta sobre un municipio. Publicar es inmediato; los controles contra
				spam y abuso funcionan por detrás.
			</p>
		</header>

		{#if data.issue}
			<div class="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
				<p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">
					Partes de un problema documentado
				</p>
				<p class="mt-1 text-sm font-semibold text-ink-900">{data.issue.title}</p>
				<p class="mt-1 text-xs leading-relaxed text-ink-600">
					{data.issue.municipalityName} · La ficha original seguirá enlazada a esta recogida.
				</p>
			</div>
		{/if}

		<form
			class="mt-6 space-y-5"
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<div>
				<label for="petition-title" class="text-sm font-semibold text-ink-800"
					>¿Qué quieres conseguir?</label
				>
				<input
					id="petition-title"
					bind:value={title}
					maxlength="160"
					placeholder="Ej. Reparar el parque infantil de la Plaza Mayor"
					class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				{#if title.trim().length > 0 && title.trim().length < 8}
					<p class="mt-1 text-xs text-critical-700">
						Necesitas al menos 8 caracteres (llevas {title.trim().length}).
					</p>
				{:else}
					<p class="mt-1 text-xs text-ink-400">
						Una petición concreta funciona mejor que una reclamación genérica.
					</p>
				{/if}
			</div>

			<div>
				<label class="text-sm font-semibold text-ink-800" for="petition-municipality">¿Dónde?</label
				>
				<div class="mt-1.5">
					<MunicipalitySearchCombobox
						bind:ineCode={municipalityIneCode}
						bind:name={municipalityName}
						idPrefix="petition-municipality"
					/>
				</div>
				{#if municipalityName}
					<p class="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-700">
						<MapPin class="size-3.5" />
						{municipalityName}
					</p>
				{/if}
			</div>

			<div>
				<label for="petition-request" class="text-sm font-semibold text-ink-800"
					>¿Qué actuación estás pidiendo?</label
				>
				<textarea
					id="petition-request"
					bind:value={requestText}
					rows="6"
					maxlength="2200"
					placeholder="Describe qué ocurre y qué actuación concreta solicitas…"
					class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
				<div class="mt-1 flex items-center justify-between gap-2 text-xs">
					{#if requestText.trim().length > 0 && requestText.trim().length < 20}
						<p class="text-critical-700">
							Necesitas al menos 20 caracteres (llevas {requestText.trim().length}).
						</p>
					{:else}
						<span></span>
					{/if}
					<p class="shrink-0 text-ink-400">{requestText.length}/2200</p>
				</div>
			</div>

			<div>
				<label for="petition-target" class="text-sm font-semibold text-ink-800"
					>¿A quién va dirigida?</label
				>
				<input
					id="petition-target"
					bind:value={targetName}
					maxlength="200"
					placeholder="Ej. Ayuntamiento de… / Concejalía de Movilidad"
					class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>

			<div
				class="rounded-2xl border border-ink-100 bg-ink-50 p-4 text-xs leading-relaxed text-ink-500"
			>
				<strong class="font-semibold text-ink-700">Importante:</strong> aquí “firmar” significa apoyar
				una iniciativa ciudadana dentro de CONVOCA. No se presenta como firma jurídica válida para una
				ILP u otro procedimiento administrativo oficial. Al publicar, tu cuenta queda vinculada
				internamente como creadora mientras exista; esa identidad no se muestra en la API pública y se
				anonimiza si eliminas tu cuenta. Consulta la
				<a href="/legal/privacidad" class="font-semibold text-brand-700 hover:underline">Política de privacidad</a>.
			</div>

			{#if submitError}
				<p class="rounded-xl bg-critical-50 px-4 py-3 text-sm font-medium text-critical-700">
					{submitError}
				</p>
			{/if}

			<button
				type="submit"
				disabled={!formValid || submitting}
				class="flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if submitting}
					<Loader2 class="size-4 animate-spin" /> Publicando…
				{:else}
					<Send class="size-4" /> Publicar recogida
				{/if}
			</button>
		</form>
	{/if}
</div>
