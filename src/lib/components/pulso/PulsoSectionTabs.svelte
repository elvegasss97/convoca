<script lang="ts">
	import { Ear, FileEdit, Landmark, MapPinned } from '@lucide/svelte';

	interface Props {
		active: 'escucha' | 'propuestas' | 'municipal' | 'gasto';
	}

	let { active }: Props = $props();
</script>

<div
	class="inline-flex max-w-full flex-wrap rounded-2xl border border-ink-200 bg-white p-1 shadow-sm sm:rounded-full"
>
	<a
		href="/pulso/escucha"
		aria-current={active === 'escucha' ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {active ===
		'escucha'
			? 'bg-brand-700 text-white'
			: 'text-ink-600 hover:bg-ink-50'}"
	>
		<Ear class="size-4" /> Escucha ciudadana
	</a>
	<a
		href="/pulso/soluciones"
		aria-current={active === 'propuestas' ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {active ===
		'propuestas'
			? 'bg-brand-700 text-white'
			: 'text-ink-600 hover:bg-ink-50'}"
	>
		<FileEdit class="size-4" /> Propuestas
	</a>
	<a
		href="/pulso/municipal"
		aria-current={active === 'municipal' ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {active ===
		'municipal'
			? 'bg-brand-700 text-white'
			: 'text-ink-600 hover:bg-ink-50'}"
	>
		<MapPinned class="size-4" /> Muro municipal
	</a>
	<a
		href="/pulso/gasto-publico"
		aria-current={active === 'gasto' ? 'page' : undefined}
		class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition {active ===
		'gasto'
			? 'bg-brand-700 text-white'
			: 'text-ink-600 hover:bg-ink-50'}"
	>
		<Landmark class="size-4" /> Gasto público
	</a>
</div>
