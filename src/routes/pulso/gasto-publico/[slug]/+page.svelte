<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		Building2,
		Check,
		CircleHelp,
		Clock3,
		ExternalLink,
		FileCheck2,
		FileSearch,
		Landmark,
		MapPin,
		Route,
		Scale
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import Seo from '$lib/components/Seo.svelte';
	import PublicSpendingCitizenGuide from '$lib/components/pulso/PublicSpendingCitizenGuide.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import {
		publicSpendingStageLabels,
		type PublicSpendingTraceState
	} from '$lib/data/publicSpending';

	let { data }: { data: PageData } = $props();
	const investigation = $derived(data.investigation);
	const investigations = $derived(data.investigations);
	let selectedBreakdownIndex = $state(0);

	const euroFormatter = new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 2
	});

	const selectedBreakdown = $derived(investigation.breakdown[selectedBreakdownIndex]);
	const breakdownMax = $derived(Math.max(...investigation.breakdown.map((item) => item.amount)));
	const caseIndex = $derived(investigations.findIndex((item) => item.slug === investigation.slug));
	const previousCase = $derived(caseIndex > 0 ? investigations[caseIndex - 1] : undefined);
	const nextCase = $derived(
		caseIndex < investigations.length - 1 ? investigations[caseIndex + 1] : undefined
	);

	function formatMainAmount(amount: number, approximate = false): string {
		const value = amount / 1_000_000;
		const formatted = new Intl.NumberFormat('es-ES', {
			minimumFractionDigits: value % 1 === 0 ? 0 : 1,
			maximumFractionDigits: value >= 100 ? 2 : 3
		}).format(value);
		return `${approximate ? '≈ ' : ''}${formatted} M€`;
	}

	function barWidth(amount: number): number {
		return Math.max(3, (amount / breakdownMax) * 100);
	}

	function traceIcon(state: PublicSpendingTraceState) {
		return state === 'verified' ? Check : state === 'current' ? Clock3 : CircleHelp;
	}

	function traceClass(state: PublicSpendingTraceState): string {
		return state === 'verified'
			? 'trace-step--verified'
			: state === 'current'
				? 'trace-step--current'
				: 'trace-step--pending';
	}
</script>

<Seo
	title={`${investigation.shortTitle} — El muro del gasto público`}
	description={investigation.summary}
/>

<div class="mx-auto max-w-7xl px-4 pt-4 pb-20 sm:px-6">
	<header class="mb-5">
		<PulsoSectionTabs active="gasto" />
		<a
			href="/pulso/gasto-publico"
			class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
		>
			<ArrowLeft class="size-4" /> Volver al muro
		</a>
	</header>

	<section
		class="case-hero relative isolate overflow-hidden rounded-3xl px-5 py-8 text-white shadow-card sm:px-8 sm:py-10 lg:px-12"
		style={`--case-accent: ${investigation.accent}`}
	>
		<div class="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"></div>
		<div class="case-hero__glow"></div>
		<div class="grid gap-8 lg:grid-cols-[1fr_0.62fr] lg:items-end">
			<div class="max-w-3xl">
				<div class="flex flex-wrap items-center gap-2">
					<span class="hero-pill"
						><FileCheck2 class="size-3.5" /> {publicSpendingStageLabels[investigation.stage]}</span
					>
					<span class="hero-pill hero-pill--quiet">Revisado el {investigation.reviewedAt}</span>
				</div>
				<p class="mt-5 text-xs font-semibold tracking-wider text-brand-100 uppercase">
					{investigation.eyebrow}
				</p>
				<h1
					class="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl"
				>
					{investigation.title}
				</h1>
				<p class="mt-4 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-lg">
					{investigation.summary}
				</p>
			</div>

			<div class="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur-sm sm:p-6">
				<p class="text-[11px] font-semibold tracking-wider text-brand-200 uppercase">
					Importe que acredita esta ficha
				</p>
				<p class="mt-2 font-display text-4xl font-semibold tracking-tight">
					{formatMainAmount(investigation.amount, investigation.amountApproximate)}
				</p>
				<p class="mt-1 text-sm text-brand-100">{investigation.amountQualifier}</p>
				<div class="my-4 h-px bg-white/10"></div>
				<p class="text-xs leading-relaxed text-brand-100">{investigation.evidenceNote}</p>
			</div>
		</div>
	</section>

	<nav class="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Contenido de la ficha">
		<a href="#resumen-sencillo" class="section-link">Resumen sencillo</a>
		<a href="#significado" class="section-link">Qué significa</a>
		<a href="#destino" class="section-link">A dónde va</a>
		<a href="#rastro" class="section-link">Seguir el rastro</a>
		<a href="#fuentes" class="section-link">Fuentes</a>
	</nav>

	<div class="pt-6">
		<PublicSpendingCitizenGuide {investigation} />
	</div>

	<section id="significado" class="scroll-mt-24 pt-10">
		<div class="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
			<article class="rounded-3xl border border-brand-200 bg-brand-50 p-5 sm:p-7">
				<p
					class="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-700 uppercase"
				>
					<Scale class="size-4" /> Lectura correcta
				</p>
				<h2 class="mt-3 font-display text-2xl font-semibold text-ink-900">
					Qué sabemos —y qué no dice la cifra
				</h2>
				<p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
					{investigation.whyItMatters}
				</p>
				<div class="mt-5 rounded-2xl border border-brand-200 bg-white px-4 py-3">
					<p class="font-display text-2xl font-semibold text-ink-900">
						{investigation.featuredMetric}
					</p>
					<p class="mt-1 text-sm text-ink-600">{investigation.featuredLabel}</p>
				</div>
			</article>

			<div class="grid gap-3 sm:grid-cols-2">
				<article class="fact-card sm:col-span-2">
					<span class="fact-icon"><Building2 class="size-4" /></span>
					<p class="fact-label">Quién gestiona</p>
					<p class="fact-value">{investigation.manager}</p>
				</article>
				<article class="fact-card">
					<span class="fact-icon"><Landmark class="size-4" /></span>
					<p class="fact-label">Quién puede recibirlo</p>
					<p class="fact-value">{investigation.recipient}</p>
				</article>
				<article class="fact-card">
					<span class="fact-icon"><MapPin class="size-4" /></span>
					<p class="fact-label">Dónde</p>
					<p class="fact-value">{investigation.territory}</p>
				</article>
			</div>
		</div>
	</section>

	<section id="destino" class="scroll-mt-24 pt-12">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-accent-700 uppercase">
				Destino acreditado
			</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				{investigation.breakdownTitle}
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				{investigation.breakdownNote}
			</p>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
			<div class="space-y-2 rounded-3xl border border-ink-200 bg-white p-4 shadow-card sm:p-5">
				{#each investigation.breakdown as item, index (item.label)}
					<button
						type="button"
						aria-pressed={selectedBreakdownIndex === index}
						onclick={() => (selectedBreakdownIndex = index)}
						class="breakdown-row {selectedBreakdownIndex === index
							? 'breakdown-row--selected'
							: ''}"
					>
						<div class="flex items-start justify-between gap-3">
							<span class="text-left text-sm font-semibold text-ink-800">{item.label}</span>
							<span class="shrink-0 text-xs font-semibold text-ink-700">
								{formatMainAmount(item.amount)}
							</span>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
							<div
								class="h-full rounded-full bg-brand-600 transition-[width] duration-300"
								style={`width:${barWidth(item.amount)}%`}
							></div>
						</div>
					</button>
				{/each}
			</div>

			{#if selectedBreakdown}
				<article
					class="rounded-3xl bg-ink-900 p-5 text-white shadow-card sm:p-6"
					aria-live="polite"
				>
					<p class="text-xs font-semibold tracking-wider text-accent-300 uppercase">
						Partida seleccionada
					</p>
					<h3 class="mt-3 font-display text-xl font-semibold">{selectedBreakdown.label}</h3>
					<p class="mt-3 font-display text-3xl font-semibold">
						{euroFormatter.format(selectedBreakdown.amount)}
					</p>
					<p class="mt-3 text-sm leading-relaxed text-ink-300">{selectedBreakdown.detail}</p>
					{#if selectedBreakdown.place}
						<p class="mt-4 flex items-center gap-2 text-sm text-ink-200">
							<MapPin class="size-4 text-accent-300" />
							{selectedBreakdown.place}
						</p>
					{/if}
					<div class="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-ink-400">
						{investigation.breakdownCoverage === 'complete'
							? 'Esta ficha presenta el desglose completo disponible para este nivel.'
							: 'Esta selección no sustituye el anexo completo de la fuente original.'}
					</div>
				</article>
			{/if}
		</div>
	</section>

	<section id="rastro" class="scroll-mt-24 pt-12">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-brand-700 uppercase">Trazabilidad</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Hasta dónde llega hoy el rastro
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				Cada paso cambia de estado solo cuando existe un documento que lo acredita.
			</p>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
			<ol class="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
				{#each investigation.trace as step, index (step.label)}
					{@const Icon = traceIcon(step.state)}
					<li class="trace-step {traceClass(step.state)}">
						<span class="trace-number">{index + 1}</span>
						<span class="trace-icon"><Icon class="size-4" /></span>
						<div class="min-w-0 flex-1">
							<p class="font-display font-semibold text-ink-900">{step.label}</p>
							<p class="mt-1 text-xs leading-relaxed text-ink-500">{step.detail}</p>
						</div>
						<span class="trace-status">
							{step.state === 'verified'
								? 'Verificado'
								: step.state === 'current'
									? 'En curso'
									: 'Pendiente'}
						</span>
					</li>
				{/each}
			</ol>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
				<article class="rounded-3xl border border-brand-200 bg-brand-50 p-5">
					<h3 class="flex items-center gap-2 font-display font-semibold text-brand-900">
						<Check class="size-4" /> Lo que ya sabemos
					</h3>
					<ul class="mt-3 space-y-2.5">
						{#each investigation.known as item (item)}
							<li class="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
								<span class="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500"></span>{item}
							</li>
						{/each}
					</ul>
				</article>
				<article class="border-warning-200 rounded-3xl border bg-warning-50 p-5">
					<h3 class="text-warning-900 flex items-center gap-2 font-display font-semibold">
						<CircleHelp class="size-4" /> Lo que falta publicar
					</h3>
					<ul class="mt-3 space-y-2.5">
						{#each investigation.unknown as item (item)}
							<li class="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
								<span class="mt-2 size-1.5 shrink-0 rounded-full bg-warning-500"></span>{item}
							</li>
						{/each}
					</ul>
				</article>
			</div>
		</div>
	</section>

	<section id="fuentes" class="scroll-mt-24 pt-12">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-accent-700 uppercase">
				Fuentes primarias
			</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Compruébalo desde el documento original
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				No solo enlazamos la fuente: explicamos qué acredita y evitamos atribuirle conclusiones que
				no contiene.
			</p>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-3">
			{#each investigation.sources as source, index (source.id)}
				<article class="flex flex-col rounded-3xl border border-ink-200 bg-white p-5 shadow-card">
					<div class="flex items-start justify-between gap-3">
						<span
							class="flex size-9 items-center justify-center rounded-full bg-brand-100 text-brand-700"
						>
							<FileSearch class="size-4.5" />
						</span>
						<span
							class="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700"
						>
							Fuente {index + 1}
						</span>
					</div>
					<p class="mt-4 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
						{source.organization}
					</p>
					<h3 class="mt-2 font-display font-semibold text-ink-900">{source.title}</h3>
					<p class="mt-1 text-xs text-ink-500">{source.date}</p>
					<div class="my-4 h-px bg-ink-100"></div>
					<p class="text-xs font-semibold text-ink-500">Qué demuestra</p>
					<p class="mt-1 text-sm leading-relaxed text-ink-600">{source.whatItProves}</p>
					<a
						href={source.url}
						target="_blank"
						rel="noreferrer"
						class="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brand-700 hover:underline"
					>
						Abrir fuente oficial <ExternalLink class="size-3.5" />
					</a>
				</article>
			{/each}
		</div>
	</section>

	<section class="mt-12 rounded-3xl border border-accent-200 bg-accent-50 p-5 sm:p-7">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
			<div class="max-w-3xl">
				<p
					class="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-700 uppercase"
				>
					<Route class="size-4" /> Investigación ciudadana
				</p>
				<h2 class="mt-2 font-display text-xl font-semibold text-ink-900">
					¿Tienes dudas sobre otra partida?
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-600">
					Pásanos la información y al menos una fuente pública. La revisaremos sin publicarla
					automáticamente.
				</p>
			</div>
			<a
				href="/pulso/gasto-publico#aporta"
				class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-700"
			>
				Enviar una pista <ArrowRight class="size-3.5" />
			</a>
		</div>
	</section>

	<nav class="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Otras investigaciones">
		{#if previousCase}
			<a href={`/pulso/gasto-publico/${previousCase.slug}`} class="case-nav-link">
				<ArrowLeft class="size-4" />
				<span><span class="case-nav-label">Anterior</span>{previousCase.shortTitle}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextCase}
			<a
				href={`/pulso/gasto-publico/${nextCase.slug}`}
				class="case-nav-link justify-end text-right"
			>
				<span><span class="case-nav-label">Siguiente</span>{nextCase.shortTitle}</span>
				<ArrowRight class="size-4" />
			</a>
		{/if}
	</nav>
</div>

<style>
	.case-hero {
		background: linear-gradient(
			135deg,
			var(--color-brand-950),
			color-mix(in srgb, var(--case-accent) 42%, var(--color-brand-950))
		);
	}

	.case-hero__glow {
		position: absolute;
		right: -7rem;
		bottom: -9rem;
		z-index: -10;
		width: 22rem;
		height: 22rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--case-accent) 55%, transparent);
		filter: blur(55px);
	}

	.hero-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgb(255 255 255 / 0.16);
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.12);
		padding: 0.35rem 0.65rem;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.hero-pill--quiet {
		background: transparent;
		color: var(--color-brand-100);
		font-weight: 600;
	}

	.section-link {
		flex: none;
		border: 1px solid var(--color-ink-200);
		border-radius: 9999px;
		background: white;
		padding: 0.5rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-ink-700);
	}

	.section-link:hover {
		border-color: var(--color-brand-300);
		color: var(--color-brand-700);
	}

	.fact-card {
		border: 1px solid var(--color-ink-200);
		border-radius: 1.5rem;
		background: white;
		padding: 1.15rem;
		box-shadow: var(--shadow-card);
	}

	.fact-icon {
		display: flex;
		width: 2rem;
		height: 2rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: var(--color-ink-50);
		color: var(--color-brand-700);
	}

	.fact-label {
		margin-top: 0.8rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-ink-400);
	}

	.fact-value {
		margin-top: 0.25rem;
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.45;
		color: var(--color-ink-800);
	}

	.breakdown-row {
		display: block;
		width: 100%;
		border: 1px solid transparent;
		border-radius: 1rem;
		padding: 0.75rem;
		transition: 140ms ease;
	}

	.breakdown-row:hover,
	.breakdown-row--selected {
		border-color: var(--color-brand-200);
		background: var(--color-brand-50);
	}

	.trace-step {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		border-bottom: 1px solid var(--color-ink-100);
		padding: 1rem;
	}

	.trace-step:last-child {
		border-bottom: 0;
	}

	.trace-number {
		padding-top: 0.4rem;
		font-family: var(--font-display);
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-ink-400);
	}

	.trace-icon {
		display: flex;
		width: 2rem;
		height: 2rem;
		flex: none;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
	}

	.trace-status {
		flex: none;
		border-radius: 9999px;
		padding: 0.25rem 0.5rem;
		font-size: 0.65rem;
		font-weight: 700;
	}

	.trace-step--verified .trace-icon,
	.trace-step--verified .trace-status {
		background: var(--color-brand-100);
		color: var(--color-brand-800);
	}

	.trace-step--current .trace-icon,
	.trace-step--current .trace-status {
		background: var(--color-accent-100);
		color: var(--color-accent-800);
	}

	.trace-step--pending .trace-icon,
	.trace-step--pending .trace-status {
		background: var(--color-ink-100);
		color: var(--color-ink-500);
	}

	.case-nav-link {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		border: 1px solid var(--color-ink-200);
		border-radius: 1rem;
		background: white;
		padding: 0.85rem 1rem;
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--color-ink-800);
	}

	.case-nav-link:hover {
		border-color: var(--color-brand-300);
		color: var(--color-brand-800);
	}

	.case-nav-label {
		display: block;
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-ink-400);
	}

	@media (max-width: 520px) {
		.trace-status {
			display: none;
		}
	}
</style>
