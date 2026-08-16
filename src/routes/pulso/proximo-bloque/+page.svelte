<script lang="ts">
	import { Vote } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';
	import NextBlockVoteFlow from '$lib/components/pulso/NextBlockVoteFlow.svelte';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title="Tú eliges el próximo bloque"
	description="La ciudadanía decide qué problema debe abordar Convoca después de vivienda, sanidad y Ceuta. La opción más apoyada abrirá primero una escucha ciudadana, no un plan cerrado."
/>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6">
	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<Vote class="size-6 text-accent-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Tú eliges el próximo bloque
			</h1>
		</div>
		<p class="mt-2 max-w-2xl text-sm text-ink-700 sm:text-base">
			Convoca ya ha empezado a trabajar sobre vivienda, sanidad y Ceuta. Ahora queremos que la ciudadanía
			decida qué problema debemos abordar después.
		</p>
		<p class="mt-2 max-w-2xl text-sm text-ink-600">
			La opción más apoyada será el próximo bloque de trabajo. Primero abriremos una escucha
			ciudadana para entender el problema y, a partir de ella, desarrollar propuestas abiertas al
			debate.
		</p>
	</section>

	<NextBlockVoteFlow
		round={data.round}
		myVote={data.myVote}
		total={data.total}
		results={data.results}
	/>
</div>
