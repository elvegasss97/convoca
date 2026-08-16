<script lang="ts">
	import { tick } from 'svelte';
	import {
		STAGES,
		RETURN_STAGE,
		ALL_STAGES,
		EXAMPLES,
		STATUS_LABEL,
		type HomeStageId,
		type HomeExampleId
	} from '$lib/data/homeIntroData';

	let containerEl = $state<HTMLDivElement | null>(null);
	let circuitSize = $state(0);

	let active = $state<HomeStageId | null>(null);
	let exampleTab = $state<HomeExampleId>('sanidad');

	const exampleIds = EXAMPLES.map((e) => e.id);
	const activeStage = $derived(active ? ALL_STAGES.find((s) => s.id === active) : undefined);
	const activeExample = $derived(EXAMPLES.find((e) => e.id === exampleTab)!);
	const currentIdx = $derived(active ? ALL_STAGES.findIndex((s) => s.id === active) : -1);

	const metrics = $derived(
		circuitSize ? { cx: circuitSize / 2, cy: circuitSize / 2, radius: circuitSize / 2 - 58 } : null
	);
	const arcPath = $derived.by(() => {
		if (!metrics) return null;
		const a0 = (-90 * Math.PI) / 180;
		const a5 = (210 * Math.PI) / 180;
		const x0 = metrics.cx + metrics.radius * Math.cos(a0);
		const y0 = metrics.cy + metrics.radius * Math.sin(a0);
		const x5 = metrics.cx + metrics.radius * Math.cos(a5);
		const y5 = metrics.cy + metrics.radius * Math.sin(a5);
		return `M ${x5.toFixed(1)},${y5.toFixed(1)} A ${metrics.radius},${metrics.radius} 0 0,1 ${x0.toFixed(1)},${y0.toFixed(1)}`;
	});

	function stageAngleRad(i: number) {
		return ((-90 + i * 60) * Math.PI) / 180;
	}
	const RETURN_ANGLE_RAD = (240 * Math.PI) / 180;

	function selectStage(id: HomeStageId) {
		active = active === id ? null : id;
	}
	function goToStage(id: HomeStageId) {
		active = id;
	}
	function resetCycle() {
		active = null;
	}
	function prevStage() {
		const i = currentIdx;
		const next = i <= 0 ? ALL_STAGES.length - 1 : i - 1;
		goToStage(ALL_STAGES[next].id);
	}
	function nextStage() {
		const i = currentIdx;
		const next = i < 0 || i >= ALL_STAGES.length - 1 ? 0 : i + 1;
		goToStage(ALL_STAGES[next].id);
	}
	function activateExampleTab(id: HomeExampleId, moveFocus: boolean) {
		exampleTab = id;
		if (moveFocus) {
			tick().then(() => {
				containerEl?.querySelector<HTMLButtonElement>(`#tab-${id}`)?.focus();
			});
		}
	}
	function onExampleTabsKeydown(e: KeyboardEvent) {
		const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
		if (!keys.includes(e.key)) return;
		e.preventDefault();
		let idx = exampleIds.indexOf(exampleTab);
		if (e.key === 'ArrowRight') idx = (idx + 1) % exampleIds.length;
		else if (e.key === 'ArrowLeft') idx = (idx - 1 + exampleIds.length) % exampleIds.length;
		else if (e.key === 'Home') idx = 0;
		else if (e.key === 'End') idx = exampleIds.length - 1;
		activateExampleTab(exampleIds[idx], true);
	}
</script>

<div class="home-intro" bind:this={containerEl}>
	<!-- ============ HERO ============ -->
	<header class="hero">
		<div class="hero-c"></div>
		<div class="hero-c2"></div>
		<div class="wrap">
			<div class="hero-eyebrow">Plataforma de participación ciudadana</div>
			<h1 class="hero-title">
				Convierte un problema compartido en una propuesta y una acción colectiva.
			</h1>
			<p class="hero-sub">
				CONVOCA es una plataforma ciudadana para señalar problemas, revisar soluciones concretas y
				organizar convocatorias.
			</p>
			<p class="hero-sub-secondary">
				Participa en decisiones concretas, sin tener que aceptar un paquete político completo.
			</p>

			<h2 class="doors-heading" id="doors-heading">¿Qué quieres hacer hoy?</h2>
			<div class="doors" role="group" aria-labelledby="doors-heading">
				<a class="door" href="/pulso">
					<span class="d-ic" aria-hidden="true">◉</span>
					<span class="d-tt">Contar un problema</span>
					<span class="d-desc">Explica qué ocurre, dónde pasa y cómo te afecta.</span>
					<span class="d-go">Ir a Pulso Ciudadano →</span>
				</a>
				<a class="door" href="/pulso/soluciones">
					<span class="d-ic" aria-hidden="true">✎</span>
					<span class="d-tt">Revisar soluciones</span>
					<span class="d-desc">Consulta medidas, costes, plazos, riesgos y fuentes.</span>
					<span class="d-go">Ver soluciones →</span>
				</a>
				<a class="door" href="/descubrir">
					<span class="d-ic" aria-hidden="true">▶</span>
					<span class="d-tt">Ver convocatorias</span>
					<span class="d-desc">Encuentra una cerca de ti o crea una nueva.</span>
					<span class="d-go">Ir al mapa →</span>
				</a>
			</div>

			<div class="hero-note">
				<svg
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					style="flex:0 0 auto;margin-top:2px;"
					aria-hidden="true"
					><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" /><path
						d="M12 8v5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/><circle cx="12" cy="16" r="1" fill="currentColor" /></svg
				>
				<span
					>Ya puedes explorar convocatorias, participar en propuestas y consultar los planes de
					Vivienda, Sanidad y Ceuta.</span
				>
			</div>
		</div>
	</header>

	<!-- ============ CICLO INTERACTIVO ============ -->
	<section class="block" id="ciclo">
		<div class="wrap">
			<div class="section-head">
				<span class="eyebrow">De una preocupación a una solución real</span>
				<h2 class="section-title">El ciclo de CONVOCA</h2>
				<p class="section-desc">
					Elige una etapa para ver qué ocurre, qué herramienta se relaciona y qué estado tiene ahora
					mismo.
				</p>
			</div>

			<div class="legend">
				<span class="legend-item"
					><span class="legend-dot disponible" aria-hidden="true"></span>Disponible ahora</span
				>
				<span class="legend-item"
					><span class="legend-dot desarrollo" aria-hidden="true"></span>En desarrollo</span
				>
			</div>

			<div class="cycle-controls">
				<button type="button" class="ctrl-btn" onclick={prevStage}>← Anterior</button>
				<button type="button" class="ctrl-btn" onclick={nextStage}>Siguiente →</button>
				<button type="button" class="ctrl-btn reset" onclick={resetCycle}>↺ Reiniciar</button>
			</div>

			<!-- Escritorio: circuito -->
			<div class="circuit-desktop">
				<div class="circuit-area">
					<div class="circuit-wrap" bind:clientWidth={circuitSize}>
						<svg class="circuit-svg" viewBox="0 0 {circuitSize} {circuitSize}" aria-hidden="true">
							{#if metrics}
								<circle
									cx={metrics.cx}
									cy={metrics.cy}
									r={metrics.radius}
									fill="none"
									stroke="var(--linea)"
									stroke-width="2"
								/>
							{/if}
							{#if arcPath}
								<path
									d={arcPath}
									fill="none"
									stroke="var(--naranja-500)"
									stroke-width="2.5"
									stroke-dasharray="2 7"
									stroke-linecap="round"
								/>
							{/if}
						</svg>
						<div class="circuit-center">
							<div class="cc-label">Ciclo continuo</div>
							<div class="cc-title">
								{activeStage ? activeStage.nombre : 'Selecciona una etapa'}
							</div>
						</div>

						{#if metrics}
							{#each STAGES as s, i (s.id)}
								{@const angle = stageAngleRad(i)}
								{@const x = metrics.cx + metrics.radius * Math.cos(angle)}
								{@const y = metrics.cy + metrics.radius * Math.sin(angle)}
								<button
									type="button"
									class="node"
									style="left:{x}px;top:{y}px"
									aria-pressed={active === s.id}
									aria-label={`${s.nombre}. Estado: ${STATUS_LABEL[s.estado]}.`}
									onclick={() => selectStage(s.id)}
								>
									<span class="n-ic" aria-hidden="true">{s.icono}</span>
									<span class="n-tt">{s.nombre}</span>
									<span class="n-badge {s.estado}" aria-hidden="true"></span>
								</button>
							{/each}
							{@const rx = metrics.cx + (metrics.radius + 26) * Math.cos(RETURN_ANGLE_RAD)}
							{@const ry = metrics.cy + (metrics.radius + 26) * Math.sin(RETURN_ANGLE_RAD)}
							<button
								type="button"
								class="node-return"
								style="left:{rx}px;top:{ry}px"
								aria-pressed={active === RETURN_STAGE.id}
								aria-label={`${RETURN_STAGE.nombre}. Estado: ${STATUS_LABEL[RETURN_STAGE.estado]}.`}
								onclick={() => selectStage(RETURN_STAGE.id)}
							>
								<span class="r-ic" aria-hidden="true">↺</span><span>Corregir</span>
							</button>
						{/if}
					</div>

					<div class="panel" id="panel" aria-live="polite">
						<div class="panel-arc"></div>
						{#if !activeStage}
							<div class="panel-empty">
								Toca cualquier etapa del ciclo —o el conector «Corregir»— para ver su explicación,
								su herramienta relacionada y su estado real.
							</div>
						{:else}
							<div class="panel-body">
								<div class="panel-eyebrow">
									Etapa {activeStage.num <= 6 ? `${activeStage.num} de 6` : 'conector de cierre'}
								</div>
								<h3 class="panel-title">
									<span class="p-ic" aria-hidden="true">{activeStage.icono}</span
									>{activeStage.nombre}
								</h3>
								<div class="status-pill {activeStage.estado}">
									<span class="status-dot" aria-hidden="true"></span>{STATUS_LABEL[
										activeStage.estado
									]}
								</div>
								<p class="panel-resumen">{activeStage.resumen}</p>
								<div class="panel-row">
									<div class="panel-chip">
										<div class="pk">Herramienta relacionada</div>
										<div class="pv">{activeStage.herramienta}</div>
									</div>
								</div>
								<p class="panel-estadonota">{activeStage.estadoNota}</p>
								{#if activeStage.accion}
									<a class="panel-cta" href={activeStage.accion.href}
										><span>{activeStage.accion.label}</span><span aria-hidden="true">→</span></a
									>
								{:else}
									<p class="panel-noaccion">
										Todavía no hay una acción directa confirmada para esta etapa.
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Móvil: acordeón vertical -->
			<div class="circuit-mobile">
				<div class="accordion">
					{#each ALL_STAGES as s (s.id)}
						{@const isReturn = s.id === 'corregir'}
						{@const isActive = active === s.id}
						<div class="acc-item" class:active={isActive} class:return={isReturn}>
							<button
								type="button"
								class="acc-head"
								aria-expanded={isActive}
								aria-controls="accbody-{s.id}"
								onclick={() => selectStage(s.id)}
							>
								<span class="acc-ic" aria-hidden="true">{s.icono}</span>
								<span class="acc-tt">{s.nombre}</span>
								{#if !isReturn}<span class="acc-badge {s.estado}" aria-hidden="true"></span>{/if}
								<span class="acc-chev" aria-hidden="true">⌄</span>
							</button>
							<div class="acc-body" id="accbody-{s.id}">
								<div class="acc-body-inner">
									<p class="acc-resumen">{s.resumen}</p>
									<div class="acc-meta">
										<div class="acc-meta-row"><b>Herramienta:</b> {s.herramienta}</div>
										<div class="acc-meta-row">
											<b>Estado:</b>
											{STATUS_LABEL[s.estado]} — {s.estadoNota}
										</div>
									</div>
									{#if s.accion}
										<a class="acc-cta" href={s.accion.href}
											><span>{s.accion.label}</span><span aria-hidden="true">→</span></a
										>
									{:else}
										<p class="acc-noaccion">
											Todavía no hay una acción directa confirmada para esta etapa.
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ============ EJEMPLOS DINÁMICOS ============ -->
	<section class="examples-section block">
		<div class="wrap">
			<div class="section-head">
				<span class="eyebrow">Cómo se ve en la práctica</span>
				<h2 class="section-title">Un recorrido corto y real</h2>
				<p class="section-desc">De un problema concreto a una acción o comprobación concreta.</p>
			</div>

			<div
				class="example-tabs"
				role="tablist"
				aria-label="Ejemplos por ámbito"
				onkeydown={onExampleTabsKeydown}
			>
				{#each EXAMPLES as ex (ex.id)}
					{@const on = exampleTab === ex.id}
					<button
						type="button"
						class="ex-tab"
						role="tab"
						id="tab-{ex.id}"
						aria-selected={on}
						aria-controls="exampleCard"
						tabindex={on ? 0 : -1}
						onclick={() => activateExampleTab(ex.id, false)}>{ex.nombre}</button
					>
				{/each}
			</div>

			<div
				class="example-card"
				id="exampleCard"
				role="tabpanel"
				aria-labelledby="tab-{activeExample.id}"
				tabindex="0"
			>
				<div class="ex-left">
					<div class="ex-kicker">Problema</div>
					<div class="ex-problema">{activeExample.problema}</div>
					<div class="ex-flecha" aria-hidden="true">↓</div>
					<div class="ex-kicker">Solución</div>
					<div class="ex-solucion">{activeExample.solucion}</div>
				</div>
				<div class="ex-right">
					<div class="ex-points">
						{#each activeExample.puntos as p (p)}
							<div class="ex-point">
								<span class="ep-dot" aria-hidden="true"></span><span>{p}</span>
							</div>
						{/each}
					</div>
					<a class="ex-cta" href={activeExample.accion.href}
						><span>{activeExample.accion.label}</span><span aria-hidden="true">→</span></a
					>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ PUENTE FINAL ============ -->
	<section class="block">
		<div class="wrap">
			<div class="bridge">
				<div class="bridge-arc"></div>
				<h2 class="bridge-title">La acción ciudadana empieza aquí</h2>
				<a class="bridge-cta" href="/descubrir">
					<span>Ver convocatorias activas</span>
					<span aria-hidden="true">→</span>
				</a>
			</div>
		</div>
	</section>
</div>

<style>
	/* Estilos del artifact aprobado (home_intro_convoca), encapsulados bajo
	   .home-intro para no colisionar con el resto del proyecto. Paleta y
	   tipografía del propio artifact (verde/naranja), no los tokens
	   brand/accent del resto de la home: aquí el objetivo es conservar
	   exactamente su diseño aprobado. Las fuentes usan las variables
	   globales del proyecto (--font-display/--font-sans) en vez de volver a
	   cargarlas. */
	.home-intro {
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

		display: block;
		background: var(--papel);
		color: var(--tinta);
		font-family: var(--ff-body);
		line-height: 1.55;
	}
	@media (prefers-reduced-motion: reduce) {
		.home-intro,
		.home-intro *,
		.home-intro *::before,
		.home-intro *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
			scroll-behavior: auto !important;
		}
	}
	.home-intro * {
		box-sizing: border-box;
	}
	.home-intro a {
		color: inherit;
		text-decoration: none;
	}
	.home-intro button {
		font-family: inherit;
	}
	.home-intro ul {
		margin: 0;
		padding: 0;
	}
	.home-intro :focus-visible {
		outline: 3px solid var(--naranja-500);
		outline-offset: 2px;
	}

	.wrap {
		max-width: 1180px;
		margin: 0 auto;
		padding: 0 24px;
	}
	@media (max-width: 640px) {
		.wrap {
			padding: 0 16px;
		}
	}

	.eyebrow {
		font-family: var(--ff-mono);
		font-size: 12px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--verde-700);
		font-weight: 600;
	}

	/* ---------- HERO ---------- */
	.hero {
		position: relative;
		overflow: hidden;
		background: linear-gradient(
			180deg,
			var(--verde-950) 0%,
			var(--verde-900) 60%,
			var(--verde-800) 100%
		);
		color: var(--papel);
		padding: 52px 0 44px;
	}
	.hero .wrap {
		position: relative;
		z-index: 2;
	}
	.hero-c {
		position: absolute;
		right: -220px;
		top: -260px;
		width: 740px;
		height: 740px;
		border-radius: 50%;
		border: 125px solid rgba(143, 211, 182, 0.09);
		z-index: 1;
		pointer-events: none;
	}
	.hero-c2 {
		position: absolute;
		left: -260px;
		bottom: -320px;
		width: 540px;
		height: 540px;
		border-radius: 50%;
		border: 85px solid rgba(239, 123, 46, 0.07);
		z-index: 1;
		pointer-events: none;
	}

	.hero-eyebrow {
		font-family: var(--ff-mono);
		font-size: 11.5px;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--verde-300);
		font-weight: 600;
		margin-bottom: 12px;
	}
	.hero-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(28px, 4.2vw, 46px);
		line-height: 1.1;
		letter-spacing: -0.01em;
		max-width: 720px;
		margin: 0 0 14px;
	}
	.hero-sub {
		font-size: 16px;
		color: var(--verde-100);
		max-width: 600px;
		margin: 0 0 8px;
		opacity: 0.94;
	}
	.hero-sub-secondary {
		font-size: 13.5px;
		color: var(--verde-300);
		max-width: 560px;
		margin: 0 0 26px;
	}

	.doors-heading {
		font-family: var(--ff-display);
		font-weight: 600;
		font-size: 15px;
		color: var(--verde-100);
		margin: 0 0 12px;
	}
	.doors {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-bottom: 22px;
	}
	@media (max-width: 820px) {
		.doors {
			grid-template-columns: 1fr;
		}
	}
	.door {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 16px;
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 44px;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.door:hover {
		background: rgba(255, 255, 255, 0.11);
		border-color: rgba(255, 255, 255, 0.28);
	}
	.door .d-ic {
		font-size: 16px;
		color: var(--naranja-400);
	}
	.door .d-tt {
		font-family: var(--ff-display);
		font-weight: 600;
		font-size: 14.5px;
		color: #fff;
	}
	.door .d-desc {
		font-size: 12.5px;
		color: rgba(255, 255, 255, 0.72);
		line-height: 1.4;
	}
	.door .d-go {
		align-self: flex-start;
		font-family: var(--ff-mono);
		font-size: 11.5px;
		color: var(--verde-300);
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 2px;
	}

	.hero-note {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		max-width: 700px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 14px;
		padding: 13px 16px;
		font-size: 12.5px;
		color: var(--verde-100);
	}

	/* ---------- SECTION shell ---------- */
	section.block {
		padding: 48px 0;
	}
	.section-head {
		margin-bottom: 22px;
		text-align: center;
	}
	.section-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(21px, 2.6vw, 30px);
		margin: 6px 0 0;
		letter-spacing: -0.01em;
	}
	.section-desc {
		color: var(--tinta-60);
		font-size: 14.5px;
		max-width: 600px;
		margin: 8px auto 0;
	}
	.examples-section {
		background: var(--papel-2);
	}

	/* ---------- LEYENDA DE ESTADOS ---------- */
	.legend {
		display: flex;
		gap: 16px;
		justify-content: center;
		flex-wrap: wrap;
		margin: 18px 0 6px;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		color: var(--tinta-60);
		font-weight: 600;
	}
	.legend-dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.legend-dot.disponible {
		background: var(--verde-600);
	}
	.legend-dot.desarrollo {
		background: repeating-linear-gradient(
			45deg,
			var(--naranja-500),
			var(--naranja-500) 2px,
			#fff 2px,
			#fff 4px
		);
	}

	/* ---------- CICLO — controles ---------- */
	.cycle-controls {
		display: flex;
		justify-content: center;
		gap: 8px;
		margin: 20px 0 30px;
		flex-wrap: wrap;
	}
	.ctrl-btn {
		min-width: 44px;
		min-height: 44px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1.5px solid var(--linea);
		background: var(--blanco);
		color: var(--tinta-60);
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.ctrl-btn:hover {
		border-color: var(--verde-500);
	}
	.ctrl-btn.reset {
		color: var(--naranja-600);
		border-color: rgba(168, 66, 15, 0.3);
	}

	/* ---------- CIRCUITO (escritorio) ---------- */
	.circuit-desktop {
		display: block;
	}
	@media (max-width: 900px) {
		.circuit-desktop {
			display: none;
		}
	}

	.circuit-area {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 36px;
		align-items: center;
	}
	@media (max-width: 1080px) {
		.circuit-area {
			grid-template-columns: 1fr;
		}
	}

	.circuit-wrap {
		position: relative;
		width: 100%;
		max-width: 520px;
		aspect-ratio: 1/1;
		margin: 0 auto;
	}
	.circuit-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.circuit-center {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		width: 150px;
		pointer-events: none;
	}
	.circuit-center .cc-label {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tinta-40);
	}
	.circuit-center .cc-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 17px;
		color: var(--verde-900);
		margin-top: 4px;
	}

	.node {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: var(--blanco);
		border: 2px solid var(--linea);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		box-shadow: var(--sombra);
		transition:
			border-color 0.15s,
			transform 0.15s,
			box-shadow 0.15s;
	}
	.node:hover {
		transform: translate(-50%, -50%) scale(1.04);
	}
	.node .n-ic {
		font-size: 18px;
		color: var(--verde-700);
	}
	.node .n-tt {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 11.5px;
		color: var(--tinta);
		text-align: center;
		line-height: 1.2;
		padding: 0 4px;
	}
	.node .n-badge {
		position: absolute;
		bottom: -4px;
		right: -2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid var(--blanco);
	}
	.node .n-badge.disponible {
		background: var(--verde-600);
	}
	.node .n-badge.desarrollo {
		background: repeating-linear-gradient(
			45deg,
			var(--naranja-500),
			var(--naranja-500) 2px,
			#fff 2px,
			#fff 4px
		);
	}
	.node[aria-pressed='true'] {
		border-color: var(--naranja-500);
		box-shadow:
			0 0 0 4px rgba(239, 123, 46, 0.15),
			var(--sombra);
	}
	.node[aria-pressed='true'] .n-ic {
		color: var(--naranja-600);
	}

	.node-return {
		position: absolute;
		transform: translate(-50%, -50%);
		background: var(--verde-950);
		color: #fff;
		border: 2px solid var(--naranja-500);
		border-radius: 999px;
		padding: 8px 14px;
		font-family: var(--ff-mono);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		white-space: nowrap;
		box-shadow: var(--sombra);
	}
	.node-return[aria-pressed='true'] {
		background: var(--naranja-600);
	}

	/* ---------- PANEL DE DETALLE ---------- */
	.panel {
		background: var(--verde-950);
		color: var(--papel);
		border-radius: 22px;
		padding: 26px;
		position: relative;
		overflow: hidden;
		min-height: 340px;
		display: flex;
		flex-direction: column;
	}
	@media (max-width: 640px) {
		.panel {
			padding: 20px;
		}
	}
	.panel-arc {
		position: absolute;
		right: -130px;
		top: -130px;
		width: 320px;
		height: 320px;
		border-radius: 50%;
		border: 65px solid rgba(255, 255, 255, 0.05);
		pointer-events: none;
	}
	.panel-empty {
		position: relative;
		z-index: 1;
		margin: auto;
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		font-size: 14px;
		max-width: 280px;
	}
	.panel-body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.panel-eyebrow {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde-300);
	}
	.panel-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(20px, 2.6vw, 26px);
		margin: 6px 0 14px;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.panel-title .p-ic {
		font-size: 20px;
		color: var(--naranja-400);
	}
	.panel-resumen {
		font-size: 14.5px;
		line-height: 1.65;
		color: rgba(255, 255, 255, 0.92);
		margin-bottom: 18px;
		max-width: 520px;
	}

	.panel-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 14px;
	}
	.panel-chip {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		padding: 10px 14px;
		font-size: 12.5px;
	}
	.panel-chip .pk {
		font-family: var(--ff-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--verde-300);
		margin-bottom: 4px;
	}
	.panel-chip .pv {
		color: #fff;
		font-weight: 500;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 13px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.2);
		margin-bottom: 16px;
		width: fit-content;
	}
	.status-pill.disponible {
		background: rgba(143, 211, 182, 0.16);
		color: #a8e6c9;
	}
	.status-pill.desarrollo {
		background: rgba(246, 153, 79, 0.16);
		color: #f6994f;
	}
	.status-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.status-pill.disponible .status-dot {
		background: #a8e6c9;
	}
	.status-pill.desarrollo .status-dot {
		background: repeating-linear-gradient(45deg, #f6994f, #f6994f 2px, #0a2620 2px, #0a2620 4px);
	}
	.panel-estadonota {
		font-size: 12.5px;
		color: rgba(255, 255, 255, 0.65);
		margin: -8px 0 18px;
		line-height: 1.5;
		max-width: 520px;
	}

	.panel-cta {
		align-self: flex-start;
		background: var(--naranja-500);
		color: #fff;
		font-weight: 700;
		font-size: 13.5px;
		padding: 12px 20px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		margin-top: auto;
	}
	.panel-cta:hover {
		background: var(--naranja-400);
	}
	.panel-noaccion {
		font-size: 12.5px;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
		margin-top: auto;
	}

	/* ---------- ACORDEÓN (móvil) ---------- */
	.circuit-mobile {
		display: none;
	}
	@media (max-width: 900px) {
		.circuit-mobile {
			display: block;
		}
	}
	.accordion {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.acc-item {
		background: var(--blanco);
		border: 1.5px solid var(--linea);
		border-radius: 16px;
		overflow: hidden;
	}
	.acc-item.active {
		border-color: var(--naranja-500);
	}
	.acc-item.return {
		border-style: dashed;
		background: var(--papel-2);
	}
	.acc-head {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: transparent;
		border: 0;
		cursor: pointer;
		text-align: left;
		min-height: 44px;
	}
	.acc-ic {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: var(--verde-100);
		color: var(--verde-800);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 15px;
		flex: 0 0 auto;
	}
	.acc-item.return .acc-ic {
		background: var(--naranja-100);
		color: var(--naranja-600);
	}
	.acc-tt {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 14.5px;
		flex: 1;
	}
	.acc-badge {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.acc-badge.disponible {
		background: var(--verde-600);
	}
	.acc-badge.desarrollo {
		background: repeating-linear-gradient(
			45deg,
			var(--naranja-500),
			var(--naranja-500) 2px,
			#fff 2px,
			#fff 4px
		);
	}
	.acc-chev {
		font-size: 13px;
		color: var(--tinta-40);
		transition: transform 0.15s;
	}
	.acc-item.active .acc-chev {
		transform: rotate(180deg);
	}
	.acc-body {
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.25s ease;
	}
	.acc-item.active .acc-body {
		max-height: 600px;
	}
	.acc-body-inner {
		padding: 0 16px 18px;
	}
	.acc-resumen {
		font-size: 13.5px;
		color: var(--tinta-60);
		line-height: 1.6;
		margin-bottom: 12px;
	}
	.acc-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 12px;
	}
	.acc-meta-row {
		font-size: 12.5px;
		color: var(--tinta-60);
	}
	.acc-meta-row b {
		color: var(--tinta);
	}
	.acc-cta {
		background: var(--naranja-500);
		color: #fff;
		font-weight: 700;
		font-size: 13px;
		padding: 11px 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-height: 44px;
	}
	.acc-cta:hover {
		background: var(--naranja-400);
	}
	.acc-noaccion {
		font-size: 12.5px;
		color: var(--tinta-40);
		font-style: italic;
	}

	/* ---------- EJEMPLOS DINÁMICOS ---------- */
	.example-tabs {
		display: flex;
		gap: 6px;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 16px;
	}
	.ex-tab {
		border: 1.5px solid var(--linea);
		background: var(--blanco);
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 13.5px;
		font-weight: 600;
		color: var(--tinta-60);
		cursor: pointer;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.ex-tab:hover {
		border-color: var(--verde-500);
	}
	.ex-tab[aria-selected='true'] {
		background: var(--verde-900);
		border-color: var(--verde-900);
		color: #fff;
	}

	.example-card {
		margin-top: 22px;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 22px;
		padding: 28px;
		display: grid;
		grid-template-columns: 1fr 1.3fr;
		gap: 26px;
	}
	@media (max-width: 820px) {
		.example-card {
			grid-template-columns: 1fr;
			padding: 20px;
		}
	}
	.ex-left .ex-kicker {
		font-family: var(--ff-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--naranja-600);
	}
	.ex-left .ex-problema {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 19px;
		margin: 8px 0 10px;
		color: var(--tinta);
	}
	.ex-left .ex-flecha {
		color: var(--tinta-40);
		font-size: 20px;
		margin: 6px 0;
	}
	.ex-left .ex-solucion {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 19px;
		color: var(--verde-800);
	}
	.ex-points {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.ex-point {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font-size: 13.5px;
		color: var(--tinta);
		line-height: 1.5;
	}
	.ex-point .ep-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--verde-600);
		margin-top: 7px;
		flex: 0 0 auto;
	}
	.ex-cta {
		margin-top: 18px;
		background: var(--naranja-500);
		color: #fff;
		font-weight: 700;
		font-size: 13.5px;
		padding: 12px 20px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
	}
	.ex-cta:hover {
		background: var(--naranja-400);
	}

	/* ---------- PUENTE FINAL ---------- */
	.bridge {
		background: linear-gradient(155deg, var(--verde-950) 0%, var(--verde-900) 100%);
		color: #fff;
		border-radius: 28px;
		padding: 44px 32px;
		text-align: center;
		position: relative;
		overflow: hidden;
	}
	@media (max-width: 640px) {
		.bridge {
			padding: 32px 20px;
		}
	}
	.bridge-arc {
		position: absolute;
		left: 50%;
		top: -160px;
		transform: translateX(-50%);
		width: 520px;
		height: 320px;
		border-radius: 50%;
		border: 70px solid rgba(255, 255, 255, 0.05);
		pointer-events: none;
	}
	.bridge-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(22px, 3vw, 32px);
		position: relative;
		z-index: 1;
		margin: 0 0 18px;
	}
	.bridge-cta {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: var(--naranja-500);
		color: var(--verde-950);
		font-weight: 700;
		font-size: 15px;
		padding: 15px 28px;
		border-radius: 999px;
		min-height: 44px;
	}
	.bridge-cta:hover {
		background: var(--naranja-400);
	}
</style>
