<script lang="ts">
	import { FileEdit } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import TopicCard from '$lib/components/pulso/TopicCard.svelte';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title="Propuestas de Convoca — Pulso ciudadano"
	description="Convoca investiga los problemas y presenta propuestas concretas para que la ciudadanía pueda apoyarlas, rechazarlas o mejorarlas. Nunca contenido político inventado."
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<FileEdit class="size-6 text-brand-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Propuestas de Convoca
			</h1>
		</div>
		<p class="mt-1.5 max-w-2xl text-sm text-ink-600 sm:text-base">
			Convoca investiga los problemas y presenta propuestas concretas para que la ciudadanía pueda
			apoyarlas, rechazarlas o mejorarlas.
		</p>

		<div class="mt-4">
			<PulsoSectionTabs active="propuestas" />
		</div>
	</section>

	{#if data.topics.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.topics as topic (topic.id)}
				<TopicCard {topic} />
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
			<p class="text-sm font-medium text-ink-700">Todavía no hay propuestas publicadas.</p>
			<p class="mt-1 text-sm text-ink-500">
				Las propuestas de Convoca se preparan a partir de lo que señala la Escucha ciudadana. Vuelve
				pronto.
			</p>
		</div>
	{/if}
</div>
