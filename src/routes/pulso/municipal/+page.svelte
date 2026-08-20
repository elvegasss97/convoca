<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Bot,
		CheckCircle2,
		ExternalLink,
		FileSignature,
		Flag,
		Lightbulb,
		MapPinned,
		MapPin,
		Plus,
		Radar,
		RefreshCw,
		X,
		ShieldCheck,
		Users
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { MunicipalIssue, MunicipalPetition } from '$lib/types';
	import Seo from '$lib/components/Seo.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import MunicipalMap from '$lib/components/pulso/MunicipalMap.svelte';
	import { authState } from '$lib/auth/session.svelte';
	import {
		getMyMunicipalPetitionSupports,
		reportMunicipalPetition,
		setMunicipalPetitionSupport,
		type MunicipalPetitionReportReason
	} from '$lib/services/municipalService';

	let { data }: { data: PageData } = $props();
	const initialPetitionId = page.url.searchParams.get('petition');
	const initialView = page.url.searchParams.get('view');
	let mode = $state<'issues' | 'petitions'>(initialView === 'petitions' ? 'petitions' : 'issues');
	let issues = $state<MunicipalIssue[]>(data.issues);
	let petitions = $state<MunicipalPetition[]>(data.petitions);
	let selectedIssue = $state<MunicipalIssue | null>(null);
	let selectedPetition = $state<MunicipalPetition | null>(
		initialPetitionId ? (petitions.find((item) => item.id === initialPetitionId) ?? null) : null
	);
	let signingId = $state<string | null>(null);
	let signingError = $state<string | null>(null);
	let consentPetitionId = $state<string | null>(null);
	let supportConsentChecked = $state(false);
	let reportingPetitionId = $state<string | null>(null);
	let reportReason = $state<MunicipalPetitionReportReason>('spam');
	let reportDetails = $state('');
	let reportSubmitting = $state(false);
	let reportMessage = $state<string | null>(null);
	let reportMessagePetitionId = $state<string | null>(null);
	let reportError = $state<string | null>(null);

	const numberFormatter = new Intl.NumberFormat('es-ES');

	const issueStatusLabel: Record<MunicipalIssue['status'], string> = {
		detected: 'Detectado',
		verified: 'Verificado',
		in_action: 'En actuación',
		resolved: 'Resuelto'
	};

	const evidenceLabel: Record<MunicipalIssue['evidenceLevel'], string> = {
		low: 'Evidencia inicial',
		medium: 'Evidencia suficiente',
		high: 'Evidencia alta'
	};

	onMount(async () => {
		try {
			const supportedIds = await getMyMunicipalPetitionSupports(petitions.map((item) => item.id));
			if (supportedIds.size === 0) return;
			petitions = petitions.map((item) => ({
				...item,
				isSupportedByMe: supportedIds.has(item.id)
			}));
			if (selectedPetition) {
				selectedPetition =
					petitions.find((item) => item.id === selectedPetition?.id) ?? selectedPetition;
			}
		} catch (err) {
			console.error('No se pudo cargar el estado privado de firmas', err);
		}
	});

	function chooseIssue(issue: MunicipalIssue) {
		selectedIssue = issue;
		selectedPetition = null;
	}

	function choosePetition(petition: MunicipalPetition) {
		selectedPetition = petition;
		selectedIssue = null;
		signingError = null;
		consentPetitionId = null;
		supportConsentChecked = false;
		reportingPetitionId = null;
		reportError = null;
		if (reportMessagePetitionId !== petition.id) {
			reportMessage = null;
			reportMessagePetitionId = null;
		}
	}

	function closeSelection() {
		selectedIssue = null;
		selectedPetition = null;
		consentPetitionId = null;
		supportConsentChecked = false;
		reportingPetitionId = null;
		reportError = null;
		signingError = null;
	}

	function switchMode(next: 'issues' | 'petitions') {
		mode = next;
		closeSelection();
	}

	function supportLoginRedirect(petitionId: string): string {
		return `/pulso/municipal?view=petitions&petition=${encodeURIComponent(petitionId)}`;
	}

	async function applySupport(petition: MunicipalPetition, next: boolean, explicitConsent = false) {
		if (signingId) return;
		signingId = petition.id;
		signingError = null;
		try {
			await setMunicipalPetitionSupport(petition.id, next, explicitConsent);
			petitions = petitions.map((item) =>
				item.id === petition.id
					? {
							...item,
							isSupportedByMe: next,
							supportCount: Math.max(0, item.supportCount + (next ? 1 : -1))
						}
					: item
			);
			selectedPetition = petitions.find((item) => item.id === petition.id) ?? selectedPetition;
			consentPetitionId = null;
			supportConsentChecked = false;
		} catch (err) {
			console.error('No se pudo cambiar el apoyo municipal', err);
			signingError = 'No se ha podido registrar tu apoyo. Inténtalo de nuevo.';
		} finally {
			signingId = null;
		}
	}

	async function toggleSupport(petition: MunicipalPetition) {
		if (signingId) return;
		if (!authState.session) {
			await goto(`/login?redirect=${encodeURIComponent(supportLoginRedirect(petition.id))}`);
			return;
		}
		if (petition.isSupportedByMe) {
			await applySupport(petition, false);
			return;
		}
		consentPetitionId = petition.id;
		supportConsentChecked = false;
		signingError = null;
	}

	async function confirmSupport(petition: MunicipalPetition) {
		if (!supportConsentChecked) return;
		await applySupport(petition, true, true);
	}

	async function openReport(petition: MunicipalPetition) {
		reportMessage = null;
		reportMessagePetitionId = null;
		reportError = null;
		if (!authState.session) {
			await goto(`/login?redirect=${encodeURIComponent(supportLoginRedirect(petition.id))}`);
			return;
		}
		reportingPetitionId = petition.id;
		reportReason = 'spam';
		reportDetails = '';
	}

	async function submitReport(petition: MunicipalPetition) {
		if (reportSubmitting) return;
		reportSubmitting = true;
		reportError = null;
		reportMessage = null;
		reportMessagePetitionId = null;
		try {
			await reportMunicipalPetition(petition.id, reportReason, reportDetails);
			reportingPetitionId = null;
			reportMessage = 'Reporte enviado a moderación. Gracias.';
			reportMessagePetitionId = petition.id;
		} catch (err) {
			console.error('No se pudo reportar la recogida municipal', err);
			reportError = 'No se ha podido enviar el reporte. Inténtalo de nuevo.';
		} finally {
			reportSubmitting = false;
		}
	}
</script>

<Seo
	title="Muro municipal"
	description="Un mapa vivo de problemas municipales documentados y recogidas de apoyos impulsadas por ciudadanos de toda España."
/>

<div class="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6">
	<header class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<PulsoSectionTabs active="municipal" />
			<div class="mt-4 flex items-center gap-2">
				<Radar class="size-6 text-brand-700" strokeWidth={2.2} />
				<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Muro municipal</h1>
			</div>
			<p class="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600 sm:text-base">
				Problemas concretos, municipio a municipio. El mapa muestra dónde hay asuntos documentados y
				dónde la ciudadanía está reuniendo apoyos para pedir una actuación.
			</p>
		</div>

		<a
			href="/pulso/municipal/crear"
			class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
		>
			<Plus class="size-4" /> Abrir recogida de firmas
		</a>
	</header>

	<section class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
		<div class="rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
			<p class="text-xs font-medium text-ink-400">Problemas activos</p>
			<p class="mt-0.5 font-display text-xl font-semibold text-ink-900">
				{numberFormatter.format(data.summary.issueCount)}
			</p>
		</div>
		<div class="rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
			<p class="text-xs font-medium text-ink-400">Recogidas abiertas</p>
			<p class="mt-0.5 font-display text-xl font-semibold text-ink-900">
				{numberFormatter.format(data.summary.petitionCount)}
			</p>
		</div>
		<div class="rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
			<p class="text-xs font-medium text-ink-400">Apoyos ciudadanos</p>
			<p class="mt-0.5 font-display text-xl font-semibold text-ink-900">
				{numberFormatter.format(data.summary.supportCount)}
			</p>
		</div>
		<div class="rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
			<p class="text-xs font-medium text-ink-400">Municipios activos</p>
			<p class="mt-0.5 font-display text-xl font-semibold text-ink-900">
				{numberFormatter.format(data.summary.municipalityCount)}
			</p>
		</div>
	</section>

	<div class="mb-3 flex items-center justify-between gap-3">
		<div class="inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-sm">
			<button
				type="button"
				onclick={() => switchMode('issues')}
				class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition {mode ===
				'issues'
					? 'bg-brand-700 text-white'
					: 'text-ink-600 hover:bg-ink-50'}"
			>
				<MapPinned class="size-4" /> Problemas
			</button>
			<button
				type="button"
				onclick={() => switchMode('petitions')}
				class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition {mode ===
				'petitions'
					? 'bg-brand-700 text-white'
					: 'text-ink-600 hover:bg-ink-50'}"
			>
				<FileSignature class="size-4" /> Firmas
			</button>
		</div>
		<p class="hidden text-xs text-ink-400 sm:block">Pulsa cualquier luz para abrir su ficha</p>
	</div>

	<div class="relative">
		<MunicipalMap
			{issues}
			{petitions}
			{mode}
			onSelectIssue={chooseIssue}
			onSelectPetition={choosePetition}
		/>

		{#if mode === 'issues' && selectedIssue}
			<article
				class="absolute top-3 left-3 z-10 w-[min(390px,calc(100%-1.5rem))] rounded-3xl border border-white/70 bg-white/95 p-4 shadow-card-hover backdrop-blur sm:p-5"
			>
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
							<MapPin class="size-3.5" />
							{selectedIssue.municipalityName}
						</div>
						<h2 class="mt-1 font-display text-lg leading-snug font-semibold text-ink-900">
							{selectedIssue.title}
						</h2>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<span
							class="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
						>
							{issueStatusLabel[selectedIssue.status]}
						</span>
						<button
							type="button"
							onclick={closeSelection}
							class="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
							aria-label="Cerrar ficha"
						>
							<X class="size-4" />
						</button>
					</div>
				</div>

				<p class="mt-2 text-sm leading-relaxed text-ink-600">{selectedIssue.summary}</p>

				<div class="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-ink-600"
					>
						<ShieldCheck class="size-3.5" />
						{evidenceLabel[selectedIssue.evidenceLevel]}
					</span>
					{#if selectedIssue.competenceLabel}
						<span class="rounded-full bg-ink-50 px-2.5 py-1 text-ink-600"
							>{selectedIssue.competenceLabel}</span
						>
					{/if}
				</div>

				{#if selectedIssue.suggestions.length > 0}
					<div class="mt-4 rounded-2xl bg-brand-50 p-3.5">
						<div class="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
							<Bot class="size-4" /> Orientación CONVOCA
						</div>
						<ul class="mt-2 space-y-1.5">
							{#each selectedIssue.suggestions as suggestion (suggestion.id)}
								<li class="flex gap-2 text-xs leading-relaxed text-ink-700">
									<Lightbulb class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
									{suggestion.text}
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if selectedIssue.sources.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each selectedIssue.sources.slice(0, 2) as source (source.id)}
							<a
								href={source.url}
								target="_blank"
								rel="noreferrer"
								class="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-700 hover:underline"
							>
								Fuente: {source.publisher ?? source.title}
								<ExternalLink class="size-3" />
							</a>
						{/each}
					</div>
				{/if}

				<a
					href={`/pulso/municipal/crear?issue=${encodeURIComponent(selectedIssue.id)}`}
					class="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
				>
					<FileSignature class="size-4" /> Abrir recogida sobre este problema
				</a>
			</article>
		{:else if mode === 'petitions' && selectedPetition}
			<article
				class="absolute top-3 left-3 z-10 w-[min(390px,calc(100%-1.5rem))] rounded-3xl border border-white/70 bg-white/95 p-4 shadow-card-hover backdrop-blur sm:p-5"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
						<MapPin class="size-3.5" />
						{selectedPetition.municipalityName}
					</div>
					<button
						type="button"
						onclick={closeSelection}
						class="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
						aria-label="Cerrar ficha"
					>
						<X class="size-4" />
					</button>
				</div>
				<h2 class="mt-1 font-display text-lg leading-snug font-semibold text-ink-900">
					{selectedPetition.title}
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-600">{selectedPetition.requestText}</p>
				<div class="mt-3 rounded-2xl border border-ink-100 bg-ink-50 p-3">
					<p class="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Dirigida a</p>
					<p class="mt-0.5 text-sm font-medium text-ink-800">{selectedPetition.targetName}</p>
				</div>
				<div class="mt-4 flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<Users class="size-5 text-brand-700" />
						<div>
							<p class="font-display text-xl leading-none font-semibold text-ink-900">
								{numberFormatter.format(selectedPetition.supportCount)}
							</p>
							<p class="mt-0.5 text-[11px] text-ink-400">apoyos ciudadanos</p>
						</div>
					</div>
					<button
						type="button"
						disabled={signingId === selectedPetition.id || selectedPetition.status !== 'open'}
						onclick={() => selectedPetition && toggleSupport(selectedPetition)}
						class="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 {selectedPetition.isSupportedByMe
							? 'bg-brand-100 text-brand-800 hover:bg-brand-200'
							: 'bg-brand-700 text-white hover:bg-brand-800'}"
					>
						{#if signingId === selectedPetition.id}
							<RefreshCw class="size-4 animate-spin" /> Guardando
						{:else if selectedPetition.isSupportedByMe}
							<CheckCircle2 class="size-4" /> Firmado
						{:else}
							<FileSignature class="size-4" /> Firmar
						{/if}
					</button>
				</div>

				{#if consentPetitionId === selectedPetition.id && !selectedPetition.isSupportedByMe}
					<div class="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
						<div class="flex items-start justify-between gap-3">
							<p class="text-xs font-semibold text-brand-900">Confirmar apoyo</p>
							<button
								type="button"
								onclick={() => {
									consentPetitionId = null;
									supportConsentChecked = false;
								}}
								class="rounded-full p-1 text-ink-400 hover:bg-white hover:text-ink-700"
								aria-label="Cancelar"
							>
								<X class="size-4" />
							</button>
						</div>
						<label
							class="mt-2 flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-ink-600"
						>
							<input
								type="checkbox"
								bind:checked={supportConsentChecked}
								class="mt-0.5 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
							/>
							<span>
								Doy mi <strong class="font-semibold text-ink-800">consentimiento explícito</strong>
								para que CONVOCA vincule internamente este apoyo a mi cuenta con el fin de impedir duplicados,
								permitirme retirarlo y mostrar únicamente el recuento agregado. Según el tema, el apoyo
								puede revelar información especialmente sensible, incluida una opinión política. Mi identidad
								no se publica. Puedo retirar el apoyo en cualquier momento.
								<a href="/legal/privacidad" class="font-semibold text-brand-700 hover:underline"
									>Privacidad</a
								>.
							</span>
						</label>
						<button
							type="button"
							disabled={!supportConsentChecked || signingId === selectedPetition.id}
							onclick={() => selectedPetition && confirmSupport(selectedPetition)}
							class="mt-3 w-full rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Confirmar apoyo
						</button>
					</div>
				{/if}

				{#if signingError}
					<p class="mt-2 text-xs font-medium text-critical-700">{signingError}</p>
				{/if}
				<p class="mt-3 text-[11px] leading-relaxed text-ink-400">
					Este apoyo pertenece a CONVOCA y no equivale por sí solo a una firma jurídica para una ILP
					u otro procedimiento oficial.
				</p>

				<div class="mt-3 border-t border-ink-100 pt-3">
					<button
						type="button"
						onclick={() => selectedPetition && openReport(selectedPetition)}
						class="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-400 hover:text-critical-700"
					>
						<Flag class="size-3.5" /> Reportar esta recogida
					</button>
					{#if reportMessage && reportMessagePetitionId === selectedPetition.id}
						<p class="mt-2 text-xs font-medium text-brand-700">{reportMessage}</p>
					{/if}
				</div>

				{#if reportingPetitionId === selectedPetition.id}
					<div class="mt-3 rounded-2xl border border-ink-200 bg-white p-3.5 shadow-sm">
						<div class="flex items-center justify-between gap-2">
							<p class="text-xs font-semibold text-ink-800">Reportar a moderación</p>
							<button
								type="button"
								onclick={() => {
									reportingPetitionId = null;
									reportError = null;
								}}
								class="rounded-full p-1 text-ink-400 hover:bg-ink-50"
								aria-label="Cerrar reporte"><X class="size-4" /></button
							>
						</div>
						<select
							bind:value={reportReason}
							class="mt-2 w-full rounded-xl border-ink-200 text-xs focus:border-brand-500 focus:ring-brand-500"
						>
							<option value="spam">Spam o duplicado abusivo</option>
							<option value="abuse">Insultos, acoso o abuso</option>
							<option value="personal_data">Datos personales expuestos</option>
							<option value="misleading">Información engañosa</option>
							<option value="illegal">Contenido potencialmente ilegal</option>
							<option value="other">Otro motivo</option>
						</select>
						<textarea
							bind:value={reportDetails}
							maxlength="1000"
							rows="3"
							placeholder="Detalle opcional (mínimo 3 caracteres si lo completas)"
							class="mt-2 w-full rounded-xl border-ink-200 text-xs focus:border-brand-500 focus:ring-brand-500"
						></textarea>
						{#if reportError}<p class="mt-1.5 text-xs font-medium text-critical-700">
								{reportError}
							</p>{/if}
						<button
							type="button"
							disabled={reportSubmitting ||
								(reportDetails.trim().length > 0 && reportDetails.trim().length < 3)}
							onclick={() => selectedPetition && submitReport(selectedPetition)}
							class="mt-2 w-full rounded-full bg-ink-800 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
						>
							{reportSubmitting ? 'Enviando…' : 'Enviar reporte'}
						</button>
					</div>
				{/if}
			</article>
		{/if}
	</div>
	<p class="mt-2 text-right text-[10px] text-ink-400">
		Ubicación municipal verificada con datos/servicios de
		<a
			href="https://www.cartociudad.es"
			target="_blank"
			rel="noopener noreferrer"
			class="font-medium hover:text-brand-700 hover:underline">CartoCiudad · CNIG/IGN</a
		>.
	</p>

	<section class="mt-8">
		<div class="mb-3 flex items-end justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">
					{mode === 'issues' ? 'Muro ciudadano' : 'Recogidas abiertas'}
				</p>
				<h2 class="mt-0.5 font-display text-xl font-semibold text-ink-900">
					{mode === 'issues' ? 'Últimos problemas documentados' : 'Firmas que se están moviendo'}
				</h2>
			</div>
			<p class="hidden text-xs text-ink-400 sm:block">
				Todo lo publicado permanece accesible aunque el mapa crezca.
			</p>
		</div>

		{#if mode === 'issues'}
			{#if issues.length > 0}
				<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{#each issues.slice(0, 9) as issue (issue.id)}
						<button
							type="button"
							onclick={() => chooseIssue(issue)}
							class="group rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
									><MapPin class="size-3.5" /> {issue.municipalityName}</span
								>
								<span
									class="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-500"
									>{issueStatusLabel[issue.status]}</span
								>
							</div>
							<h3
								class="mt-2 font-display text-base leading-snug font-semibold text-ink-900 group-hover:text-brand-800"
							>
								{issue.title}
							</h3>
							<p class="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-600">
								{issue.summary}
							</p>
							<div class="mt-3 flex items-center gap-3 text-[11px] text-ink-400">
								<span
									>{issue.sources.length} {issue.sources.length === 1 ? 'fuente' : 'fuentes'}</span
								>
								{#if issue.suggestions.length > 0}<span class="inline-flex items-center gap-1"
										><Bot class="size-3" /> {issue.suggestions.length} posibles vías</span
									>{/if}
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<div
					class="rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-10 text-center text-sm text-ink-500"
				>
					El radar todavía no ha publicado problemas verificados.
				</div>
			{/if}
		{:else}
			{#if petitions.length > 0}
				<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{#each petitions.slice(0, 9) as petition (petition.id)}
						<button
							type="button"
							onclick={() => choosePetition(petition)}
							class="group rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
									><MapPin class="size-3.5" /> {petition.municipalityName}</span
								>
								<span
									class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700"
									><Users class="size-3" /> {numberFormatter.format(petition.supportCount)}</span
								>
							</div>
							<h3
								class="mt-2 font-display text-base leading-snug font-semibold text-ink-900 group-hover:text-brand-800"
							>
								{petition.title}
							</h3>
							<p class="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-600">
								{petition.requestText}
							</p>
							<p class="mt-3 text-[11px] text-ink-400">Dirigida a {petition.targetName}</p>
						</button>
					{/each}
				</div>
			{:else}
				<div
					class="rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-10 text-center text-sm text-ink-500"
				>
					Todavía no hay recogidas abiertas. Cualquier ciudadano puede abrir la primera.
				</div>
			{/if}
		{/if}
	</section>

	<section class="mt-6 grid gap-4 lg:grid-cols-3">
		<div class="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
			<Radar class="size-5 text-brand-700" />
			<h2 class="mt-2 font-display text-base font-semibold text-ink-900">1. Detectar</h2>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				CONVOCA documenta problemas municipales procedentes de vecinos, fuentes públicas y el radar
				diario.
			</p>
		</div>
		<div class="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
			<ShieldCheck class="size-5 text-brand-700" />
			<h2 class="mt-2 font-display text-base font-semibold text-ink-900">2. Comprobar</h2>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				Un hallazgo del agente no se publica automáticamente: se conservan fuente, evidencia y
				administración competente.
			</p>
		</div>
		<div class="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
			<FileSignature class="size-5 text-brand-700" />
			<h2 class="mt-2 font-display text-base font-semibold text-ink-900">3. Movilizar</h2>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				Cualquier ciudadano puede abrir una recogida local y los apoyos hacen que ese municipio
				brille con más fuerza.
			</p>
		</div>
	</section>
</div>
