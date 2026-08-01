<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		updatedAt: string;
		children: Snippet;
	}

	let { title, updatedAt, children }: Props = $props();
</script>

<svelte:head>
	<title>{title} — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
	<div class="flex items-center gap-1.5 text-xs text-ink-500">
		<a href="/" class="hover:text-brand-700">Convoca</a>
		<span>/</span>
		<span>{title}</span>
	</div>

	<h1 class="mt-2 font-display text-2xl font-semibold text-ink-900">{title}</h1>
	<p class="mt-1 text-sm text-ink-500">Última actualización: {updatedAt}</p>

	<div class="legal-content mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
		{@render children()}
	</div>
</div>

<style>
	.legal-content :global(h2) {
		font-family: var(--font-display, inherit);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-ink-900, #111827);
		margin-top: 0.5rem;
	}
	.legal-content :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.legal-content :global(strong) {
		font-weight: 600;
		color: var(--color-ink-900, #111827);
	}
	.legal-content :global(a) {
		color: var(--color-brand-700, #0f5c4f);
		text-decoration: underline;
	}
</style>
