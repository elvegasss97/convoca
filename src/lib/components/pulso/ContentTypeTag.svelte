<script lang="ts">
	import { BadgeCheck, Activity, Users, FileEdit } from '@lucide/svelte';

	/**
	 * Distingue visualmente los cuatro tipos de contenido de un tema, tal
	 * como exige el encargo: dato/fuente comprobable, resultado real de
	 * Pulso, propuesta de un usuario, y borrador elaborado por Convoca.
	 */
	interface Props {
		type: 'dato' | 'pulso' | 'ciudadana' | 'convoca';
		class?: string;
	}

	let { type, class: className = '' }: Props = $props();

	const config = {
		dato: { label: 'Dato verificado', icon: BadgeCheck, classes: 'bg-ink-100 text-ink-700' },
		pulso: { label: 'Resultado de Pulso', icon: Activity, classes: 'bg-brand-100 text-brand-800' },
		ciudadana: {
			label: 'Propuesta ciudadana',
			icon: Users,
			classes: 'bg-accent-100 text-accent-800'
		},
		convoca: {
			label: 'Borrador Convoca',
			icon: FileEdit,
			classes: 'bg-warning-100 text-warning-700'
		}
	} as const;

	const item = $derived(config[type]);
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {item.classes} {className}"
>
	<item.icon class="size-3.5" strokeWidth={2.25} />
	{item.label}
</span>
