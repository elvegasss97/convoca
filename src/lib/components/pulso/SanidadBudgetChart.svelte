<script lang="ts">
	import {
		SANIDAD_BUDGET_MEASURES,
		SANIDAD_BUDGET_SCENARIOS,
		SANIDAD_BUDGET_SERIE,
		SANIDAD_BUDGET_YEARS,
		SANIDAD_MEASURE_COLOR_TOKENS,
		formatSanidadEur as eur,
		type SanidadBudgetScenarioKey
	} from '$lib/data/sanidadBudgetData';

	interface Props {
		scenario: SanidadBudgetScenarioKey;
		year: string;
		onYearChange: (year: string) => void;
	}

	let { scenario, year, onYearChange }: Props = $props();

	let mode = $state<'total' | 'medidas'>('total');
	let hoverYear = $state<string | null>(null);

	const CW = 960;
	const CH = 340;
	const PAD_L = 46;
	const PAD_R = 14;
	const PAD_T = 18;
	const PAD_B = 34;
	const plotW = CW - PAD_L - PAD_R;
	const plotH = CH - PAD_T - PAD_B;

	function xFor(i: number): number {
		return PAD_L + (plotW * i) / (SANIDAD_BUDGET_YEARS.length - 1);
	}
	function yFor(v: number, maxV: number): number {
		return PAD_T + plotH - (plotH * v) / maxV;
	}

	const maxTotal = $derived.by(() => {
		let m = 0;
		for (const s of SANIDAD_BUDGET_SCENARIOS) {
			for (const y of SANIDAD_BUDGET_YEARS) {
				m = Math.max(m, SANIDAD_BUDGET_SERIE[s.key][y].TOTAL);
			}
		}
		return m * 1.08;
	});

	const gridSteps = $derived(
		Array.from({ length: 5 }, (_, i) => {
			const v = (maxTotal / 4) * i;
			return { v, y: yFor(v, maxTotal) };
		})
	);

	// Modo "total": una línea por escenario, la activa resaltada con área rellena.
	const scenarioLines = $derived(
		SANIDAD_BUDGET_SCENARIOS.map((s) => {
			const points = SANIDAD_BUDGET_YEARS.map((y, i) => ({
				x: xFor(i),
				y: yFor(SANIDAD_BUDGET_SERIE[s.key][y].TOTAL, maxTotal),
				year: y
			}));
			const path = points
				.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
				.join(' ');
			const areaPath = `${path} L${xFor(SANIDAD_BUDGET_YEARS.length - 1).toFixed(1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;
			return { ...s, points, path, areaPath, active: s.key === scenario };
		})
	);

	// Modo "por medidas": área apilada de las 8 medidas para el escenario activo.
	const stackedAreas = $derived.by(() => {
		const cum = SANIDAD_BUDGET_YEARS.map(() => 0);
		return SANIDAD_BUDGET_MEASURES.map((m) => {
			const prevCum = [...cum];
			const topPoints = SANIDAD_BUDGET_YEARS.map((y, i) => {
				cum[i] += SANIDAD_BUDGET_SERIE[scenario][y][m.id];
				return { x: xFor(i), y: yFor(cum[i], maxTotal) };
			});
			const basePoints = SANIDAD_BUDGET_YEARS.map((y, i) => ({
				x: xFor(i),
				y: yFor(prevCum[i], maxTotal)
			}));
			const top = topPoints
				.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
				.join(' ');
			const bottom = [...basePoints]
				.reverse()
				.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
				.join(' ');
			return { id: m.id, colorToken: SANIDAD_MEASURE_COLOR_TOKENS[m.id], d: `${top} ${bottom} Z` };
		});
	});

	const stackedOutline = $derived.by(() => {
		const points = SANIDAD_BUDGET_YEARS.map((y, i) => ({
			x: xFor(i),
			y: yFor(SANIDAD_BUDGET_SERIE[scenario][y].TOTAL, maxTotal)
		}));
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
			.join(' ');
	});

	const YEARS: readonly string[] = SANIDAD_BUDGET_YEARS;
	const MODES: readonly ['total', 'medidas'] = ['total', 'medidas'];

	function scenarioLabelOf(key: SanidadBudgetScenarioKey): string {
		return (SANIDAD_BUDGET_SCENARIOS.find((s) => s.key === key)?.label ?? key).toLowerCase();
	}

	/** Etiqueta accesible de cada punto del gráfico: se recalcula con el año, el escenario y el valor actuales. */
	function yearPointLabel(y: string): string {
		const total = SANIDAD_BUDGET_SERIE[scenario][y].TOTAL;
		return `Año ${y}, escenario ${scenarioLabelOf(scenario)}, coste total ${eur(total)} millones de euros`;
	}

	let modeButtonEls: (HTMLButtonElement | null)[] = $state([]);
	let yearButtonEls: (HTMLButtonElement | null)[] = $state([]);

	/** Navegación con flechas/Inicio/Fin dentro de un grupo role="radiogroup", moviendo foco y selección juntos (patrón WAI-ARIA APG). */
	function radiogroupKeydown(
		e: KeyboardEvent,
		index: number,
		items: readonly string[],
		els: (HTMLButtonElement | null)[],
		select: (value: string) => void
	) {
		let next: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % items.length;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
			next = (index - 1 + items.length) % items.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = items.length - 1;
		if (next !== null) {
			e.preventDefault();
			select(items[next]);
			els[next]?.focus();
		}
	}

	// El tooltip y la línea vertical de referencia solo aparecen mientras se
	// pasa el cursor por una zona del gráfico: en reposo (y en pantallas
	// táctiles, donde no hay hover) no deben tapar nada — el mismo detalle ya
	// está disponible siempre en el desglose por medida de más abajo.
	const tooltipData = $derived.by(() => {
		if (!hoverYear) return null;
		const row = SANIDAD_BUDGET_SERIE[scenario][hoverYear];
		return {
			year: hoverYear,
			total: row.TOTAL,
			rows: SANIDAD_BUDGET_MEASURES.map((m) => ({ id: m.id, value: row[m.id] }))
		};
	});
	const tooltipLeftPct = $derived(hoverYear ? (xFor(YEARS.indexOf(hoverYear)) / CW) * 100 : 0);
	const hoverLineX = $derived(hoverYear ? xFor(YEARS.indexOf(hoverYear)) : null);
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div
			class="inline-flex rounded-full border border-ink-100 bg-ink-50 p-1"
			role="radiogroup"
			aria-label="Modo del gráfico"
		>
			{#each [['total', 'Coste total'], ['medidas', 'Por medidas (M1–M8)']] as [key, label], i (key)}
				<button
					bind:this={modeButtonEls[i]}
					type="button"
					role="radio"
					aria-checked={mode === key}
					tabindex={mode === key ? 0 : -1}
					onclick={() => (mode = key as 'total' | 'medidas')}
					onkeydown={(e) =>
						radiogroupKeydown(e, i, MODES, modeButtonEls, (v) => (mode = v as 'total' | 'medidas'))}
					class={`min-h-[38px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
						mode === key ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-600 hover:bg-white/60'
					}`}
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="flex flex-wrap gap-3 text-xs text-ink-600">
			{#if mode === 'total'}
				{#each SANIDAD_BUDGET_SCENARIOS as s (s.key)}
					<span class="inline-flex items-center gap-1.5">
						<span
							class="size-2.5 rounded-sm"
							style={`background-color: var(--color-${s.colorToken})`}
						></span>{s.label}
					</span>
				{/each}
			{:else}
				{#each SANIDAD_BUDGET_MEASURES as m (m.id)}
					<span class="inline-flex items-center gap-1.5">
						<span
							class="size-2.5 rounded-sm"
							style={`background-color: var(--color-${SANIDAD_MEASURE_COLOR_TOKENS[m.id]})`}
						></span>{m.id}
					</span>
				{/each}
			{/if}
		</div>
	</div>

	<div class="relative w-full">
		<svg viewBox={`0 0 ${CW} ${CH}`} class="block w-full" aria-hidden="true">
			{#each gridSteps as step (step.v)}
				<line
					x1={PAD_L}
					x2={CW - PAD_R}
					y1={step.y}
					y2={step.y}
					stroke="var(--color-ink-100)"
					stroke-width="1"
				/>
				<text
					x={PAD_L - 8}
					y={step.y + 3}
					text-anchor="end"
					font-size="10.5"
					fill="var(--color-ink-400)"
				>
					{eur(step.v)}
				</text>
			{/each}
			{#each SANIDAD_BUDGET_YEARS as y, i (y)}
				<text
					x={xFor(i)}
					y={CH - PAD_T + 4}
					text-anchor="middle"
					font-size="10.5"
					fill="var(--color-ink-400)"
				>
					{y}
				</text>
			{/each}

			{#if mode === 'total'}
				{#each scenarioLines as line (line.key)}
					{#if line.active}
						<path d={line.areaPath} fill={`var(--color-${line.colorToken})`} opacity="0.12" />
					{/if}
					<path
						d={line.path}
						fill="none"
						stroke={`var(--color-${line.colorToken})`}
						stroke-width={line.active ? 3 : 1.5}
						stroke-dasharray={line.active ? undefined : '4 4'}
						opacity={line.active ? 1 : 0.5}
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					{#each line.points as p (p.year)}
						<circle
							cx={p.x}
							cy={p.y}
							r={line.active && p.year === year ? 5.5 : line.active ? 3.2 : 2}
							fill={`var(--color-${line.colorToken})`}
							opacity={line.active ? 1 : 0.6}
							stroke="#fff"
							stroke-width={line.active ? 2 : 0}
						/>
					{/each}
				{/each}
			{:else}
				{#each stackedAreas as area (area.id)}
					<path d={area.d} fill={`var(--color-${area.colorToken})`} opacity="0.88" />
				{/each}
				<path
					d={stackedOutline}
					fill="none"
					stroke="var(--color-brand-950)"
					stroke-width="1.5"
					opacity="0.25"
				/>
			{/if}

			{#if hoverLineX !== null}
				<line
					x1={hoverLineX}
					x2={hoverLineX}
					y1={PAD_T}
					y2={PAD_T + plotH}
					stroke="var(--color-ink-400)"
					stroke-width="1"
					stroke-dasharray="3 3"
				/>
			{/if}
		</svg>

		<!-- Zonas de hover/click por año, superpuestas al SVG. La superficie realmente accesible por teclado es el selector de años de abajo. -->
		<div class="absolute inset-0 flex">
			{#each SANIDAD_BUDGET_YEARS as y (y)}
				<button
					type="button"
					tabindex="-1"
					aria-hidden="true"
					class="h-full flex-1 cursor-pointer"
					onmouseenter={() => (hoverYear = y)}
					onmouseleave={() => (hoverYear = null)}
					onclick={() => onYearChange(y)}
				></button>
			{/each}
		</div>

		{#if tooltipData}
			<div
				class="pointer-events-none absolute top-1 min-w-[180px] -translate-x-1/2 rounded-xl bg-brand-950 px-3.5 py-3 text-xs text-white shadow-lg"
				style={`left:${tooltipLeftPct}%`}
			>
				<div class="mb-1.5 font-mono text-[11px] tracking-wide text-brand-300">
					{tooltipData.year} · {SANIDAD_BUDGET_SCENARIOS.find((s) => s.key === scenario)?.label}
				</div>
				<div class="mb-1.5 font-display text-base font-bold">{eur(tooltipData.total)} M€</div>
				{#each tooltipData.rows as row (row.id)}
					<div class="flex justify-between gap-3 py-0.5 text-white/80">
						<span>{row.id}</span>
						<span class="font-mono font-medium text-white">{eur(row.value)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div
		class="mt-3.5 flex gap-1 overflow-x-auto border-t border-ink-100 pt-3.5"
		role="radiogroup"
		aria-label="Año"
	>
		{#each SANIDAD_BUDGET_YEARS as y, i (y)}
			<button
				bind:this={yearButtonEls[i]}
				type="button"
				role="radio"
				aria-checked={y === year}
				aria-label={yearPointLabel(y)}
				tabindex={y === year ? 0 : -1}
				onclick={() => onYearChange(y)}
				onkeydown={(e) => radiogroupKeydown(e, i, YEARS, yearButtonEls, onYearChange)}
				onmouseenter={() => (hoverYear = y)}
				onmouseleave={() => (hoverYear = null)}
				onfocus={() => (hoverYear = y)}
				onblur={() => (hoverYear = null)}
				class={`min-h-[42px] min-w-[42px] flex-1 rounded-lg px-1 py-2 font-mono text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
					y === year ? 'bg-brand-900 font-semibold text-white' : 'text-ink-500 hover:bg-ink-50'
				}`}
			>
				{y}
			</button>
		{/each}
	</div>
</div>
