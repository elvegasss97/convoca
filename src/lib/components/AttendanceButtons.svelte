<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, Star } from '@lucide/svelte';
	import type { AttendanceCounts, AttendanceKind } from '$lib/types';
	import { getMyAttendance, setMyAttendance } from '$lib/services/attendanceService';

	interface Props {
		eventId: string;
		attendance: AttendanceCounts;
		disabled?: boolean;
	}

	// eslint-disable-next-line no-useless-assignment -- $bindable() default is read via the template/parent binding, not a dead write.
	let { eventId, attendance = $bindable(), disabled = false }: Props = $props();

	let mine = $state<AttendanceKind | null>(null);
	let pending = $state(false);

	onMount(async () => {
		mine = await getMyAttendance(eventId);
	});

	async function choose(kind: AttendanceKind) {
		if (disabled || pending) return;
		pending = true;
		const next = mine === kind ? null : kind;
		try {
			attendance = await setMyAttendance(eventId, next);
			mine = next;
		} finally {
			pending = false;
		}
	}
</script>

<div class="flex gap-2">
	<button
		type="button"
		{disabled}
		onclick={() => choose('going')}
		class="flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 {mine ===
		'going'
			? 'border-brand-700 bg-brand-700 text-white shadow-sm'
			: 'border-brand-200 bg-white text-brand-800 hover:bg-brand-50'}"
	>
		<Check class="size-4" strokeWidth={2.5} />
		Voy
	</button>
	<button
		type="button"
		{disabled}
		onclick={() => choose('interested')}
		class="flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 {mine ===
		'interested'
			? 'border-accent-500 bg-accent-500 text-white shadow-sm'
			: 'border-accent-200 bg-white text-accent-700 hover:bg-accent-50'}"
	>
		<Star class="size-4" strokeWidth={2.5} />
		Me interesa
	</button>
</div>
{#if disabled}
	<p class="mt-2 text-xs text-ink-400">
		Esta convocatoria ya no admite confirmaciones de asistencia.
	</p>
{/if}
