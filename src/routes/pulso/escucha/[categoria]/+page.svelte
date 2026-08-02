<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Megaphone, Users, Lightbulb, Check } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { ConcernLevel, ConcernScopeType } from '$lib/types';
	import { concernCategoryLabels } from '$lib/labels';
	import Seo from '$lib/components/Seo.svelte';
	import ConcernCard from '$lib/components/pulso/ConcernCard.svelte';
	import ConcernCategoryGlyph from '$lib/components/pulso/ConcernCategoryGlyph.svelte';
	import ProposeConcernDialog from '$lib/components/pulso/ProposeConcernDialog.svelte';
	import TerritoryPicker from '$lib/components/pulso/TerritoryPicker.svelte';
	import { getMyConcernResponses } from '$lib/services/concernsService';
	import { authState } from '$lib/auth/session.svelte';

	let { data }: { data: PageData } = $props();

	const numberFormatter = new Intl.NumberFormat('es-ES');
	const categoryLabel = $derived(concernCategoryLabels[data.category]);
	// Nombre desnudo en minúscula, para el título ("Escucha abierta sobre
	// vivienda"): sin artículo, tal como lo especifica el encargo.
	const bareTopicName = $derived(categoryLabel.toLowerCase());

	// Artículo correcto por tema, para que la introducción del párrafo se
	// lea con naturalidad en cualquier tema, no solo en vivienda.
	const ARTICLE_BY_CATEGORY: Record<string, string> = {
		vivienda: 'la vivienda',
		sanidad: 'la sanidad',
		empleo: 'el empleo',
		educacion: 'la educación',
		seguridad: 'la seguridad',
		coste_vida: 'el coste de vida',
		transporte: 'el transporte',
		medioambiente: 'el medioambiente'
	};
	const topicPhrase = $derived(ARTICLE_BY_CATEGORY[data.category] ?? bareTopicName);
	// Título de la propuesta relacionada: el nombre del documento/plan si
	// existe (p. ej. "Plan Vivienda 2036"), nunca solo el título corto.
	const relatedTopicTitle = $derived(data.relatedTopic?.documentTitle || data.relatedTopic?.title);

	let scopeType = $state<ConcernScopeType>(data.scope.type);
	let scopeValue = $state<string | undefined>(data.scope.value);

	let myResponses = $state<Map<string, ConcernLevel>>(new Map());
	$effect(() => {
		const ids = data.concerns.map((c) => c.id);
		if (authState.session && ids.length > 0) {
			getMyConcernResponses(ids).then((m) => (myResponses = m));
		} else {
			myResponses = new Map();
		}
	});

	function applyScope() {
		const url = new URL(page.url);
		if (scopeType === 'nacional') {
			url.searchParams.delete('ambito');
			url.searchParams.delete('valor');
		} else {
			url.searchParams.set('ambito', scopeType);
			if (scopeValue) url.searchParams.set('valor', scopeValue);
		}
		goto(url, { keepFocus: true });
	}

	let proposeOpen = $state(false);

	const STAGES = [
		{ id: 'escucha', label: 'Escucha abierta', done: true, active: true },
		{ id: 'diagnostico', label: 'Diagnóstico', done: false, active: false },
		{ id: 'respuesta', label: 'Respuesta de Convoca', done: false, active: false },
		{ id: 'propuestas', label: 'Propuestas', done: false, active: false }
	];
</script>

<Seo
	title={`Escucha abierta sobre ${bareTopicName} — Pulso ciudadano`}
	description={`¿Qué dificultades relacionadas con ${topicPhrase} deberían abordarse primero? Prioriza tus preocupaciones y ayuda a Convoca a comprender el problema.`}
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
	<a
		href="/pulso/escucha"
		class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
	>
		<ArrowLeft class="size-4" /> Volver a Escucha ciudadana
	</a>

	<!-- Recorrido temático -->
	<nav aria-label="Recorrido de este tema" class="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
		{#each STAGES as stage, i (stage.id)}
			<span
				class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium {stage.active
					? 'border-brand-600 bg-brand-50 text-brand-800'
					: 'border-dashed border-ink-200 text-ink-400'}"
			>
				{#if stage.done}<Check class="size-3.5" />{:else}<span
						class="flex size-3.5 items-center justify-center text-[10px]">{i + 1}</span
					>{/if}
				{stage.label}
			</span>
		{/each}
	</nav>

	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<ConcernCategoryGlyph category={data.category} class="size-6 text-brand-700" />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Escucha abierta sobre {bareTopicName}
			</h1>
		</div>
		<p class="mt-1.5 max-w-2xl text-sm text-ink-600 sm:text-base">
			¿Qué dificultades relacionadas con {topicPhrase} deberían abordarse primero? Prioriza tus preocupaciones,
			explica cómo las percibes y señala aquello que Convoca todavía no está viendo.
		</p>

		{#if data.relatedTopic}
			<a
				href={`/pulso/soluciones/${data.relatedTopic.slug}`}
				class="mt-3 flex w-fit items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-3.5 py-2 text-sm font-medium text-brand-700 shadow-card hover:border-brand-200 hover:bg-brand-50"
			>
				<Lightbulb class="size-4" /> Consultar la propuesta de Convoca: {relatedTopicTitle}
			</a>
		{/if}

		{#if data.participantCount > 0}
			<div
				class="mt-3 inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
			>
				<Users class="size-4 text-brand-600" />
				<span class="text-sm">
					<strong class="font-semibold text-ink-900"
						>{numberFormatter.format(data.participantCount)}</strong
					>
					{data.participantCount === 1 ? 'persona ha participado' : 'personas han participado'} en Pulso
					ciudadano
				</span>
			</div>
		{/if}

		<div class="mt-4 flex flex-wrap items-end gap-3">
			<div>
				<p class="mb-1 text-xs font-medium text-ink-500">Ámbito</p>
				<TerritoryPicker bind:scopeType bind:scopeValue idPrefix="escucha-territory" />
			</div>
			<button
				type="button"
				onclick={applyScope}
				class="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
			>
				Consultar
			</button>
			<button
				type="button"
				onclick={() => (proposeOpen = true)}
				class="ml-auto flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
			>
				<Megaphone class="size-4" strokeWidth={2.25} />
				Proponer una preocupación
			</button>
		</div>
	</section>

	{#if data.concerns.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.concerns as concern (concern.id)}
				<ConcernCard
					{concern}
					results={data.results.get(concern.id) ?? {
						concernId: concern.id,
						counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
						totalResponses: 0
					}}
					myLevel={myResponses.get(concern.id)}
					relatedEventsCount={data.relatedCounts.get(concern.id) ?? 0}
				/>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
			<p class="text-sm font-medium text-ink-700">
				Todavía no hay preocupaciones sobre {topicPhrase} en este ámbito.
			</p>
			<p class="mt-1 text-sm text-ink-500">
				Prueba a consultar "Toda España" o propón tú la primera.
			</p>
		</div>
	{/if}

	<p class="mt-8 text-xs leading-relaxed text-ink-400">
		Estos resultados reflejan las respuestas de participantes de Convoca y no constituyen una
		encuesta representativa de toda la población.
	</p>
</div>

<ProposeConcernDialog bind:open={proposeOpen} onClose={() => {}} />
