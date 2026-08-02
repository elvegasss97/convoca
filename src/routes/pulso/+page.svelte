<script lang="ts">
	import { Activity, Ear, FileEdit, ArrowRight, Users } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';

	let { data }: { data: PageData } = $props();

	const numberFormatter = new Intl.NumberFormat('es-ES');
	const featuredTopic = $derived(data.topics[0]);
	// El nombre del documento/plan (p. ej. "Plan Vivienda 2036") identifica
	// mejor la propuesta que el título corto del tema ("Vivienda").
	const featuredTopicTitle = $derived(featuredTopic?.documentTitle || featuredTopic?.title);
</script>

<Seo
	title="Pulso ciudadano"
	description="El espacio donde Convoca escucha qué está fallando, investiga los problemas y presenta propuestas que la ciudadanía puede revisar."
/>

<div class="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6">
	<section class="mb-8 border-b border-ink-100 pb-6 text-center sm:text-left">
		<div class="flex items-center justify-center gap-2 sm:justify-start">
			<Activity class="size-6 text-brand-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Pulso ciudadano</h1>
		</div>
		<p class="mx-auto mt-1.5 max-w-2xl text-sm text-ink-600 sm:mx-0 sm:text-base">
			El espacio donde Convoca escucha qué está fallando, investiga los problemas y presenta
			propuestas que la ciudadanía puede revisar.
		</p>
		{#if data.participantCount > 0}
			<div
				class="mx-auto mt-3 inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 shadow-card sm:mx-0"
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
	</section>

	<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
		<a
			href="/pulso/escucha"
			class="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6"
		>
			<span
				class="flex size-11 items-center justify-center rounded-full bg-brand-100 text-brand-700"
			>
				<Ear class="size-5" strokeWidth={2.25} />
			</span>
			<h2 class="font-display text-lg font-semibold text-ink-900">Escucha ciudadana</h2>
			<p class="text-sm leading-relaxed text-ink-600">
				La ciudadanía identifica qué está fallando, prioriza sus preocupaciones y aporta
				experiencias para ayudar a comprender los problemas.
			</p>
			<p
				class="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:underline"
			>
				Participar en la escucha <ArrowRight class="size-3.5" />
			</p>
		</a>

		<a
			href="/pulso/soluciones"
			class="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6"
		>
			<span
				class="flex size-11 items-center justify-center rounded-full bg-accent-100 text-accent-700"
			>
				<FileEdit class="size-5" strokeWidth={2.25} />
			</span>
			<h2 class="font-display text-lg font-semibold text-ink-900">Propuestas de Convoca</h2>
			<p class="text-sm leading-relaxed text-ink-600">
				Convoca investiga los problemas y presenta propuestas concretas para que la ciudadanía pueda
				apoyarlas, rechazarlas o mejorarlas.
			</p>
			{#if featuredTopic}
				<p class="text-xs text-ink-500">
					Disponible ahora: <strong class="font-semibold text-ink-700">{featuredTopicTitle}</strong>
				</p>
			{/if}
			<p
				class="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:underline"
			>
				Consultar y revisar la propuesta <ArrowRight class="size-3.5" />
			</p>
		</a>
	</div>

	<p class="mt-8 text-center text-xs leading-relaxed text-ink-400 sm:text-left">
		Escucha ciudadana y Propuestas de Convoca forman parte del mismo recorrido: la ciudadanía
		señala, Convoca investiga y propone, la ciudadanía revisa, Convoca mejora.
	</p>
</div>
