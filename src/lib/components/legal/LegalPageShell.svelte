<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { ArrowLeft } from '@lucide/svelte';
	import { RELATED_LEGAL_LINKS } from '$lib/legal/links';
	import Seo from '$lib/components/Seo.svelte';

	interface Props {
		title: string;
		/** Meta description específica de este documento legal (150-160 caracteres). */
		description: string;
		/** Fecha de entrada en vigor de la versión actual. */
		updatedAt: string;
		/** Para el índice: debe coincidir con los `id` de los `<h2>` del contenido. */
		sections: { id: string; label: string }[];
		children: Snippet;
	}

	let { title, description, updatedAt, sections, children }: Props = $props();

	// No se lista el propio documento entre sus "relacionados" — ni el enlace
	// exacto a esta página ni un ancla dentro de ella.
	const otherLinks = $derived(
		RELATED_LEGAL_LINKS.filter(
			(link) => link.href !== page.url.pathname && !link.href.startsWith(page.url.pathname + '#')
		)
	);
</script>

<Seo {title} {description} />

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
	<div class="print:hidden">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
		>
			<ArrowLeft class="size-4" strokeWidth={2.25} />
			Volver a Convoca
		</a>
	</div>

	<h1 class="mt-4 font-display text-2xl font-semibold text-ink-900">{title}</h1>
	<p class="mt-1 text-sm text-ink-500">
		Versión 1.0 · Fecha de entrada en vigor: {updatedAt}
	</p>
	<p class="mt-0.5 text-xs text-ink-400">No hay versiones anteriores publicadas todavía.</p>

	{#if sections.length > 0}
		<nav
			aria-label="Índice de secciones"
			class="mt-5 rounded-2xl border border-ink-200 bg-white p-4 print:hidden"
		>
			<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Contenido</p>
			<ol class="mt-2 flex flex-col gap-1 text-sm">
				{#each sections as section (section.id)}
					<li>
						<a href="#{section.id}" class="text-brand-700 hover:underline">{section.label}</a>
					</li>
				{/each}
			</ol>
		</nav>
	{/if}

	<div class="legal-content mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
		{@render children()}
	</div>

	<div class="mt-10 rounded-2xl border border-ink-200 bg-white p-4 print:hidden">
		<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
			Documentos relacionados
		</p>
		<ul class="mt-2 flex flex-col gap-1 text-sm">
			{#each otherLinks as link (link.href)}
				<li>
					<a href={link.href} class="text-brand-700 hover:underline">{link.label}</a>
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.legal-content :global(h2) {
		font-family: var(--font-display, inherit);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-ink-900, #111827);
		margin-top: 0.5rem;
		scroll-margin-top: 5rem;
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

	@media print {
		:global(header),
		:global(nav[aria-label='Navegación principal']) {
			display: none !important;
		}
		.legal-content :global(a) {
			color: black;
			text-decoration: none;
		}
	}
</style>
