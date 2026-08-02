<script lang="ts">
	import { Lightbulb, FileClock } from '@lucide/svelte';
	import type { Topic } from '$lib/types';
	import {
		concernCategoryLabels,
		topicStatusLabels,
		TOPIC_CATEGORY_PENDING_LABEL
	} from '$lib/labels';
	import { formatEventDate } from '$lib/utils/date';

	interface Props {
		topic: Topic;
		/** true en el panel de administración: muestra también borradores/archivados con su estado. */
		showStatus?: boolean;
		/** Override del destino (p. ej. el editor de administración en vez de la ficha pública). */
		href?: string;
	}

	let { topic, showStatus = false, href }: Props = $props();

	const categoryLabel = $derived(
		topic.category ? concernCategoryLabels[topic.category] : TOPIC_CATEGORY_PENDING_LABEL
	);
</script>

<a
	href={href ?? `/pulso/soluciones/${topic.slug}`}
	class="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
>
	<div class="bg-dot-grid flex items-center gap-2 bg-brand-800 px-4 py-3 text-white">
		<Lightbulb class="size-5 shrink-0 text-brand-100" />
		<p class="font-display text-sm leading-tight font-semibold">{categoryLabel}</p>
		{#if showStatus}
			<span
				class="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium"
			>
				<FileClock class="size-3.5" />
				{topicStatusLabels[topic.status]}
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-2.5 p-4">
		<div>
			<h3 class="font-display text-base leading-snug font-semibold text-ink-900">{topic.title}</h3>
			{#if topic.documentTitle}
				<p class="text-xs font-medium text-ink-500">{topic.documentTitle}</p>
			{/if}
		</div>
		{#if topic.summary}
			<p class="line-clamp-2 text-sm text-ink-600">{topic.summary}</p>
		{/if}
		<div class="mt-auto flex items-center justify-between pt-1 text-xs text-ink-400">
			<span>Versión {topic.version}</span>
			<span>Actualizado el {formatEventDate(topic.updatedAt)}</span>
		</div>
	</div>
</a>
