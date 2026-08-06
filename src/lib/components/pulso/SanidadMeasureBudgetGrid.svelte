<script lang="ts">
	import {
		SANIDAD_BUDGET_BANDA_2032,
		SANIDAD_BUDGET_COMPONENTS,
		SANIDAD_BUDGET_MEASURES,
		SANIDAD_BUDGET_SERIE,
		SANIDAD_BUDGET_YEARS,
		SANIDAD_MEASURE_COLOR_TOKENS,
		type SanidadBudgetScenarioKey
	} from '$lib/data/sanidadBudgetData';

	interface Props {
		scenario: SanidadBudgetScenarioKey;
		year: string;
	}

	let { scenario, year }: Props = $props();

	let activeMeasureId = $state<string | null>(null);

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	const activeMeasure = $derived(
		activeMeasureId ? SANIDAD_BUDGET_MEASURES.find((m) => m.id === activeMeasureId) : null
	);

	const SW = 560;
	const SH = 140;
	const SP = 10;

	const sparkline = $derived.by(() => {
		if (!activeMeasure) return null;
		const values = SANIDAD_BUDGET_YEARS.map(
			(y) => SANIDAD_BUDGET_SERIE[scenario][y][activeMeasure.id]
		);
		const maxSpark = Math.max(...values) * 1.15;
		const points = SANIDAD_BUDGET_YEARS.map((y, i) => {
			const x = SP + ((SW - 2 * SP) * i) / (SANIDAD_BUDGET_YEARS.length - 1);
			const v = SANIDAD_BUDGET_SERIE[scenario][y][activeMeasure.id];
			const yv = SH - 16 - (SH - 30) * (v / maxSpark);
			return { x, y: yv, year: y };
		});
		const path = points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
			.join(' ');
		const area = `${path} L${points[points.length - 1].x.toFixed(1)},${SH - 16} L${points[0].x.toFixed(1)},${SH - 16} Z`;
		return { points, path, area };
	});

	const activeComponents = $derived(
		activeMeasure
			? [...SANIDAD_BUDGET_COMPONENTS[activeMeasure.id]].sort(
					(a, b) => Math.abs(b.valor) - Math.abs(a.valor)
				)
			: []
	);

	let detailEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (activeMeasureId && detailEl) {
			detailEl.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
				block: 'nearest'
			});
		}
	});
</script>

<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
	{#each SANIDAD_BUDGET_MEASURES as m (m.id)}
		{@const val = SANIDAD_BUDGET_SERIE[scenario][year][m.id]}
		{@const bandaCentral = SANIDAD_BUDGET_BANDA_2032[m.id].central}
		{@const isOpen = activeMeasureId === m.id}
		<button
			type="button"
			onclick={() => (activeMeasureId = isOpen ? null : m.id)}
			aria-expanded={isOpen}
			class={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
				isOpen ? 'border-brand-700 shadow-md' : 'border-ink-100'
			}`}
		>
			<span
				class="absolute top-0 bottom-0 left-0 w-1"
				style={`background-color: var(--color-${isOpen ? SANIDAD_MEASURE_COLOR_TOKENS[m.id] : 'ink-200'})`}
				aria-hidden="true"
			></span>
			<div class="font-mono text-[11px] font-semibold text-brand-700">{m.id}</div>
			<div
				class="mt-1 mb-2.5 min-h-[34px] text-[13.5px] leading-tight font-semibold break-words text-ink-900"
			>
				{m.nombre}
			</div>
			<div class="font-display text-xl font-bold text-brand-900">
				{eur(val)}<span class="ml-0.5 text-[.48em] font-medium text-ink-400">M€ · {year}</span>
			</div>
			<div class="mt-0.5 font-mono text-[10.5px] text-ink-400">
				2032 central: {eur(bandaCentral)} M€
			</div>
		</button>
	{/each}
</div>

{#if activeMeasure}
	{@const colorToken = SANIDAD_MEASURE_COLOR_TOKENS[activeMeasure.id]}
	{@const valYear = SANIDAD_BUDGET_SERIE[scenario][year][activeMeasure.id]}
	{@const val2032 = SANIDAD_BUDGET_SERIE[scenario]['2032'][activeMeasure.id]}
	{@const banda = SANIDAD_BUDGET_BANDA_2032[activeMeasure.id]}
	<div bind:this={detailEl} class="mt-4 rounded-3xl bg-brand-950 p-5 text-white sm:p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<div class="font-mono text-[11px] tracking-wide text-brand-300 uppercase">
					{activeMeasure.id} · Detalle de la medida
				</div>
				<h4 class="mt-1 max-w-lg font-display text-lg font-bold break-words sm:text-xl">
					{activeMeasure.nombre}
				</h4>
			</div>
			<button
				type="button"
				onclick={() => (activeMeasureId = null)}
				aria-label="Cerrar detalle de la medida"
				class="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm hover:bg-white/15"
			>
				✕
			</button>
		</div>
		<p class="mt-2.5 max-w-xl text-[13.5px] text-brand-100">{activeMeasure.corto}</p>

		<div class="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-3.5">
				<div class="font-mono text-[10.5px] tracking-wide text-brand-300 uppercase">
					{year} · {scenario}
				</div>
				<div class="mt-1.5 font-display text-lg font-bold">
					{eur(valYear)}<span class="ml-0.5 text-[.5em] font-medium text-brand-300">M€</span>
				</div>
			</div>
			<div class="rounded-2xl border border-white/10 bg-white/5 p-3.5">
				<div class="font-mono text-[10.5px] tracking-wide text-brand-300 uppercase">
					2032 · {scenario}
				</div>
				<div class="mt-1.5 font-display text-lg font-bold">
					{eur(val2032)}<span class="ml-0.5 text-[.5em] font-medium text-brand-300">M€</span>
				</div>
			</div>
			<div class="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:col-span-1">
				<div class="font-mono text-[10.5px] tracking-wide text-brand-300 uppercase">
					Banda de escenarios 2032
				</div>
				<div class="mt-1.5 font-display text-base font-bold">
					{eur(banda.bajo)}–{eur(banda.alto)}<span
						class="ml-0.5 text-[.5em] font-medium text-brand-300">M€</span
					>
				</div>
			</div>
		</div>

		<div class="mt-5 grid gap-5 md:grid-cols-[1.15fr_1fr]">
			<div>
				<div class="mb-3 font-mono text-[11px] tracking-wide text-brand-300 uppercase">
					Evolución 2027–2036 · {scenario}
				</div>
				<div class="rounded-2xl bg-white/5 p-4">
					{#if sparkline}
						<svg viewBox={`0 0 ${SW} ${SH}`} class="block w-full" aria-hidden="true">
							<path d={sparkline.area} fill={`var(--color-${colorToken})`} opacity="0.22" />
							<path
								d={sparkline.path}
								fill="none"
								stroke={`var(--color-${colorToken})`}
								stroke-width="2.4"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							{#each sparkline.points as p (p.year)}
								<circle
									cx={p.x}
									cy={p.y}
									r={p.year === year ? 5 : 2.6}
									fill={`var(--color-${colorToken})`}
									stroke="var(--color-brand-950)"
									stroke-width={p.year === year ? 2 : 0}
								/>
								<text
									x={p.x}
									y={SH - 2}
									font-family="ui-monospace, monospace"
									font-size="9"
									fill="rgba(255,255,255,.45)"
									text-anchor="middle">{p.year.slice(2)}</text
								>
							{/each}
						</svg>
					{/if}
				</div>
			</div>
			<div>
				<div class="mb-3 font-mono text-[11px] tracking-wide text-brand-300 uppercase">
					Principales recursos que explican el coste (2032 · Central)
				</div>
				<div class="flex flex-col gap-2">
					{#each activeComponents as c (c.nombre)}
						<div
							class="flex items-center justify-between gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[13px]"
						>
							<span class="flex min-w-0 items-center gap-2">
								{#if c.tipo === 'Deducción'}
									<span
										class="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-white/65 uppercase"
									>
										Deducción
									</span>
								{/if}
								<span class="truncate">{c.nombre}</span>
							</span>
							<span class="shrink-0 font-mono font-semibold whitespace-nowrap">
								{c.valor < 0 ? '−' : ''}{eur(Math.abs(c.valor))} M€
							</span>
						</div>
					{/each}
					{#if activeComponents.length === 0}
						<p class="text-[13px] text-white/60">Sin desglose de componentes disponible.</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<p class="sr-only" aria-live="polite">
		{activeMeasure.id}: {eur(valYear)} millones de euros en {year}, escenario {scenario}.
	</p>
{/if}
