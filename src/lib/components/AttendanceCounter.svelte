<script lang="ts">
	import { Users, Star } from '@lucide/svelte';
	import type { AttendanceCounts } from '$lib/types';

	interface Props {
		attendance: AttendanceCounts;
		variant?: 'compact' | 'full';
	}

	let { attendance, variant = 'compact' }: Props = $props();

	function formatCount(n: number): string {
		if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
		return `${n}`;
	}
</script>

{#if variant === 'compact'}
	<div class="flex items-center gap-3 text-xs text-ink-600">
		<span class="flex items-center gap-1">
			<Users class="size-3.5 text-brand-600" />
			<strong class="font-semibold text-ink-800">{formatCount(attendance.going)}</strong> voy
		</span>
		<span class="flex items-center gap-1">
			<Star class="size-3.5 text-accent-500" />
			<strong class="font-semibold text-ink-800">{formatCount(attendance.interested)}</strong> interés
		</span>
	</div>
{:else}
	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
			<div class="flex items-center gap-1.5 text-brand-700">
				<Users class="size-4" strokeWidth={2.25} />
				<span class="text-xs font-medium">Voy</span>
			</div>
			<p class="mt-1 font-display text-2xl font-semibold text-brand-900">
				{formatCount(attendance.going)}
			</p>
		</div>
		<div class="rounded-2xl border border-accent-100 bg-accent-50 px-4 py-3">
			<div class="flex items-center gap-1.5 text-accent-600">
				<Star class="size-4" strokeWidth={2.25} />
				<span class="text-xs font-medium">Me interesa</span>
			</div>
			<p class="mt-1 font-display text-2xl font-semibold text-accent-800">
				{formatCount(attendance.interested)}
			</p>
		</div>
		<p class="col-span-2 text-xs text-ink-400">
			Cifras estimadas a partir de confirmaciones anónimas, no un censo de asistentes.
		</p>
	</div>
{/if}
