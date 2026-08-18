<script lang="ts">
	import { ArrowLeft, MessageCircleHeart } from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import VozAbiertaFlow from '$lib/components/pulso/VozAbiertaFlow.svelte';
</script>

<Seo
	title="Voz abierta — Escucha ciudadana"
	description="Hay problemas que no caben en una lista. Cuéntanos con tus propias palabras qué está pasando, dónde ocurre y por qué importa — sin elegir un tema ni casillas predefinidas."
/>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-16 sm:px-6">
	<a
		href="/pulso/escucha"
		class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
	>
		<ArrowLeft class="size-4" /> Volver a Escucha ciudadana
	</a>

	<section class="mb-6 border-b border-ink-100 pb-6">
		<div class="flex items-center gap-2">
			<MessageCircleHeart class="size-6 text-brand-700" strokeWidth={2.25} />
			<h1 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Voz abierta</h1>
		</div>
		<p class="mt-1.5 max-w-2xl text-sm text-ink-600 sm:text-base">
			Hay cosas que no caben en una encuesta. Este espacio es para contarlas con tus palabras, sin
			elegir un tema ni encajar tu experiencia en respuestas predefinidas.
		</p>
	</section>

	<VozAbiertaFlow />
</div>
