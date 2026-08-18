<script lang="ts">
	import { Ear, ArrowRight, Users, MessageCircleHeart } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { concernCategoryLabels } from '$lib/labels';
	import Seo from '$lib/components/Seo.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import ConcernCategoryGlyph from '$lib/components/pulso/ConcernCategoryGlyph.svelte';

	let { data }: { data: PageData } = $props();

	const numberFormatter = new Intl.NumberFormat('es-ES');

	// Solo las categorías con una escucha propia ya construida tienen texto
	// dedicado; el resto sigue mostrando únicamente el nombre del tema, sin
	// cambios respecto a como ya se mostraban.
	const CARD_OVERRIDES: Partial<Record<string, { title: string; description: string }>> = {
		sanidad: {
			title: 'Escucha abierta sobre sanidad',
			description:
				'Cuéntanos qué está fallando, qué debería cambiar primero y qué falta en el Plan Sanidad 2036.'
		}
	};
</script>

<Seo
	title="Escucha ciudadana — Pulso ciudadano"
	description="La ciudadanía identifica qué está fallando, prioriza sus preocupaciones y aporta experiencias para ayudar a comprender los problemas, tema a tema."
/>

<div class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<Ear class="size-6 text-brand-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Escucha ciudadana
			</h1>
		</div>
		<p class="mt-1.5 max-w-2xl text-sm text-ink-600 sm:text-base">
			La ciudadanía identifica qué está fallando, prioriza sus preocupaciones y aporta experiencias
			para ayudar a comprender los problemas.
		</p>

		<div class="mt-4">
			<PulsoSectionTabs active="escucha" />
		</div>

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
	</section>

	<a
		href="/pulso/escucha/voz-abierta"
		class="group mb-6 flex flex-col gap-4 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between sm:p-6"
	>
		<div class="flex items-start gap-3.5">
			<span
				class="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
			>
				<MessageCircleHeart class="size-5" strokeWidth={2.25} />
			</span>
			<div>
				<p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">Voz abierta</p>
				<h2 class="mt-0.5 font-display text-lg font-semibold text-ink-900 sm:text-xl">
					Cuéntanos lo que no estamos viendo
				</h2>
				<p class="mt-1 max-w-xl text-sm leading-relaxed text-ink-600">
					Hay problemas que no caben en una lista. Explícanos con tus propias palabras qué está
					pasando, dónde ocurre y por qué importa.
				</p>
				<p class="mt-1 text-xs font-medium text-ink-400">Sin casillas ni temas predefinidos.</p>
			</div>
		</div>
		<span
			class="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white group-hover:bg-brand-800 sm:self-auto"
		>
			Contarlo con mis palabras <ArrowRight class="size-3.5" />
		</span>
	</a>

	{#if data.active.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.active as category (category)}
				{@const override = CARD_OVERRIDES[category]}
				<a
					href={`/pulso/escucha/${category}`}
					class="group flex flex-col gap-2.5 rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
				>
					<div class="flex items-center gap-2.5">
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
						>
							<ConcernCategoryGlyph {category} class="size-4.5" />
						</span>
						<h2 class="font-display text-base font-semibold text-ink-900">
							{override?.title ?? concernCategoryLabels[category]}
						</h2>
					</div>
					{#if override?.description}
						<p class="text-sm leading-relaxed text-ink-600">{override.description}</p>
					{/if}
					<p
						class="mt-auto flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:underline"
					>
						Participar en la escucha <ArrowRight class="size-3.5" />
					</p>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
			<p class="text-sm font-medium text-ink-700">Todavía no hay temas activos en la escucha.</p>
		</div>
	{/if}

	{#if data.upcoming.length > 0}
		<div class="mt-6">
			<p class="text-xs font-semibold tracking-wide text-ink-400 uppercase">Próximamente</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each data.upcoming as category (category)}
					<span
						class="flex items-center gap-1.5 rounded-full border border-dashed border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-400"
					>
						<ConcernCategoryGlyph {category} class="size-3.5" />
						{concernCategoryLabels[category]}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
