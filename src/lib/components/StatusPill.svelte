<script lang="ts">
	import type { EventStatus } from '$lib/types';
	import { statusLabels, statusTones } from '$lib/labels';

	interface Props {
		status: EventStatus;
	}

	let { status }: Props = $props();

	const toneClasses: Record<string, string> = {
		neutral: 'bg-ink-100 text-ink-600',
		positive: 'bg-brand-100 text-brand-800',
		warning: 'bg-warning-100 text-warning-700',
		critical: 'bg-critical-100 text-critical-700',
		muted: 'bg-ink-100 text-ink-400'
	};

	const classes = $derived(toneClasses[statusTones[status]]);
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold {classes}">
	{statusLabels[status]}
</span>
