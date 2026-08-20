<script lang="ts">
	import { ArrowLeft, Radar } from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import RadarMunicipalModerationPanel from '$lib/components/moderacion/RadarMunicipalModerationPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let items = $state(data.items);
</script>

<Seo
	title="Radar municipal — Centro de Operaciones"
	description="Cola interna de revisión municipal."
	noindex
/>

<div class="min-h-dvh bg-ink-50">
	<header class="border-b border-ink-100 bg-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"
				>
					<Radar class="size-5" />
				</div>
				<div class="min-w-0">
					<p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">
						Centro de Operaciones
					</p>
					<h1 class="truncate font-display text-xl font-semibold text-ink-900">Radar municipal</h1>
				</div>
			</div>
			<a
				href="/moderacion"
				class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50"
			>
				<ArrowLeft class="size-4" /> Volver
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
		<RadarMunicipalModerationPanel bind:items />
	</main>
</div>
