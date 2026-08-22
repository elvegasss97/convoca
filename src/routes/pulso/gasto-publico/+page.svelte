<script lang="ts">
	import {
		ArrowRight,
		Building2,
		CalendarDays,
		Database,
		ExternalLink,
		FileCheck2,
		Landmark,
		MapPin,
		Scale,
		ShieldCheck,
		Sparkles
	} from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import PublicSpendingSubmissionForm from '$lib/components/pulso/PublicSpendingSubmissionForm.svelte';
	import {
		publicSpendingMaxAmount,
		publicSpendingPrimarySourceCount,
		publicSpendingStageLabels,
		type PublicSpendingStage
	} from '$lib/data/publicSpending';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const investigations = $derived(data.investigations);
	const maxAmount = $derived(publicSpendingMaxAmount(investigations));
	const primarySourceCount = $derived(publicSpendingPrimarySourceCount(investigations));
	const representedStageCount = $derived(
		new Set(investigations.map((investigation) => investigation.stage)).size
	);
	const latestReview = $derived(
		investigations.reduce(
			(latest, investigation) =>
				investigation.reviewedOn > latest.reviewedOn ? investigation : latest,
			investigations[0]
		)?.reviewedAt ?? 'Sin revisiones publicadas'
	);

	type StageFilter = 'all' | PublicSpendingStage;

	let activeStage = $state<StageFilter>('all');
	const visibleInvestigations = $derived(
		activeStage === 'all'
			? investigations
			: investigations.filter((item) => item.stage === activeStage)
	);

	const stageFilters: { id: StageFilter; label: string }[] = [
		{ id: 'all', label: 'Todas' },
		{ id: 'planificado', label: 'Planificado' },
		{ id: 'regulado', label: 'Regulado' },
		{ id: 'concedido', label: 'Concedido' },
		{ id: 'adjudicado', label: 'Adjudicado' }
	];

	function formatWallAmount(amount: number, approximate = false): string {
		const value = amount / 1_000_000;
		const digits = value >= 100 ? 1 : value >= 10 ? 2 : 3;
		const formatted = new Intl.NumberFormat('es-ES', {
			minimumFractionDigits: value % 1 === 0 ? 0 : 1,
			maximumFractionDigits: digits
		}).format(value);
		return `${approximate ? '≈ ' : ''}${formatted} M€`;
	}

	function scaleWidth(amount: number): number {
		return Math.max(4, maxAmount > 0 ? (amount / maxAmount) * 100 : 0);
	}

	function stageClass(stage: PublicSpendingStage): string {
		return {
			planificado: 'stage-planned',
			regulado: 'stage-regulated',
			concedido: 'stage-granted',
			adjudicado: 'stage-awarded'
		}[stage];
	}

	function wallClass(index: number): string {
		return index === 0
			? 'wall-card--lead'
			: index === 1 || index === 2
				? 'wall-card--medium'
				: index === 3
					? 'wall-card--wide'
					: 'wall-card--small';
	}
</script>

<Seo
	title="El muro del gasto público"
	description="Investigaciones visuales que siguen el dinero público desde la norma o planificación hasta la concesión, el pago y la justificación."
/>

<div class="mx-auto max-w-7xl px-4 pt-4 pb-20 sm:px-6">
	<header class="mb-5">
		<PulsoSectionTabs active="gasto" />
	</header>

	<section
		class="relative isolate overflow-hidden rounded-3xl bg-brand-950 px-5 py-8 text-white shadow-card sm:px-8 sm:py-11 lg:px-12"
	>
		<div class="hero-glow hero-glow--one"></div>
		<div class="hero-glow hero-glow--two"></div>
		<div class="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"></div>

		<div class="grid gap-9 lg:grid-cols-[1fr_0.72fr] lg:items-end">
			<div class="max-w-3xl">
				<div
					class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100"
				>
					<Sparkles class="size-3.5 text-accent-300" /> Investigaciones recientes · fuentes primarias
				</div>
				<p
					class="mt-5 flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-100 uppercase"
				>
					<Landmark class="size-5 text-accent-300" /> El rastro del dinero
				</p>
				<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
					El muro del gasto público
				</h1>
				<p class="mt-4 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-lg">
					Cada cifra se abre hasta el documento, el beneficiario y el territorio que hoy podemos
					acreditar. Lo que todavía no sabemos también queda visible.
				</p>
			</div>

			<div class="grid grid-cols-3 gap-2">
				<div class="hero-stat">
					<p class="hero-stat__number">{investigations.length}</p>
					<p class="hero-stat__label">expedientes</p>
				</div>
				<div class="hero-stat">
					<p class="hero-stat__number">{primarySourceCount}</p>
					<p class="hero-stat__label">fuentes oficiales</p>
				</div>
				<div class="hero-stat">
					<p class="hero-stat__number">{representedStageCount}</p>
					<p class="hero-stat__label">estados reales</p>
				</div>
				<div class="col-span-3 rounded-2xl border border-accent-300/25 bg-accent-300/10 px-4 py-3">
					<p class="text-[11px] font-semibold tracking-wide text-accent-200 uppercase">
						Última revisión editorial
					</p>
					<p class="mt-1 font-display text-lg font-semibold">{latestReview}</p>
				</div>
			</div>
		</div>
	</section>

	<section
		class="mt-4 grid gap-3 rounded-3xl border border-ink-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5"
	>
		<div class="method-item">
			<span class="method-icon"><Database class="size-4" /></span>
			<div>
				<p class="method-title">Una cifra, un estado</p>
				<p class="method-copy">Planificar, conceder, adjudicar y pagar no significan lo mismo.</p>
			</div>
		</div>
		<div class="method-item">
			<span class="method-icon"><Scale class="size-4" /></span>
			<div>
				<p class="method-title">Escala, no suma</p>
				<p class="method-copy">Comparamos el tamaño; no sumamos expedientes de fases distintas.</p>
			</div>
		</div>
		<div class="method-item">
			<span class="method-icon"><ShieldCheck class="size-4" /></span>
			<div>
				<p class="method-title">Huecos a la vista</p>
				<p class="method-copy">Si faltan pagos, municipios o justificación, no los inventamos.</p>
			</div>
		</div>
	</section>

	<section id="expedientes" class="scroll-mt-24 pt-11">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-semibold tracking-wider text-brand-700 uppercase">El muro</p>
				<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
					Siete expedientes, siete recorridos distintos
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
					La barra de cada tarjeta compara su magnitud con el expediente mayor. Abre una ficha para
					ver a dónde va el dinero y qué documento sostiene cada conclusión.
				</p>
			</div>
			<p class="shrink-0 text-xs text-ink-500" aria-live="polite">
				Mostrando {visibleInvestigations.length} de {investigations.length}
			</p>
		</div>

		<div class="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por estado">
			{#each stageFilters as filter (filter.id)}
				<button
					type="button"
					aria-pressed={activeStage === filter.id}
					onclick={() => (activeStage = filter.id)}
					class="filter-button {activeStage === filter.id ? 'filter-button--active' : ''}"
				>
					{filter.label}
					{#if filter.id !== 'all'}
						<span class="opacity-60">
							{investigations.filter((item) => item.stage === filter.id).length}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="spending-grid mt-5">
			{#each visibleInvestigations as investigation, index (investigation.slug)}
				<a
					href={`/pulso/gasto-publico/${investigation.slug}`}
					class="wall-card {wallClass(index)}"
					style={`--case-accent: ${investigation.accent}`}
				>
					<div class="flex items-start justify-between gap-3">
						<span class="stage-pill {stageClass(investigation.stage)}">
							<FileCheck2 class="size-3.5" />
							{publicSpendingStageLabels[investigation.stage]}
						</span>
						<span class="flex items-center gap-1 text-[11px] font-medium text-ink-400">
							<CalendarDays class="size-3.5" />
							{investigation.publishedAt}
						</span>
					</div>

					<p class="mt-5 text-xs font-semibold tracking-wide text-ink-400 uppercase">
						{investigation.category}
					</p>
					<h3 class="mt-1.5 font-display text-xl leading-tight font-semibold text-ink-900">
						{investigation.shortTitle}
					</h3>
					<p class="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900">
						{formatWallAmount(investigation.amount, investigation.amountApproximate)}
					</p>
					<p class="mt-1 text-xs leading-relaxed text-ink-500">{investigation.amountQualifier}</p>

					<div class="scale-track mt-4" aria-hidden="true">
						<div class="scale-fill" style={`width: ${scaleWidth(investigation.amount)}%`}></div>
					</div>

					<p class="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-600">
						{investigation.summary}
					</p>

					<div
						class="mt-5 grid gap-2 border-t border-ink-100 pt-4 text-xs text-ink-500 sm:grid-cols-2"
					>
						<p class="flex items-start gap-1.5">
							<Building2 class="mt-0.5 size-3.5 shrink-0 text-ink-400" />
							<span>{investigation.recipient}</span>
						</p>
						<p class="flex items-start gap-1.5">
							<MapPin class="mt-0.5 size-3.5 shrink-0 text-ink-400" />
							<span>{investigation.territory}</span>
						</p>
					</div>

					<div class="mt-auto flex items-center justify-between gap-3 pt-5">
						<p class="text-xs font-semibold text-ink-600">
							{investigation.featuredMetric}
							<span class="font-normal text-ink-400">· {investigation.featuredLabel}</span>
						</p>
						<span
							class="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700"
						>
							Abrir ficha <ArrowRight class="size-3.5" />
						</span>
					</div>
				</a>
			{/each}
		</div>

		<div
			class="border-warning-200 text-warning-800 mt-4 flex items-start gap-2 rounded-2xl border bg-warning-50 px-4 py-3 text-xs leading-relaxed"
		>
			<Scale class="mt-0.5 size-4 shrink-0" />
			<p>
				<strong>Las cifras del muro no forman un total.</strong> Mezclan presupuestos, necesidades planificadas,
				ayudas concedidas y contratos adjudicados; sumar esos estados produciría una cifra engañosa.
			</p>
		</div>
	</section>

	<section id="aporta" class="scroll-mt-24 pt-14">
		<PublicSpendingSubmissionForm />
	</section>

	<section
		class="mt-12 flex flex-col gap-4 rounded-3xl bg-ink-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7"
	>
		<div class="max-w-3xl">
			<p
				class="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-300 uppercase"
			>
				<ShieldCheck class="size-4" /> Método abierto
			</p>
			<h2 class="mt-2 font-display text-xl font-semibold">No tienes que fiarte de CONVOCA</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-300">
				Cada ficha enlaza la norma, resolución o contrato original y explica exactamente qué
				demuestra.
			</p>
		</div>
		<a
			href="#expedientes"
			class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
		>
			Explorar expedientes <ExternalLink class="size-3.5" />
		</a>
	</section>
</div>

<svelte:head>
	<meta property="og:type" content="website" />
</svelte:head>

<style>
	.hero-glow {
		pointer-events: none;
		position: absolute;
		z-index: -10;
		border-radius: 9999px;
		filter: blur(56px);
	}

	.hero-glow--one {
		top: -9rem;
		right: -6rem;
		width: 22rem;
		height: 22rem;
		background: rgb(61 184 164 / 0.25);
	}

	.hero-glow--two {
		bottom: -12rem;
		left: 8%;
		width: 24rem;
		height: 24rem;
		background: rgb(234 139 62 / 0.18);
	}

	.hero-stat {
		border: 1px solid rgb(255 255 255 / 0.1);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.09);
		padding: 0.85rem 0.7rem;
		text-align: center;
		backdrop-filter: blur(8px);
	}

	.hero-stat__number {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 650;
		line-height: 1;
	}

	.hero-stat__label {
		margin-top: 0.35rem;
		font-size: 0.65rem;
		line-height: 1.15;
		color: var(--color-brand-100);
	}

	.method-item {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
	}

	.method-icon {
		display: flex;
		width: 2rem;
		height: 2rem;
		flex: none;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}

	.method-title {
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--color-ink-900);
	}

	.method-copy {
		margin-top: 0.15rem;
		font-size: 0.72rem;
		line-height: 1.45;
		color: var(--color-ink-500);
	}

	.filter-button {
		flex: none;
		border: 1px solid var(--color-ink-200);
		border-radius: 9999px;
		background: white;
		padding: 0.5rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-ink-600);
		transition: 150ms ease;
	}

	.filter-button:hover,
	.filter-button--active {
		border-color: var(--color-brand-700);
		background: var(--color-brand-700);
		color: white;
	}

	.spending-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.wall-card {
		position: relative;
		display: flex;
		min-height: 22rem;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--color-ink-200);
		border-top: 4px solid var(--case-accent);
		border-radius: 1.5rem;
		background: white;
		padding: 1.25rem;
		box-shadow: var(--shadow-card);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.wall-card::before {
		position: absolute;
		top: -5rem;
		right: -5rem;
		width: 10rem;
		height: 10rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--case-accent) 11%, transparent);
		content: '';
	}

	.wall-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--case-accent) 35%, var(--color-ink-200));
		box-shadow: var(--shadow-card-hover);
	}

	.scale-track {
		height: 0.42rem;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--color-ink-100);
	}

	.scale-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--case-accent);
	}

	.stage-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		border-radius: 9999px;
		padding: 0.3rem 0.55rem;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.stage-planned {
		background: var(--color-warning-100);
		color: var(--color-warning-800);
	}

	.stage-regulated {
		background: #f1ecf8;
		color: #65498a;
	}

	.stage-granted {
		background: var(--color-brand-100);
		color: var(--color-brand-800);
	}

	.stage-awarded {
		background: var(--color-accent-100);
		color: var(--color-accent-800);
	}

	@media (min-width: 768px) {
		.spending-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.spending-grid {
			grid-template-columns: repeat(12, minmax(0, 1fr));
		}

		.wall-card--lead,
		.wall-card--wide {
			grid-column: span 7;
		}

		.wall-card--medium {
			grid-column: span 5;
		}

		.wall-card--small {
			grid-column: span 4;
		}
	}
</style>
