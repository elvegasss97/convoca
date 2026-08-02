<script lang="ts">
	import {
		Home,
		HeartPulse,
		Briefcase,
		GraduationCap,
		ShieldAlert,
		Coins,
		Bus,
		Leaf
	} from '@lucide/svelte';
	import type { ConcernCategory } from '$lib/types';

	interface Props {
		category: ConcernCategory;
		class?: string;
	}

	let { category, class: className = '' }: Props = $props();

	const icons: Record<ConcernCategory, typeof Home> = {
		vivienda: Home,
		sanidad: HeartPulse,
		empleo: Briefcase,
		educacion: GraduationCap,
		seguridad: ShieldAlert,
		coste_vida: Coins,
		transporte: Bus,
		medioambiente: Leaf
	};

	const Icon = $derived(icons[category]);
</script>

<Icon class={className} strokeWidth={2} />
