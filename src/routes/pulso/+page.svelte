<script lang="ts">
	import { Activity, Ear, FileEdit, ArrowRight, Users, Vote, MapPinned } from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';

	let { data }: { data: PageData } = $props();

	const numberFormatter = new Intl.NumberFormat('es-ES');
	// Todas las propuestas publicadas, no solo la más reciente: con dos o
	// más temas publicados (p. ej. Vivienda y Sanidad), la portada debe
	// seguir mostrando acceso a todas, no solo a la última.
	const availableTopics = $derived(
		data.topics.map((t) => ({
			slug: t.slug,
			// El nombre del documento/plan (p. ej. "Plan Vivienda 2036")
			// identifica mejor la propuesta que el título corto del tema.
			title: t.documentTitle || t.title
		}))
	);
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

	<!-- Sección con importancia propia, no un tercer tile genérico dentro de
	     la rejilla de abajo: el encargo pide que se sienta como una decisión
	     real, distinta de "explorar lo ya publicado" (Escucha/Propuestas). -->
	<a
		href="/pulso/proximo-bloque"
		class="group mb-5 flex flex-col gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-5 sm:p-6"
	>
		<span
			class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700"
		>
			<Vote class="size-5" strokeWidth={2.25} />
		</span>
		<div class="flex-1">
			<span
				class="inline-block rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-800"
			>
				Decisión abierta
			</span>
			<h2 class="mt-1.5 font-display text-lg font-semibold text-ink-900">
				Elige el próximo bloque
			</h2>
			<p class="mt-1 text-sm leading-relaxed text-ink-600">
				Decide qué problema debe empezar a trabajar Convoca después de vivienda, sanidad y Ceuta.
			</p>
		</div>
		<p
			class="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-700 group-hover:underline"
		>
			Elegir el próximo bloque <ArrowRight class="size-3.5" />
		</p>
	</a>

	<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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

		<!-- No es un único <a> como la tarjeta de la izquierda: cuando hay
		     varias propuestas publicadas, cada nombre enlaza a la suya, y un
		     enlace anidado dentro de otro enlace no es HTML válido ni
		     accesible. -->
		<div
			class="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6"
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
			{#if availableTopics.length > 0}
				<p class="text-xs text-ink-500">
					{availableTopics.length === 1 ? 'Disponible ahora' : 'Disponibles ahora'}:
					{#each availableTopics as topic, i (topic.slug)}
						{#if i > 0}{i === availableTopics.length - 1 ? ' y ' : ', '}{/if}<a
							href={`/pulso/soluciones/${topic.slug}`}
							class="font-semibold text-ink-700 hover:text-brand-700 hover:underline"
							>{topic.title}</a
						>
					{/each}
				</p>
			{/if}
			<a
				href="/pulso/soluciones"
				class="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
			>
				Consultar y revisar la propuesta <ArrowRight class="size-3.5" />
			</a>
		</div>

		<a
			href="/pulso/municipal"
			class="group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6"
		>
			<span
				class="flex size-11 items-center justify-center rounded-full bg-brand-100 text-brand-700"
			>
				<MapPinned class="size-5" strokeWidth={2.25} />
			</span>
			<h2 class="font-display text-lg font-semibold text-ink-900">Muro municipal</h2>
			<p class="text-sm leading-relaxed text-ink-600">
				Un mapa vivo de problemas concretos de pueblos y ciudades, con fuentes, posibles vías y
				recogidas de apoyos abiertas por ciudadanos.
			</p>
			<p
				class="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:underline"
			>
				Explorar el mapa municipal <ArrowRight class="size-3.5" />
			</p>
		</a>
	</div>

	<p class="mt-8 text-center text-xs leading-relaxed text-ink-400 sm:text-left">
		Escucha ciudadana, Propuestas y Muro municipal forman parte del mismo recorrido: la ciudadanía
		señala, CONVOCA documenta y propone, la ciudadanía revisa y puede movilizar apoyos.
	</p>
</div>
