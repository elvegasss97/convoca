<script lang="ts">
	import {
		Users,
		Megaphone,
		Footprints,
		HeartHandshake,
		MessagesSquare,
		Flag,
		Sparkles
	} from '@lucide/svelte';
	import type { EventCategory } from '$lib/types';

	interface Props {
		category: EventCategory;
		class?: string;
	}

	let { category, class: className = '' }: Props = $props();

	const icons: Record<EventCategory, typeof Users> = {
		concentracion: Users,
		manifestacion: Megaphone,
		marcha: Footprints,
		accion_solidaria: HeartHandshake,
		asamblea: MessagesSquare,
		jornada_reivindicativa: Flag,
		otro: Sparkles
	};

	const Icon = $derived(icons[category]);
</script>

<Icon class={className} strokeWidth={2} />
