<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Activity, Megaphone, Users } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { ConcernLevel, ConcernScopeType } from '$lib/types';
	import Seo from '$lib/components/Seo.svelte';
	import ConcernCard from '$lib/components/pulso/ConcernCard.svelte';
	import ProposeConcernDialog from '$lib/components/pulso/ProposeConcernDialog.svelte';
	import TerritoryPicker from '$lib/components/pulso/TerritoryPicker.svelte';
	import { getMyConcernResponses } from '$lib/services/concernsService';
	import { authState } from '$lib/auth/session.svelte';

	let { data }: { data: PageData } = $props();

	const numberFormatter = new Intl.NumberFormat('es-ES');

	let scopeType = $state<ConcernScopeType>(data.scope.type);
	let scopeValue = $state<string | undefined>(data.scope.value);

	// Se resuelve en el cliente, nunca en el `load` SSR: la sesión vive en
	// localStorage, inaccesible en servidor (ver comentario en
	// `concernsService.getMyConcernResponses`). Se reintenta cuando
	// `authState.session` cambia (login/logout) para que el estado "ya
	// respondida" se mantenga correcto sin recargar la página.
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
</script>

<Seo
	title="Pulso ciudadano"
	description="Descubre qué preocupa a la comunidad de Convoca y haz visible lo que necesita cambiar. Resultados reales entre participantes de la plataforma, nunca una encuesta representativa de España."
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<Activity class="size-6 text-brand-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Pulso ciudadano</h1>
		</div>
		<p class="mt-1.5 max-w-2xl text-sm text-ink-600 sm:text-base">
			Descubre qué preocupa a la comunidad y haz visible lo que necesita cambiar.
		</p>

		{#if data.participantCount > 0}
			<div
				class="mt-3 inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card"
			>
				<Users class="size-4 text-brand-600" />
				<span class="text-sm">
					<strong class="font-semibold text-ink-900"
						>{numberFormatter.format(data.participantCount)}</strong
					>
					{data.participantCount === 1 ? 'persona ha participado' : 'personas han participado'}
				</span>
			</div>
		{/if}

		<div class="mt-4 flex flex-wrap items-end gap-3">
			<div>
				<p class="mb-1 text-xs font-medium text-ink-500">Ámbito</p>
				<TerritoryPicker bind:scopeType bind:scopeValue idPrefix="pulso-territory" />
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
			<p class="text-sm font-medium text-ink-700">Todavía no hay preocupaciones en este ámbito.</p>
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
