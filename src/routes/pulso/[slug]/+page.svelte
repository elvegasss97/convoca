<script lang="ts">
	import { page } from '$app/state';
	import {
		ArrowLeft,
		MapPin,
		CalendarClock,
		ShieldCheck,
		Share2,
		Loader2,
		CheckCircle2,
		LogIn,
		Link as LinkIcon
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { ConcernLevel } from '$lib/types';
	import { concernCategoryLabels, concernScopeTypeLabels, concernLevelLabels } from '$lib/labels';
	import { formatEventDate } from '$lib/utils/date';
	import Seo from '$lib/components/Seo.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import ConcernCategoryGlyph from '$lib/components/pulso/ConcernCategoryGlyph.svelte';
	import ConcernResultsChart from '$lib/components/pulso/ConcernResultsChart.svelte';
	import { getMyConcernResponses, setConcernResponse } from '$lib/services/concernsService';
	import { authState } from '$lib/auth/session.svelte';

	let { data }: { data: PageData } = $props();

	const concern = $derived(data.concern);
	const scopeLabel = $derived(
		concern.scope.type === 'nacional'
			? concernScopeTypeLabels.nacional
			: `${concernScopeTypeLabels[concern.scope.type]} · ${concern.scope.value}`
	);
	const isOpen = $derived(
		concern.status === 'published' &&
			new Date(concern.startsAt) <= new Date() &&
			(!concern.closesAt || new Date(concern.closesAt) > new Date())
	);

	// Copia local mutable: se actualiza de forma optimista al votar (sin
	// recargar la página) y se resincroniza si `data` cambia (navegación a
	// otra preocupación).
	// eslint-disable-next-line svelte/prefer-writable-derived -- necesitamos mutación local (contadores tras votar), no solo reemplazo del valor.
	let results = $state(data.results);
	$effect(() => {
		results = data.results;
	});

	let myLevel = $state<ConcernLevel | undefined>(undefined);
	$effect(() => {
		if (authState.session) {
			getMyConcernResponses([concern.id]).then((m) => {
				myLevel = m.get(concern.id);
			});
		} else {
			myLevel = undefined;
		}
	});

	// Los resultados se ocultan hasta votar o pulsar "Ver resultados", para
	// no condicionar la respuesta con el resultado ya visible (igual criterio
	// que una consulta seria, no una encuesta de redes sociales).
	let showResults = $state(false);
	$effect(() => {
		if (myLevel) showResults = true;
	});

	let voting = $state<ConcernLevel | null>(null);
	let voteError = $state<string | null>(null);
	let voteSuccess = $state(false);

	async function vote(level: ConcernLevel) {
		if (!authState.session) return;
		voting = level;
		voteError = null;
		try {
			await setConcernResponse(concern.id, level);
			const wasNewParticipant = myLevel === undefined;
			myLevel = level;
			voteSuccess = true;
			showResults = true;
			setTimeout(() => (voteSuccess = false), 2500);
			// Actualiza el recuento local: si cambia de opinión, se resta el
			// nivel anterior y se suma el nuevo (nunca suma un participante
			// nuevo); si es su primera respuesta, solo suma el nuevo nivel.
			const nextCounts = { ...results.counts };
			nextCounts[level] += 1;
			let totalResponses = results.totalResponses;
			if (wasNewParticipant) {
				totalResponses += 1;
			}
			results = { ...results, counts: nextCounts, totalResponses };
		} catch (err) {
			voteError = err instanceof Error ? err.message : 'No se ha podido guardar tu respuesta.';
		} finally {
			voting = null;
		}
	}

	let shareOpen = $state(false);

	const LEVELS: ConcernLevel[] = [1, 2, 3, 4, 5];
</script>

<Seo
	title={`${concern.question} — Pulso ciudadano`}
	description={`${concern.description || concern.question} Consulta los resultados reales entre participantes de Convoca.`}
/>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-24 sm:px-6 md:pb-10">
	<a
		href={`/pulso/escucha/${concern.category}`}
		class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
	>
		<ArrowLeft class="size-4" /> Volver a la escucha sobre {concernCategoryLabels[
			concern.category
		].toLowerCase()}
	</a>

	<div class="flex items-center gap-2">
		<span
			class="flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800"
		>
			<ConcernCategoryGlyph category={concern.category} class="size-3.5" />
			{concernCategoryLabels[concern.category]}
		</span>
		{#if !isOpen}
			<span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
				>Cerrada</span
			>
		{/if}
	</div>

	<h1 class="mt-2 font-display text-2xl leading-tight font-semibold text-ink-900 sm:text-3xl">
		{concern.question}
	</h1>
	{#if concern.description}
		<p class="mt-2 text-sm leading-relaxed text-ink-700">{concern.description}</p>
	{/if}

	<div
		class="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:grid-cols-3"
	>
		<div class="flex items-start gap-2">
			<MapPin class="mt-0.5 size-4 shrink-0 text-brand-600" />
			<span class="text-sm text-ink-700">{scopeLabel}</span>
		</div>
		<div class="flex items-start gap-2">
			<ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />
			<span class="text-sm text-ink-700">Publica: {concern.publisherLabel}</span>
		</div>
		<div class="flex items-start gap-2">
			<CalendarClock class="mt-0.5 size-4 shrink-0 text-brand-600" />
			<span class="text-sm text-ink-700">
				{isOpen
					? concern.closesAt
						? `Cierra el ${formatEventDate(concern.closesAt)}`
						: 'Activa'
					: 'Finalizada'}
			</span>
		</div>
	</div>

	<section class="mt-6 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
		<h2 class="font-display text-base font-semibold text-ink-900">Tu respuesta</h2>

		{#if !authState.session}
			<div
				class="mt-3 flex flex-col items-start gap-2.5 rounded-2xl border border-brand-100 bg-brand-50 p-4"
			>
				<p class="text-sm text-brand-900">
					Necesitas una cuenta para responder. Puedes consultar los resultados sin iniciar sesión.
				</p>
				<a
					href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
					class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
				>
					<LogIn class="size-4" /> Iniciar sesión o crear cuenta
				</a>
			</div>
		{:else if !isOpen}
			<p class="mt-2 text-sm text-ink-500">Esta preocupación ya no admite respuestas.</p>
		{:else}
			<p class="mt-1 text-sm text-ink-500">
				{myLevel
					? 'Puedes cambiar tu respuesta cuando quieras.'
					: 'Elige el nivel que mejor represente tu opinión.'}
			</p>
			<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
				{#each LEVELS as level (level)}
					<button
						type="button"
						disabled={voting !== null}
						onclick={() => vote(level)}
						aria-pressed={myLevel === level}
						class="flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition disabled:opacity-60 {myLevel ===
						level
							? 'border-brand-600 bg-brand-50 text-brand-800'
							: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
					>
						{#if voting === level}
							<Loader2 class="size-4 animate-spin" />
						{:else if myLevel === level}
							<CheckCircle2 class="size-4 text-brand-600" />
						{/if}
						{concernLevelLabels[level]}
					</button>
				{/each}
			</div>
			{#if voteError}
				<p class="text-critical-600 mt-2 text-sm" role="alert">{voteError}</p>
			{/if}
			{#if voteSuccess}
				<p class="mt-2 text-sm font-medium text-brand-700" role="status">
					Tu respuesta se ha guardado.
				</p>
			{/if}
		{/if}

		{#if !showResults}
			<button
				type="button"
				onclick={() => (showResults = true)}
				class="mt-4 text-sm font-semibold text-brand-700 hover:underline"
			>
				Ver resultados
			</button>
		{/if}
	</section>

	{#if showResults}
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<div class="flex items-start justify-between gap-3">
				<h2 class="font-display text-base font-semibold text-ink-900">Resultados</h2>
				<button
					type="button"
					onclick={() => (shareOpen = true)}
					class="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
				>
					<Share2 class="size-3.5" /> Compartir
				</button>
			</div>
			<ConcernResultsChart {results} />
			<p class="mt-3 text-xs text-ink-400">
				Ámbito: {scopeLabel} · Actualizado el {formatEventDate(concern.updatedAt)}
			</p>
			<p class="mt-3 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
				Estos resultados reflejan las respuestas de participantes de Convoca y no constituyen una
				encuesta representativa de toda la población.
			</p>
		</section>
	{/if}

	{#if data.relatedEvents.length > 0}
		<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
			<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
				<LinkIcon class="size-4 text-brand-700" /> Convocatorias relacionadas
			</h2>
			<ul class="mt-2.5 flex flex-col gap-2">
				{#each data.relatedEvents as event (event.id)}
					<li>
						<a
							href={`/convocatorias/${event.slug}`}
							class="block rounded-xl border border-ink-100 p-3 text-sm text-ink-800 transition hover:border-brand-300 hover:bg-brand-50"
						>
							<p class="font-medium">{event.title}</p>
							<p class="mt-0.5 text-xs text-ink-500">
								{formatEventDate(event.startAt)} · {event.meetingPoint.city}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<ShareDialog
	bind:open={shareOpen}
	onClose={() => (shareOpen = false)}
	title={`${concern.question} — Pulso ciudadano`}
	url={page.url.href}
	note="Estos resultados reflejan solo a participantes de Convoca, no a toda la población."
/>
