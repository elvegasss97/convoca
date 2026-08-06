<script lang="ts">
	import { tick } from 'svelte';
	import { SANIDAD_BUDGET_MEASURES } from '$lib/data/sanidadBudgetData';
	import {
		CAL,
		PHASES,
		MILESTONES,
		VERIFY,
		TIPO_LABEL,
		STATUS_LABEL,
		SANIDAD_CALENDAR_YEARS,
		phaseOfYear,
		resolveMeasureYear,
		currentStage,
		yearActiveMilestones,
		nextHitoInfo,
		fmt,
		fmt1,
		pct,
		type SanidadCalendarMeasureId
	} from '$lib/data/sanidadCalendarData';

	// Mismos id/nombre que el resto de la sección de Sanidad (sanidadBudgetData.ts),
	// sin duplicar los ocho nombres de medida.
	const MEASURES = SANIDAD_BUDGET_MEASURES.map((m) => ({
		id: m.id as SanidadCalendarMeasureId,
		nombre: m.nombre
	}));
	const MEASURE_IDS = MEASURES.map((m) => m.id);

	let year = $state<string>('2032');
	let medida = $state<SanidadCalendarMeasureId | null>(null);

	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const activePhase = $derived(phaseOfYear(year));
	const yearIdx = $derived(
		SANIDAD_CALENDAR_YEARS.indexOf(year as (typeof SANIDAD_CALENDAR_YEARS)[number])
	);
	const gaugePos = $derived((yearIdx / (SANIDAD_CALENDAR_YEARS.length - 1)) * 100);

	const avgRamp = $derived(
		MEASURE_IDS.reduce((s, id) => s + CAL.ramps[id][year], 0) / MEASURE_IDS.length
	);

	const total = $derived(CAL.central.total[year]);
	const prevTotal = $derived(
		yearIdx > 0 ? CAL.central.total[SANIDAD_CALENDAR_YEARS[yearIdx - 1]] : null
	);
	const delta = $derived(prevTotal !== null ? total - prevTotal : null);

	const activos = $derived(yearActiveMilestones(MEASURE_IDS, year));
	const measuresAdvancing = $derived(activos.filter((a) => a.isPrincipal && !a.closure).length);

	const showM2Note = $derived(parseInt(year) >= 2027 && parseInt(year) <= 2030);
	const m2abs = $derived(CAL.backlogAbsorption[year]);

	function selectYear(y: string) {
		year = y;
	}
	function selectMedida(id: SanidadCalendarMeasureId | null) {
		medida = id;
	}

	// ---------------- FICHA: gráfica de coste anual con tooltip ----------------
	let rampWrapEl = $state<HTMLDivElement | null>(null);
	let rampColEls = $state<(HTMLButtonElement | null)[]>([]);
	let hoverIdx = $state<number | null>(null);
	let tooltipLeft = $state(0);
	let fichaEl = $state<HTMLDivElement | null>(null);

	const activeMeasure = $derived(medida ? MEASURES.find((m) => m.id === medida) : null);
	const rampMaxV = $derived(
		activeMeasure
			? Math.max(...SANIDAD_CALENDAR_YEARS.map((y) => CAL.central.byMeasure[activeMeasure.id][y])) *
					1.1
			: 1
	);
	const rampBars = $derived(
		activeMeasure
			? SANIDAD_CALENDAR_YEARS.map((y, i) => {
					const v = CAL.central.byMeasure[activeMeasure.id][y];
					const r = CAL.ramps[activeMeasure.id][y];
					const h = Math.max((v / rampMaxV) * 100, 2);
					return { year: y, i, v, r, h, isNow: y === year };
				})
			: []
	);
	const tooltipData = $derived(
		hoverIdx !== null && activeMeasure
			? {
					year: SANIDAD_CALENDAR_YEARS[hoverIdx],
					v: CAL.central.byMeasure[activeMeasure.id][SANIDAD_CALENDAR_YEARS[hoverIdx]],
					r: CAL.ramps[activeMeasure.id][SANIDAD_CALENDAR_YEARS[hoverIdx]]
				}
			: null
	);

	async function showBarTooltip(idx: number) {
		hoverIdx = idx;
		await tick();
		const container = rampWrapEl;
		const btn = rampColEls[idx];
		if (container && btn) {
			const cRect = container.getBoundingClientRect();
			const bRect = btn.getBoundingClientRect();
			tooltipLeft = bRect.left - cRect.left + bRect.width / 2;
		}
	}
	function hideBarTooltip() {
		hoverIdx = null;
	}

	const resolvedFicha = $derived(activeMeasure ? resolveMeasureYear(activeMeasure.id, year) : null);
	const nh = $derived(activeMeasure ? nextHitoInfo(activeMeasure.id, year) : null);

	$effect(() => {
		if (medida && fichaEl) {
			fichaEl.scrollIntoView({
				behavior: prefersReducedMotion ? 'auto' : 'smooth',
				block: 'nearest'
			});
		}
	});

	function milestoneLabel(y1: number, y2: number): string {
		return y1 === y2 ? String(y1) : `${y1}–${y2}`;
	}
</script>

<div class="sanidad-calendario">
	<!-- ---------- DOS INDICADORES: qué mide cada uno ---------- -->
	<div class="layer-note">
		<div class="layer-cell a">
			<div class="lk">① Despliegue presupuestario</div>
			<p>
				Qué porcentaje de los recursos previstos ya está en funcionamiento, según las rampas de
				implantación.
			</p>
		</div>
		<div class="layer-cell b">
			<div class="lk">② Cumplimiento real</div>
			<p>
				Si el objetivo sanitario se ha alcanzado de verdad. Se comprueba con indicadores y
				evaluación — no lo dice este calendario.
			</p>
		</div>
	</div>

	<!-- ---------- LAS TRES FASES ---------- -->
	<section class="tight block">
		<span class="eyebrow">Las tres fases del plan</span>
		<h3 class="section-title">De rescatar el sistema a corregir lo que no funciona</h3>
		<div class="phases-grid">
			{#each PHASES as p (p.id)}
				<div class="phase-card {p.id}">
					<div class="phase-icon">{p.icon}</div>
					<div class="phase-range">{p.years[0]}–{p.years[p.years.length - 1]}</div>
					<div class="phase-name">{p.nombre}</div>
					<div class="phase-desc">{p.desc}</div>
				</div>
			{/each}
		</div>
	</section>

	<hr class="divider" />

	<!-- ---------- LÍNEA TEMPORAL ---------- -->
	<section class="block">
		<span class="eyebrow">Línea temporal</span>
		<h3 class="section-title">Elige un año</h3>
		<p class="section-desc">
			El indicador muestra el despliegue presupuestario medio de las ocho medidas — no un porcentaje
			de éxito clínico.
		</p>

		<div class="card tl-card">
			<div class="gauge-block">
				<div class="gauge-label-row">
					<span class="gauge-label">① Avance temporal del plan</span>
				</div>
				<div class="gauge-row">
					<div class="gauge-track">
						<div class="gauge-seg g1" style="width:30%"></div>
						<div class="gauge-seg g2" style="width:30%"></div>
						<div class="gauge-seg g3" style="width:40%"></div>
						<div class="gauge-marker" style="left:{gaugePos}%"></div>
					</div>
					<div class="gauge-read">
						<b>Año {year} · posición {yearIdx + 1} de {SANIDAD_CALENDAR_YEARS.length}</b>
					</div>
				</div>
			</div>

			<div class="gauge-block">
				<div class="gauge-label-row">
					<span class="gauge-label">② Despliegue presupuestario</span>
				</div>
				<div class="gauge-row">
					<div
						class="gauge-track fill"
						role="progressbar"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={Math.round(avgRamp * 100)}
						aria-label={`Despliegue presupuestario medio de las ocho medidas en ${year}: ${pct(avgRamp)}`}
					>
						<div class="gauge-fill-bar" style="width:{avgRamp * 100}%"></div>
					</div>
					<div class="gauge-read">Media M1–M8: <b>{pct(avgRamp)}</b></div>
				</div>
				<p class="gauge-caveat">
					Porcentaje de recursos previstos ya activados según el Excel. No representa éxito
					sanitario ni cumplimiento clínico.
				</p>
			</div>

			<div class="timeline">
				{#each PHASES as p (p.id)}
					<div class="phase-group">
						<div class="phase-group-label">{p.nombre}</div>
						<div class="phase-group-years">
							{#each p.years as y (y)}
								{@const ys = String(y)}
								<button
									type="button"
									class="year-node {p.id}"
									class:active={ys === year}
									aria-pressed={ys === year}
									aria-label={`Año ${y}, coste central ${fmt(CAL.central.total[ys])} millones de euros`}
									onclick={() => selectYear(ys)}
								>
									<div class="yr">{y}</div>
									<div class="amt">{fmt(CAL.central.total[ys])} M€</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- ---------- PANEL DEL AÑO ---------- -->
		{#if activePhase}
			<div class="year-panel">
				<div class="yp-arc"></div>
				<div class="yp-top">
					<div>
						<span class="yp-phase-tag">{activePhase.nombre}</span>
						<h3 class="yp-title">{year}</h3>
					</div>
				</div>

				<div class="yp-stats">
					<div class="ypstat">
						<div class="k">Coste incremental central</div>
						<div class="v">{fmt(total)}<span class="unit">M€/año</span></div>
					</div>
					<div class="ypstat">
						<div class="k">Variación vs. año anterior</div>
						<div
							class="v"
							class:up={delta !== null && delta >= 0}
							class:down={delta !== null && delta < 0}
						>
							{delta === null ? '—' : (delta >= 0 ? '+' : '') + fmt(delta)}<span class="unit"
								>{delta === null ? '' : 'M€'}</span
							>
						</div>
					</div>
					<div class="ypstat">
						<div class="k">Medidas con actuación activa</div>
						<div class="v">{measuresAdvancing}<span class="unit">de 8</span></div>
					</div>
				</div>

				<div class="yp-section-label">Actuaciones activas en {year}</div>
				<ul class="yp-hitos">
					{#each activos as h, i (h.mid + '-' + i)}
						<li class={h.isPrincipal ? 'principal' : 'secondary'}>
							<span class="chip {h.tipo}">{h.mid} · {TIPO_LABEL[h.tipo]}</span>
							<span class="mtxt">
								{h.texto}{#if h.isPrincipal}<span class="principal-tag">Etapa principal</span
									>{/if}{#if h.isPrincipal && h.closure}<span class="closure-note"
										>Sin nuevas actuaciones registradas después de {h.finalYear}.</span
									>{/if}
							</span>
							<span class="status">{STATUS_LABEL[h.status]}</span>
						</li>
					{/each}
				</ul>

				<div class="yp-section-label">Despliegue presupuestario por medida</div>
				<div class="yp-measures">
					{#each MEASURES as m (m.id)}
						{@const r = CAL.ramps[m.id][year]}
						{@const cost = CAL.central.byMeasure[m.id][year]}
						<div class="yp-mchip">
							<div class="mid">{m.id}</div>
							<div
								class="mbar"
								role="img"
								aria-label={`${m.id} en ${year}: ${pct(r)} de despliegue presupuestario, ${fmt1(cost)} millones de euros`}
							>
								<i style="width:{r * 100}%"></i>
							</div>
							<div class="mpct">{pct(r)}</div>
						</div>
					{/each}
				</div>

				{#if showM2Note}
					<div class="yp-m2note">
						<span>⚠</span>
						<div>
							<b>M2 · {year}:</b> este año se ejecuta el {pct(m2abs)} del vaciado extraordinario del backlog
							heredado ({fmt(1232)} M€ en total, repartidos 2027–2030). No es gasto recurrente y no vuelve
							a aparecer desde 2031.
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<hr class="divider" />

	<!-- ---------- POR MEDIDA ---------- -->
	<section class="block">
		<div class="section-head">
			<div>
				<span class="eyebrow">Por medida</span>
				<h3 class="section-title">Sigue una medida de principio a fin</h3>
				<p class="section-desc">
					Su calendario completo, su rampa presupuestaria y qué resultado deberá comprobarse.
				</p>
			</div>
			<div class="mfilter" role="group" aria-label="Filtrar por medida">
				<button
					type="button"
					class="mf-btn"
					class:active={medida === null}
					aria-pressed={medida === null}
					onclick={() => selectMedida(null)}
				>
					<span class="chk">{medida === null ? '✓' : ''}</span>Todas
				</button>
				{#each MEASURES as m (m.id)}
					<button
						type="button"
						class="mf-btn"
						class:active={medida === m.id}
						aria-pressed={medida === m.id}
						onclick={() => selectMedida(m.id)}
					>
						<span class="chk">{medida === m.id ? '✓' : ''}</span>{m.id}
					</button>
				{/each}
			</div>
		</div>

		{#if !activeMeasure}
			<!-- ---------- VISTA "TODAS" (compacta) ---------- -->
			<div class="mficha">
				<div class="mficha-top">
					<div>
						<div class="mficha-id">Todas las medidas · {year}</div>
						<h3 class="mficha-name">Vista conjunta M1–M8</h3>
					</div>
				</div>
				<div class="overview-list">
					{#each MEASURES as m (m.id)}
						{@const cs = currentStage(m.id, year)}
						{@const r = CAL.ramps[m.id][year]}
						{@const cost = CAL.central.byMeasure[m.id][year]}
						<button type="button" class="overview-row" onclick={() => selectMedida(m.id)}>
							<div class="ov-name">
								<span class="ov-id">{m.id}</span><span class="ov-nm">{m.nombre}</span>
							</div>
							<span class="ov-stage {cs.tipo}"
								>{TIPO_LABEL[cs.tipo]}{cs.closure ? ' · cerrado' : ''}</span
							>
							<div class="ov-deploy">
								<div class="bar"><i style="width:{r * 100}%"></i></div>
								<span class="val">{pct(r)}</span>
							</div>
							<span class="ov-cost">{fmt1(cost)} M€</span>
							<span class="ov-arrow">›</span>
						</button>
					{/each}
				</div>
			</div>
		{:else if resolvedFicha && nh}
			<!-- ---------- FICHA DE MEDIDA ---------- -->
			<div class="mficha" bind:this={fichaEl}>
				<div class="mficha-top">
					<div>
						<div class="mficha-id">
							{activeMeasure.id} · etapa principal en {year}: {TIPO_LABEL[
								resolvedFicha.principal.tipo
							]}{resolvedFicha.closure
								? ` (sin nuevas actuaciones desde ${resolvedFicha.finalYear})`
								: ''}
						</div>
						<h3 class="mficha-name">{activeMeasure.nombre}</h3>
					</div>
				</div>

				<div class="mficha-grid">
					<div>
						<div class="yp-section-label light">
							Coste central anual (M€) · despliegue presupuestario
						</div>
						<div class="ramp-chart-wrap" bind:this={rampWrapEl}>
							<div class="ramp-chart">
								{#each rampBars as bar, i (bar.year)}
									<button
										bind:this={rampColEls[i]}
										type="button"
										class="ramp-col"
										aria-label={`${activeMeasure.id} en ${bar.year}: ${fmt1(bar.v)} millones de euros, ${pct(bar.r)} de despliegue presupuestario${bar.isNow ? ' (año seleccionado)' : ''}`}
										onmouseenter={() => showBarTooltip(i)}
										onfocus={() => showBarTooltip(i)}
										onclick={() => showBarTooltip(i)}
										onmouseleave={hideBarTooltip}
										onblur={hideBarTooltip}
									>
										<div class="ramp-bar" class:now={bar.isNow} style="height:{bar.h}%">
											<i style="height:100%"></i>
										</div>
										<div class="ramp-yr" class:now={bar.isNow}>{bar.year.slice(2)}</div>
									</button>
								{/each}
							</div>
							{#if tooltipData}
								<div class="bar-tooltip show" style="left:{tooltipLeft}px; top:2px;">
									<div class="bt-year">{tooltipData.year}</div>
									<div class="bt-cost">{fmt1(tooltipData.v)} M€</div>
									<div class="bt-pct">Despliegue: {pct(tooltipData.r)}</div>
								</div>
							{/if}
						</div>
						<div class="yp-section-label light" style="margin-top:18px;">Calendario completo</div>
						<ul class="milestone-list">
							{#each MILESTONES[activeMeasure.id] as ms, i (i)}
								{@const isCurrent = ms === resolvedFicha.principal}
								<li class="milestone-item" class:current={isCurrent}>
									<span class="myear">{milestoneLabel(ms.y1, ms.y2)}</span>
									<span class="mtext">{ms.texto}</span>
									<span class="chip {ms.tipo} light">{TIPO_LABEL[ms.tipo]}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<div class="verify-box">
							<div class="k">Qué deberá comprobarse</div>
							<p>{VERIFY[activeMeasure.id]}</p>
						</div>
						<div class="next-box">
							<div>
								<div class="k">{nh.label}</div>
								<p><b>{milestoneLabel(nh.ms.y1, nh.ms.y2)}</b> · {nh.ms.texto}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- ---------- NOTA DE FUENTES ---------- -->
	<div class="foot-note">
		<div class="foot-col">
			<b>Fuente de los datos</b>
			Presupuesto_CONVOCA_Sanidad_2036.xlsx (pestañas Calendario y Serie) y Memoria_Presupuesto_CONVOCA_Sanidad_2036.md.
			Rampas y costes anuales proceden directamente del libro de cálculo.
		</div>
		<div class="foot-col">
			<b>Qué no dice este calendario</b>
			Que una medida llegue al 100% de su rampa presupuestaria significa que el dinero previsto está desplegado
			— no que el objetivo sanitario esté cumplido. Eso se comprueba con indicadores y evaluación pública.
		</div>
	</div>
</div>

<style>
	/* Estilos del artifact de referencia (calendario_sanidad_2036), encapsulados
	   bajo .sanidad-calendario para no colisionar con el resto del proyecto.
	   Paleta y tipografía del propio artifact (verde/naranja), no los tokens
	   brand/accent del resto de la página: aquí el objetivo es conservar
	   exactamente su diseño. Las fuentes usan las variables globales del
	   proyecto (--font-display/--font-sans) en vez de volver a cargarlas. */
	.sanidad-calendario {
		--verde-950: #0a2620;
		--verde-900: #0f3d30;
		--verde-800: #155440;
		--verde-700: #1c6e52;
		--verde-600: #248264;
		--verde-500: #2f9c76;
		--verde-300: #8fd3b6;
		--verde-100: #e3f4ec;
		--naranja-600: #a8420f;
		--naranja-500: #ef7b2e;
		--naranja-400: #f6994f;
		--naranja-100: #fdead9;
		--papel: #fbfaf6;
		--papel-2: #f3f1ea;
		--tinta: #152420;
		--tinta-60: #4c5d57;
		--tinta-40: #5f6f69;
		--linea: #dfdccf;
		--blanco: #ffffff;
		--sombra: 0 1px 2px rgba(15, 61, 48, 0.06), 0 8px 24px -12px rgba(15, 61, 48, 0.18);
		--radio: 18px;
		--ff-display: var(--font-display, 'Space Grotesk Variable', sans-serif);
		--ff-body: var(--font-sans, 'Inter Variable', sans-serif);
		--ff-mono:
			ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, 'Liberation Mono', monospace;
		--f1: #1c6e52;
		--f2: #ef7b2e;
		--f3: #155440;

		font-family: var(--ff-body);
		color: var(--tinta);
		line-height: 1.5;
	}
	@media (prefers-reduced-motion: reduce) {
		.sanidad-calendario,
		.sanidad-calendario *,
		.sanidad-calendario *::before,
		.sanidad-calendario *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
			scroll-behavior: auto !important;
		}
	}
	.sanidad-calendario * {
		box-sizing: border-box;
	}
	.sanidad-calendario a {
		color: inherit;
	}
	.sanidad-calendario button {
		font-family: inherit;
	}
	.sanidad-calendario :focus-visible {
		outline: 3px solid var(--naranja-500);
		outline-offset: 2px;
	}

	.eyebrow {
		font-family: var(--ff-mono);
		font-size: 12px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--verde-700);
		font-weight: 600;
	}

	/* ---------- LAYER NOTE (qué mide cada indicador) ---------- */
	.layer-note {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--linea);
		border: 1px solid var(--linea);
		border-radius: var(--radio);
		overflow: hidden;
		margin-bottom: 24px;
	}
	@media (max-width: 640px) {
		.layer-note {
			grid-template-columns: 1fr;
		}
	}
	.layer-cell {
		background: var(--papel-2);
		padding: 16px 18px;
	}
	.layer-cell .lk {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde-700);
		margin-bottom: 6px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.layer-cell p {
		margin: 0;
		font-size: 13px;
		color: var(--tinta-60);
	}
	.layer-cell.b .lk {
		color: var(--naranja-600);
	}

	/* ---------- PHASES ---------- */
	section.block {
		padding: 32px 0;
	}
	section.block.tight {
		padding: 8px 0 24px;
	}
	.section-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(19px, 2.2vw, 24px);
		margin: 6px 0 0;
		letter-spacing: -0.01em;
	}
	.section-desc {
		color: var(--tinta-60);
		font-size: 14.5px;
		max-width: 600px;
		margin-top: 6px;
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
		margin-bottom: 22px;
		flex-wrap: wrap;
	}
	.divider {
		height: 1px;
		background: var(--linea);
		border: 0;
		margin: 0;
	}

	.phases-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
		margin-top: 14px;
	}
	@media (max-width: 820px) {
		.phases-grid {
			grid-template-columns: 1fr;
		}
	}
	.phase-card {
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 18px;
		padding: 20px 20px 18px;
		position: relative;
		overflow: hidden;
	}
	.phase-card.p1 {
		border-top: 4px solid var(--f1);
	}
	.phase-card.p2 {
		border-top: 4px dashed var(--f2);
	}
	.phase-card.p3 {
		border-top: 4px dotted var(--f3);
	}
	.phase-icon {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		margin-bottom: 12px;
		color: #fff;
	}
	.phase-card.p1 .phase-icon {
		background: var(--f1);
	}
	.phase-card.p2 .phase-icon {
		background: var(--f2);
	}
	.phase-card.p3 .phase-icon {
		background: var(--f3);
	}
	.phase-range {
		font-family: var(--ff-mono);
		font-size: 11px;
		color: var(--tinta-40);
		letter-spacing: 0.04em;
	}
	.phase-name {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 16.5px;
		margin: 4px 0 8px;
	}
	.phase-desc {
		font-size: 13px;
		color: var(--tinta-60);
		line-height: 1.55;
	}

	/* ---------- TIMELINE / GAUGE ---------- */
	.card {
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: var(--radio);
		box-shadow: var(--sombra);
	}
	.tl-card {
		padding: 22px;
		margin-top: 14px;
	}
	@media (max-width: 640px) {
		.tl-card {
			padding: 16px;
		}
	}

	.gauge-block {
		margin-bottom: 16px;
	}
	.gauge-block:last-of-type {
		margin-bottom: 22px;
	}
	.gauge-label-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 7px;
		flex-wrap: wrap;
	}
	.gauge-label {
		font-family: var(--ff-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tinta-40);
	}
	.gauge-row {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.gauge-track {
		flex: 1;
		min-width: 200px;
		height: 10px;
		border-radius: 99px;
		overflow: hidden;
		display: flex;
		position: relative;
		background: var(--papel-2);
	}
	.gauge-seg {
		height: 100%;
	}
	.gauge-seg.g1 {
		background: var(--f1);
	}
	.gauge-seg.g2 {
		background: repeating-linear-gradient(
			45deg,
			var(--f2),
			var(--f2) 5px,
			#f7a969 5px,
			#f7a969 10px
		);
	}
	.gauge-seg.g3 {
		background: var(--f3);
		opacity: 0.35;
		border: 1.5px dotted var(--f3);
	}
	.gauge-track.fill {
		background: var(--papel-2);
	}
	.gauge-fill-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: var(--naranja-500);
		border-radius: 99px;
		transition: width 0.25s ease;
	}
	.gauge-marker {
		position: absolute;
		top: 50%;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		border: 3px solid var(--naranja-600);
		transform: translate(-50%, -50%);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
		transition: left 0.25s ease;
	}
	.gauge-read {
		font-family: var(--ff-mono);
		font-size: 12px;
		color: var(--tinta-60);
		white-space: nowrap;
	}
	.gauge-read b {
		color: var(--verde-800);
		font-size: 14px;
	}
	.gauge-caveat {
		font-size: 11.5px;
		color: var(--tinta-40);
		margin-top: 6px;
		max-width: 520px;
	}

	.timeline {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding-bottom: 6px;
		scroll-snap-type: x proximity;
	}
	@media (max-width: 760px) {
		.timeline {
			flex-direction: column;
			overflow-x: visible;
		}
	}

	.phase-group {
		flex: 1;
		min-width: 0;
	}
	.phase-group-label {
		font-family: var(--ff-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tinta-40);
		margin-bottom: 8px;
		padding-left: 2px;
	}
	.phase-group-years {
		display: flex;
		gap: 6px;
	}
	@media (max-width: 760px) {
		.phase-group-years {
			flex-wrap: wrap;
		}
	}

	.year-node {
		flex: 1;
		min-width: 64px;
		min-height: 44px;
		background: var(--papel-2);
		border: 1.5px solid var(--linea);
		border-radius: 14px;
		padding: 12px 8px 10px;
		text-align: center;
		cursor: pointer;
		transition: all 0.15s ease;
		scroll-snap-align: start;
	}
	.year-node .yr {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 16px;
	}
	.year-node .amt {
		font-family: var(--ff-mono);
		font-size: 10px;
		color: var(--tinta-40);
		margin-top: 3px;
	}
	.year-node:hover {
		border-color: var(--verde-500);
	}
	.year-node.active {
		background: var(--verde-900);
		border-color: var(--verde-900);
	}
	.year-node.active .yr {
		color: #fff;
	}
	.year-node.active .amt {
		color: var(--verde-300);
	}
	.year-node.p1 {
		border-left: 3px solid var(--f1);
	}
	.year-node.p2 {
		border-left: 3px dashed var(--f2);
	}
	.year-node.p3 {
		border-left: 3px dotted var(--f3);
	}

	/* ---------- YEAR PANEL ---------- */
	.year-panel {
		margin-top: 18px;
		background: var(--verde-950);
		color: var(--papel);
		border-radius: 20px;
		padding: 26px;
		position: relative;
		overflow: hidden;
	}
	@media (max-width: 640px) {
		.year-panel {
			padding: 18px;
		}
	}
	.yp-arc {
		position: absolute;
		right: -140px;
		top: -140px;
		width: 340px;
		height: 340px;
		border-radius: 50%;
		border: 70px solid rgba(255, 255, 255, 0.05);
		pointer-events: none;
	}
	.yp-top {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}
	.yp-phase-tag {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 4px 10px;
		border-radius: 999px;
		display: inline-block;
		margin-bottom: 8px;
		background: rgba(255, 255, 255, 0.1);
		color: var(--verde-300);
	}
	.yp-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(24px, 3vw, 34px);
		margin: 0;
	}
	.yp-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
		margin: 20px 0;
		position: relative;
		z-index: 1;
	}
	@media (max-width: 640px) {
		.yp-stats {
			grid-template-columns: 1fr 1fr;
		}
	}
	.ypstat {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.ypstat .k {
		font-family: var(--ff-mono);
		font-size: 10px;
		color: var(--verde-300);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.ypstat .v {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 19px;
		margin-top: 5px;
	}
	.ypstat .v .unit {
		font-size: 0.52em;
		color: var(--verde-300);
		margin-left: 3px;
		font-weight: 500;
	}
	.ypstat .v.up {
		color: #a8e6c9;
	}
	.ypstat .v.down {
		color: #f6994f;
	}

	.yp-section-label {
		font-family: var(--ff-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde-300);
		margin: 18px 0 10px;
		position: relative;
		z-index: 1;
	}
	.yp-section-label.light {
		color: var(--verde-700);
	}
	.yp-hitos {
		list-style: none;
		margin: 0;
		padding: 0;
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.yp-hitos li {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font-size: 13.5px;
		color: rgba(255, 255, 255, 0.88);
	}
	.chip {
		flex: 0 0 auto;
		font-family: var(--ff-mono);
		font-size: 9.5px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 2px 8px;
		border-radius: 999px;
		margin-top: 1px;
	}
	.chip.marcha {
		background: rgba(143, 211, 182, 0.2);
		color: #a8e6c9;
	}
	.chip.ampliacion {
		background: rgba(246, 153, 79, 0.2);
		color: #f6994f;
	}
	.chip.garantia {
		background: rgba(239, 123, 46, 0.28);
		color: #ffb37a;
	}
	.chip.evaluacion {
		background: rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.8);
	}
	.chip.consolidacion {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
	}

	.yp-hitos .status {
		flex: 0 0 auto;
		font-family: var(--ff-mono);
		font-size: 9px;
		letter-spacing: 0.03em;
		padding: 2px 7px;
		border-radius: 999px;
		margin-top: 1px;
		border: 1px solid rgba(255, 255, 255, 0.28);
		color: rgba(255, 255, 255, 0.75);
	}
	.yp-hitos .mtxt {
		flex: 1;
		min-width: 0;
	}
	.yp-hitos .closure-note {
		opacity: 0.75;
		font-style: italic;
		display: block;
		margin-top: 2px;
		font-size: 12.5px;
	}
	.yp-hitos li.principal {
		border-left: 3px solid var(--naranja-500);
		padding-left: 8px;
	}
	.yp-hitos li.secondary {
		opacity: 0.82;
		padding-left: 11px;
	}
	.yp-hitos .principal-tag {
		font-family: var(--ff-mono);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--naranja-400);
		margin-left: 8px;
		white-space: nowrap;
	}

	.yp-measures {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		position: relative;
		z-index: 1;
		margin-top: 6px;
	}
	@media (max-width: 640px) {
		.yp-measures {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.yp-mchip {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 9px 10px;
	}
	.yp-mchip .mid {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		color: var(--verde-300);
		font-weight: 600;
	}
	.yp-mchip .mbar {
		height: 5px;
		border-radius: 99px;
		background: rgba(255, 255, 255, 0.12);
		margin-top: 6px;
		overflow: hidden;
	}
	.yp-mchip .mbar i {
		display: block;
		height: 100%;
		background: var(--naranja-500);
	}
	.yp-mchip .mpct {
		font-family: var(--ff-mono);
		font-size: 10px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 4px;
	}

	.yp-m2note {
		margin-top: 16px;
		display: flex;
		gap: 10px;
		align-items: flex-start;
		background: rgba(239, 123, 46, 0.12);
		border: 1px solid rgba(239, 123, 46, 0.3);
		border-radius: 14px;
		padding: 13px 15px;
		font-size: 13px;
		color: #fff;
		position: relative;
		z-index: 1;
	}
	.yp-m2note b {
		color: #ffb37a;
	}

	/* ---------- MEASURE FILTER ---------- */
	.mfilter {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.mf-btn {
		border: 1.5px solid var(--linea);
		background: var(--blanco);
		padding: 8px 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
		color: var(--tinta-60);
		cursor: pointer;
		transition: all 0.15s;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.mf-btn:hover {
		border-color: var(--verde-500);
	}
	.mf-btn.active {
		background: var(--verde-900);
		border-color: var(--verde-900);
		color: #fff;
	}
	.mf-btn .chk {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		flex: 0 0 auto;
	}
	.mf-btn.active .chk {
		background: #fff;
		color: var(--verde-900);
		border-color: #fff;
	}

	/* ---------- VISTA "TODAS" ---------- */
	.overview-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.overview-row {
		display: grid;
		grid-template-columns: 1.6fr auto auto auto auto;
		align-items: center;
		gap: 14px;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 14px;
		padding: 12px 16px;
		cursor: pointer;
		text-align: left;
		width: 100%;
		min-height: 44px;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.overview-row:hover {
		border-color: var(--verde-500);
		transform: translateY(-1px);
	}
	@media (max-width: 760px) {
		.overview-row {
			grid-template-columns: 1fr;
			gap: 6px;
			padding: 14px 16px;
		}
	}
	.ov-name {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.ov-id {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		color: var(--verde-700);
		font-weight: 700;
	}
	.ov-nm {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--tinta);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (max-width: 760px) {
		.ov-nm {
			white-space: normal;
		}
	}
	.ov-stage {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		padding: 3px 9px;
		border-radius: 999px;
		white-space: nowrap;
		justify-self: start;
	}
	.ov-stage.marcha {
		background: var(--verde-100);
		color: var(--verde-800);
	}
	.ov-stage.ampliacion {
		background: var(--naranja-100);
		color: var(--naranja-600);
	}
	.ov-stage.garantia {
		background: #fde2cc;
		color: var(--naranja-600);
	}
	.ov-stage.evaluacion {
		background: var(--papel-2);
		border: 1px solid var(--linea);
		color: var(--tinta-60);
	}
	.ov-stage.consolidacion {
		background: #eef0ec;
		color: var(--tinta-40);
	}
	.ov-deploy {
		display: flex;
		align-items: center;
		gap: 7px;
		min-width: 90px;
	}
	.ov-deploy .bar {
		width: 52px;
		height: 6px;
		border-radius: 99px;
		background: var(--papel-2);
		overflow: hidden;
		flex: 0 0 auto;
	}
	.ov-deploy .bar i {
		display: block;
		height: 100%;
		background: var(--verde-600);
	}
	.ov-deploy .val {
		font-family: var(--ff-mono);
		font-size: 11px;
		color: var(--tinta-60);
		white-space: nowrap;
	}
	.ov-cost {
		font-family: var(--ff-mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--verde-800);
		white-space: nowrap;
		justify-self: end;
	}
	@media (max-width: 760px) {
		.ov-cost {
			justify-self: start;
		}
	}
	.ov-arrow {
		color: var(--tinta-40);
		font-size: 14px;
		justify-self: end;
	}
	@media (max-width: 760px) {
		.ov-arrow {
			display: none;
		}
	}

	/* ---------- MEASURE CARD (ficha) ---------- */
	.mficha {
		margin-top: 18px;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 20px;
		padding: 24px;
	}
	@media (max-width: 640px) {
		.mficha {
			padding: 18px;
		}
	}
	.mficha-top {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
		flex-wrap: wrap;
		margin-bottom: 18px;
	}
	.mficha-id {
		font-family: var(--ff-mono);
		font-size: 11px;
		color: var(--verde-700);
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.mficha-name {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 19px;
		margin: 4px 0 0;
		max-width: 520px;
	}

	.mficha-grid {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 22px;
	}
	@media (max-width: 820px) {
		.mficha-grid {
			grid-template-columns: 1fr;
		}
	}
	/* min-width:0 evita que el ancho mínimo de contenido del gráfico de barras
	   (10 columnas) empuje la cuadrícula — y con ella la página entera — a ser
	   más ancha que el viewport en móvil; el propio gráfico ya se desplaza en
	   horizontal con su overflow-x:auto. Sin esto, la cuadrícula no encoge por
	   debajo del ancho mínimo de su contenido (comportamiento por defecto de
	   CSS Grid) y aparece scroll horizontal de página en anchos estrechos —
	   igual en el artifact de referencia sin adaptar. */
	.mficha-grid > div {
		min-width: 0;
	}

	.ramp-chart-wrap {
		position: relative;
	}
	.ramp-chart {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 130px;
		margin: 12px 0 4px;
		overflow-x: auto;
		padding: 0 2px 2px;
	}
	.ramp-col {
		flex: 1 0 44px;
		min-width: 44px;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		height: 100%;
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
		border-radius: 8px;
	}
	.ramp-col:hover,
	.ramp-col:focus-visible {
		background: var(--papel-2);
	}
	.ramp-bar {
		width: 100%;
		max-width: 30px;
		background: var(--papel-2);
		border-radius: 5px 5px 0 0;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		min-height: 3px;
	}
	.ramp-bar i {
		display: block;
		width: 100%;
		background: var(--verde-600);
	}
	.ramp-bar.now i {
		background: var(--naranja-500);
	}
	.ramp-yr {
		font-family: var(--ff-mono);
		font-size: 9.5px;
		color: var(--tinta-40);
		margin-top: 5px;
	}
	.ramp-yr.now {
		color: var(--naranja-600);
		font-weight: 700;
	}

	.bar-tooltip {
		position: absolute;
		pointer-events: none;
		background: var(--verde-950);
		color: #fff;
		border-radius: 12px;
		padding: 10px 13px;
		font-size: 12px;
		min-width: 150px;
		box-shadow: 0 12px 32px -8px rgba(10, 38, 32, 0.5);
		opacity: 0;
		transform: translate(-50%, -100%) translateY(-8px);
		transition: opacity 0.1s ease;
		z-index: 20;
	}
	.bar-tooltip.show {
		opacity: 1;
	}
	.bar-tooltip .bt-year {
		font-family: var(--ff-mono);
		color: var(--verde-300);
		font-size: 10.5px;
		margin-bottom: 4px;
	}
	.bar-tooltip .bt-cost {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 15px;
	}
	.bar-tooltip .bt-pct {
		color: rgba(255, 255, 255, 0.75);
		margin-top: 3px;
	}

	.milestone-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.milestone-item {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 11px 12px;
		border-radius: 12px;
		background: var(--papel-2);
	}
	.milestone-item.current {
		outline: 2px solid var(--verde-500);
		outline-offset: -2px;
	}
	.milestone-item .myear {
		font-family: var(--ff-mono);
		font-weight: 700;
		font-size: 12.5px;
		color: var(--verde-800);
		flex: 0 0 auto;
		min-width: 52px;
	}
	.milestone-item .mtext {
		font-size: 13px;
		color: var(--tinta-60);
		flex: 1;
	}
	.milestone-item .chip {
		flex: 0 0 auto;
	}
	.chip.marcha.light {
		background: var(--verde-100);
		color: var(--verde-800);
	}
	.chip.ampliacion.light {
		background: var(--naranja-100);
		color: var(--naranja-600);
	}
	.chip.garantia.light {
		background: #fde2cc;
		color: var(--naranja-600);
	}
	.chip.evaluacion.light {
		background: var(--papel-2);
		border: 1px solid var(--linea);
		color: var(--tinta-60);
	}
	.chip.consolidacion.light {
		background: #eef0ec;
		color: var(--tinta-40);
	}

	.verify-box {
		margin-top: 16px;
		background: var(--verde-100);
		border: 1px solid rgba(28, 110, 82, 0.2);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.verify-box .k {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--verde-700);
		margin-bottom: 5px;
	}
	.verify-box p {
		margin: 0;
		font-size: 13px;
		color: var(--verde-900);
		line-height: 1.55;
	}

	.next-box {
		margin-top: 12px;
		display: flex;
		gap: 10px;
		align-items: flex-start;
		background: var(--naranja-100);
		border: 1px solid rgba(239, 123, 46, 0.28);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.next-box .k {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--naranja-600);
		margin-bottom: 5px;
	}
	.next-box p {
		margin: 0;
		font-size: 13px;
		color: var(--verde-950);
		line-height: 1.5;
	}

	/* ---------- NOTA DE FUENTES ---------- */
	.foot-note {
		margin-top: 28px;
		padding-top: 20px;
		border-top: 1px solid var(--linea);
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
	}
	.foot-col {
		font-size: 12.5px;
		max-width: 440px;
		color: var(--tinta-60);
	}
	.foot-col b {
		color: var(--tinta);
		display: block;
		margin-bottom: 6px;
		font-family: var(--ff-display);
		font-size: 13.5px;
	}
</style>
