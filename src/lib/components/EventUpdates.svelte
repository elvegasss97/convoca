<script lang="ts">
	import { MessageSquareText, AlertTriangle } from '@lucide/svelte';
	import type { EventUpdate } from '$lib/types';
	import { formatRelativeTime } from '$lib/utils/date';

	interface Props {
		updates: EventUpdate[];
	}

	let { updates }: Props = $props();
</script>

{#if updates.length > 0}
	<div class="space-y-3">
		{#each updates as update (update.id)}
			<div
				class="rounded-2xl border px-4 py-3 {update.isCritical
					? 'border-warning-300 bg-warning-50'
					: 'border-ink-100 bg-white'}"
			>
				<div
					class="flex items-center gap-1.5 text-xs font-medium {update.isCritical
						? 'text-warning-700'
						: 'text-ink-400'}"
				>
					{#if update.isCritical}
						<AlertTriangle class="size-3.5" />
					{:else}
						<MessageSquareText class="size-3.5" />
					{/if}
					{formatRelativeTime(update.createdAt)}
				</div>
				<p class="mt-1 font-display text-sm font-semibold text-ink-900">{update.title}</p>
				<p class="mt-0.5 text-sm leading-relaxed text-ink-600">{update.body}</p>
			</div>
		{/each}
	</div>
{:else}
	<p class="text-sm text-ink-400">El organizador todavía no ha publicado actualizaciones.</p>
{/if}
