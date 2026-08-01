<script lang="ts">
	import { page } from '$app/state';
	import { Search, Home, MapIcon } from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';

	const isNotFound = $derived(page.status === 404);
</script>

<Seo
	title={isNotFound ? 'Página no encontrada' : 'Ha ocurrido un error'}
	description={isNotFound
		? 'La página que buscas no existe o ha sido eliminada. Explora las convocatorias activas en Convoca.'
		: 'Ha ocurrido un error inesperado en Convoca.'}
	noindex
/>

<div class="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
	<p class="font-display text-6xl font-bold text-brand-200">{page.status}</p>
	<h1 class="mt-3 font-display text-2xl font-semibold text-ink-900">
		{isNotFound ? 'No hemos encontrado esta página' : 'Ha ocurrido un error'}
	</h1>
	<p class="mt-2 text-sm text-ink-600">
		{isNotFound
			? 'El enlace puede estar roto o la convocatoria puede haberse eliminado o dejado de estar disponible. Prueba a explorar las convocatorias activas.'
			: (page.error?.message ?? 'Inténtalo de nuevo en unos minutos.')}
	</p>

	<div class="mt-6 flex flex-wrap justify-center gap-3">
		<a
			href="/"
			class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
		>
			<Home class="size-4" strokeWidth={2.25} />
			Volver al inicio
		</a>
		<a
			href="/?vista=mapa"
			class="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 shadow-sm transition hover:bg-ink-50"
		>
			<MapIcon class="size-4" strokeWidth={2.25} />
			Ver el mapa
		</a>
	</div>

	<a
		href="/#convocatorias"
		class="mt-8 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
	>
		<Search class="size-4" />
		Buscar convocatorias
	</a>
</div>
