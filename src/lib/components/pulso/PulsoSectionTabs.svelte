<script lang="ts">
	import { Ear, FileEdit } from '@lucide/svelte';

	interface Props {
		active: 'escucha' | 'propuestas';
	}

	let { active }: Props = $props();
</script>

<div class="inline-flex rounded-full border border-ink-200 bg-white p-1 shadow-sm">
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
		<FileEdit class="size-4" /> Propuestas de Convoca
	</a>
</div>
