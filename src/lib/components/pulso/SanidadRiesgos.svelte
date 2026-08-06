<script lang="ts">
	import { tick } from 'svelte';
	import {
		CATEGORIES,
		RISKS,
		MEASURES,
		INDICATORS,
		META_REQS,
		CORRECTIONS,
		risksForMeasure,
		type SanidadRiesgoCategoriaId,
		type SanidadRiesgoMeasureId
	} from '$lib/data/sanidadRiesgosData';

	let containerEl = $state<HTMLDivElement | null>(null);
	let todasBtnEl = $state<HTMLButtonElement | null>(null);
	let comprobacionSectionEl = $state<HTMLElement | null>(null);

	let categoria = $state<SanidadRiesgoCategoriaId | null>(null);
	let riesgoAbierto = $state<string | null>(null);
	let medida = $state<SanidadRiesgoMeasureId | null>(null);

	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function scrollToEl(el: Element | null) {
		el?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
	}

	const categoryKeys = Object.keys(CATEGORIES) as SanidadRiesgoCategoriaId[];

	const filteredRisks = $derived(categoria ? RISKS.filter((r) => r.categoria === categoria) : RISKS);
	const openRisk = $derived(filteredRisks.find((r) => r.id === riesgoAbierto));
	const activeMeasure = $derived(medida ? MEASURES.find((m) => m.id === medida) : undefined);
	const activeMeasureRisks = $derived(activeMeasure ? risksForMeasure(activeMeasure.id) : []);

	function selectCategoria(cat: SanidadRiesgoCategoriaId | null) {
		categoria = cat;
	}

	async function toggleRisk(rid: string) {
		riesgoAbierto = riesgoAbierto === rid ? null : rid;
		if (riesgoAbierto) {
			await tick();
			scrollToEl(containerEl?.querySelector(`#detail-${riesgoAbierto}`) ?? null);
		}
	}

	function closeRiskDetail() {
		const closingId = riesgoAbierto;
		riesgoAbierto = null;
		tick().then(() => {
			const card = containerEl?.querySelector<HTMLButtonElement>(`[data-risk-id="${closingId}"]`);
			card?.focus();
		});
	}

	async function goToMeasure(mid: SanidadRiesgoMeasureId) {
		medida = mid;
		await tick();
		scrollToEl(comprobacionSectionEl);
	}

	function selectMedida(mid: SanidadRiesgoMeasureId | null) {
		medida = mid;
	}

	function backToAllMeasures() {
		medida = null;
		tick().then(() => todasBtnEl?.focus());
	}

	async function goToRisk(rid: string) {
		riesgoAbierto = rid;
		categoria = null;
		await tick();
		scrollToEl(containerEl?.querySelector(`#detail-${rid}`) ?? null);
	}
</script>

<div class="sanidad-riesgos" bind:this={containerEl}>
	<div class="intro-note">
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="flex:0 0 auto;margin-top:2px;"
			><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" /><path
				d="M12 8v5"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/><circle cx="12" cy="16" r="1" fill="currentColor" /></svg
		>
		<span
			><b>Los indicadores muestran cómo deberá evaluarse el plan.</b> No son resultados reales ni simulaciones
			de cumplimiento. El plan no se considera cumplido por gastar el presupuesto o desplegar una estructura:
			debe demostrar acceso, calidad, continuidad, equidad y resultados.</span
		>
	</div>

	<!-- ============ VISTA GENERAL DE RIESGOS ============ -->
	<section class="block tight">
		<span class="eyebrow">01 · Vista general</span>
		<h3 class="section-title">Los nueve riesgos del plan</h3>
		<p class="section-desc">
			Cada riesgo tiene una respuesta prevista. Agrupados por ámbito solo para facilitar la
			navegación — el texto de cada riesgo y su respuesta no cambian.
		</p>

		<div class="pillrow" role="group" aria-label="Filtrar riesgos por ámbito">
			<button
				type="button"
				class="pill"
				class:active={categoria === null}
				aria-pressed={categoria === null}
				onclick={() => selectCategoria(null)}
			>
				<span class="chk">{categoria === null ? '✓' : ''}</span>Todos los ámbitos
			</button>
			{#each categoryKeys as key (key)}
				<button
					type="button"
					class="pill"
					class:active={categoria === key}
					aria-pressed={categoria === key}
					onclick={() => selectCategoria(key)}
				>
					<span class="ic">{CATEGORIES[key].icon}</span>{CATEGORIES[key].nombre}
				</button>
			{/each}
		</div>

		<div class="risk-grid">
			{#each filteredRisks as r (r.id)}
				{@const cat = CATEGORIES[r.categoria]}
				{@const open = riesgoAbierto === r.id}
				<button
					type="button"
					class="risk-card"
					data-risk-id={r.id}
					aria-expanded={open}
					aria-controls="detail-{r.id}"
					onclick={() => toggleRisk(r.id)}
				>
					<div class="rc-top">
						<span class="rc-icon">{cat.icon}</span>
						<span class="rc-cat">{cat.nombre}</span>
					</div>
					<div class="rc-title">{r.riesgo}</div>
					<div class="rc-hint">{open ? 'Ocultar respuesta' : 'Ver respuesta prevista'}</div>
				</button>
			{/each}

			{#if openRisk}
				<div
					class="risk-detail"
					id="detail-{openRisk.id}"
					role="region"
					aria-label="Respuesta prevista para: {openRisk.riesgo}"
				>
					<div class="rd-arc"></div>
					<div class="rd-top">
						<div>
							<div class="rd-eyebrow">Respuesta prevista</div>
							<h4 class="rd-title">{openRisk.riesgo}</h4>
						</div>
						<button
							type="button"
							class="rd-close"
							aria-label="Cerrar detalle del riesgo"
							onclick={closeRiskDetail}>✕</button
						>
					</div>
					<p class="rd-response">{openRisk.respuesta}</p>
					<div class="rd-label">Medidas relacionadas de forma orientativa</div>
					<div class="rd-measures">
						{#if openRisk.medidas.length}
							{#each openRisk.medidas as mid (mid)}
								{@const m = MEASURES.find((x) => x.id === mid)}
								<button type="button" class="rd-mchip" onclick={() => goToMeasure(mid)}
									>{mid} · {m?.nombre}</button
								>
							{/each}
						{:else}
							<span class="rd-none"
								>Riesgo transversal al conjunto del plan; el documento no lo vincula a una medida
								concreta.</span
							>
						{/if}
					</div>
					<p class="rd-caveat">
						Relación derivada del contenido del plan para facilitar la navegación. No constituye una
						clasificación oficial.
					</p>
				</div>
			{/if}
		</div>
	</section>

	<hr class="divider" />

	<!-- ============ COMPROBACIÓN POR MEDIDA ============ -->
	<section class="block" bind:this={comprobacionSectionEl}>
		<span class="eyebrow">02 · Por medida</span>
		<h3 class="section-title">Comprobación por medida</h3>
		<p class="section-desc">
			Qué se comprobará, qué salvaguarda evita falsear el cumplimiento y qué limitación sigue
			documentada — con la terminología exacta del plan.
		</p>

		<div class="pillrow" role="group" aria-label="Filtrar por medida">
			<button
				type="button"
				class="pill"
				class:active={medida === null}
				aria-pressed={medida === null}
				bind:this={todasBtnEl}
				onclick={() => selectMedida(null)}
			>
				<span class="chk">{medida === null ? '✓' : ''}</span>Todas
			</button>
			{#each MEASURES as m (m.id)}
				<button
					type="button"
					class="pill"
					class:active={medida === m.id}
					aria-pressed={medida === m.id}
					onclick={() => selectMedida(m.id)}
				>
					<span class="chk">{medida === m.id ? '✓' : ''}</span>{m.id}
				</button>
			{/each}
		</div>

		{#if !activeMeasure}
			<div class="overview-list">
				{#each MEASURES as m (m.id)}
					<button type="button" class="overview-row" onclick={() => selectMedida(m.id)}>
						<div class="ov-name">
							<span class="ov-id">{m.id}</span><span class="ov-nm">{m.nombre}</span>
						</div>
						<div class="ov-snippet">{m.salvaguarda}</div>
						<span class="ov-arrow">›</span>
					</button>
				{/each}
			</div>
		{:else}
			<div class="mficha">
				<div class="mficha-top">
					<div>
						<div class="mficha-id">{activeMeasure.id}</div>
						<h4 class="mficha-name">{activeMeasure.nombre}</h4>
					</div>
					<button type="button" class="mficha-back" onclick={backToAllMeasures}
						>← Ver todas</button
					>
				</div>

				{#if activeMeasureRisks.length}
					<div class="mficha-riskchips">
						{#each activeMeasureRisks as r (r.id)}
							<button type="button" class="mf-riskchip" onclick={() => goToRisk(r.id)}
								>{CATEGORIES[r.categoria].icon} {r.riesgo}</button
							>
						{/each}
					</div>
				{/if}

				<div class="layer-grid">
					<div class="layer comprueba">
						<div class="lk">① Qué se comprobará</div>
						<ul>
							{#each activeMeasure.comprobar as c (c)}
								<li>{c}</li>
							{/each}
						</ul>
					</div>
					<div class="layer salvaguarda">
						<div class="lk">② Salvaguarda</div>
						<p>{activeMeasure.salvaguarda}</p>
					</div>
					<div class="layer limitacion">
						<div class="lk">③ Limitación o incertidumbre documentada</div>
						{#if activeMeasure.limitacion.length > 1}
							<ul>
								{#each activeMeasure.limitacion as l (l)}
									<li>{l}</li>
								{/each}
							</ul>
						{:else}
							<p>{activeMeasure.limitacion[0]}</p>
						{/if}
					</div>
					<div class="layer noexito">
						<div class="lk">④ Qué no contará como éxito en esta medida</div>
						<ul>
							{#each activeMeasure.noExito as n (n)}
								<li>{n}</li>
							{/each}
						</ul>
					</div>
				</div>
				<p class="noexito-note">
					Estos criterios aplican a cada medida los principios generales de comprobación del plan;
					su distribución por medida es una organización explicativa del artifact.
				</p>
			</div>
		{/if}
	</section>

	<hr class="divider" />

	<!-- ============ CUADRO PÚBLICO ============ -->
	<section class="block">
		<span class="eyebrow">03 · Cuadro público de seguimiento</span>
		<h3 class="section-title">Los diez indicadores mínimos</h3>
		<p class="section-desc">
			El panel ciudadano no mostrará cientos de cifras. Publicará, como mínimo, estos diez
			indicadores.
		</p>

		<div class="indicator-grid">
			{#each INDICATORS as txt, i (txt)}
				<div class="indicator-card">
					<span class="indicator-num">{i + 1}</span>
					<span class="indicator-txt">{txt}</span>
				</div>
			{/each}
		</div>

		<div class="meta-row">
			{#each META_REQS as r (r.label)}
				<span class="meta-badge">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
						><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.6" /><path
							d="M8.5 12.5l2.2 2.2L16 9.5"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/></svg
					>
					{r.label}
				</span>
			{/each}
		</div>

		<div class="compare-note">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex:0 0 auto;"
				><circle cx="12" cy="12" r="9.5" stroke="#8fd3b6" stroke-width="1.6" /><path
					d="M8 12h8M12 8v8"
					stroke="#8fd3b6"
					stroke-width="1.6"
					stroke-linecap="round"
				/></svg
			>
			<span>Comparar territorios servirá para aprender y corregir, <b>no para declarar ganadores políticos.</b></span>
		</div>

		<div class="econ-box">
			<div class="lk">Contexto económico que afecta a la comprobación</div>
			<div class="econ-figs">
				<div class="econ-fig">
					<div class="v">3.359<span class="u">M€/año</span></div>
					<div class="k">Escenario central · 2032</div>
				</div>
				<div class="econ-fig">
					<div class="v">1.701–5.880<span class="u">M€</span></div>
					<div class="k">Banda 2032 (bajo–alto)</div>
				</div>
				<div class="econ-fig">
					<div class="v">28.261<span class="u">M€</span></div>
					<div class="k">Acumulado 2027–2036</div>
				</div>
			</div>
			<p>
				La banda representa escenarios distintos de cobertura e intensidad, no un intervalo
				estadístico de precisión. El backlog quirúrgico de listas de espera es un coste puntual
				ejecutado entre 2027 y 2030 — no gasto recurrente de 2032. El 0,5&nbsp;% del PIB es
				únicamente un techo político orientativo, no un resultado del modelo económico.
			</p>
		</div>
	</section>

	<hr class="divider" />

	<!-- ============ QUÉ OBLIGARÍA A CORREGIR ============ -->
	<section class="block">
		<span class="eyebrow">04 · Cierre</span>
		<h3 class="section-title">Qué obligaría a corregir el plan</h3>
		<p class="section-desc">
			Ninguna medida se considera definitiva. Estas condiciones, si se detectan, obligan a
			corregir o retirar lo que no funciona.
		</p>

		<div class="correct-grid">
			{#each CORRECTIONS as c (c.txt)}
				<div class="correct-card">
					<div class="cc-ic">{c.ic}</div>
					<div class="cc-txt">{c.txt}</div>
				</div>
			{/each}
		</div>
		<div class="correct-note">
			<span>⚠</span>
			<div>
				<b>Evaluación externa pública al menos cada dos años.</b> Ninguna medida es irreversible
				por principio: la obligación de corregir o retirar lo ineficaz forma parte del plan desde
				el inicio.
			</div>
		</div>
	</section>

	<div class="layer-note">
		<div class="layer-cell">
			<div class="lk">Fuente de este contenido</div>
			<p>
				Base_Riesgos_Comprobacion_Plan_Sanidad_2036.md. Riesgos, respuestas, indicadores,
				salvaguardas y limitaciones proceden literalmente de ese documento. Las categorías
				visuales y las relaciones entre riesgos y M1–M8 son una organización editorial basada en
				su contenido, pensada para facilitar la navegación — no son contenido literal de la fuente
				ni una clasificación oficial.
			</p>
		</div>
		<div class="layer-cell b">
			<div class="lk">Qué no hace este panel</div>
			<p>
				No publica resultados reales, porcentajes de éxito ni comparaciones territoriales. No
				confunde presupuesto desplegado con cumplimiento sanitario.
			</p>
		</div>
	</div>
</div>

<style>
	/* Estilos del artifact de referencia (riesgos_sanidad_2036), encapsulados
	   bajo .sanidad-riesgos para no colisionar con el resto del proyecto.
	   Paleta y tipografía del propio artifact (verde/naranja), no los tokens
	   brand/accent del resto de la página: aquí el objetivo es conservar
	   exactamente su diseño. Las fuentes usan las variables globales del
	   proyecto (--font-display/--font-sans) en vez de volver a cargarlas. */
	.sanidad-riesgos {
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

		font-family: var(--ff-body);
		color: var(--tinta);
		line-height: 1.55;
	}
	@media (prefers-reduced-motion: reduce) {
		.sanidad-riesgos,
		.sanidad-riesgos *,
		.sanidad-riesgos *::before,
		.sanidad-riesgos *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
			scroll-behavior: auto !important;
		}
	}
	.sanidad-riesgos * {
		box-sizing: border-box;
	}
	.sanidad-riesgos a {
		color: inherit;
	}
	.sanidad-riesgos button {
		font-family: inherit;
	}
	.sanidad-riesgos ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.sanidad-riesgos :focus-visible {
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

	/* ---------- INTRO NOTE ---------- */
	.intro-note {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		background: var(--verde-100);
		border: 1px solid var(--verde-300);
		border-radius: 14px;
		padding: 13px 16px;
		font-size: 13px;
		color: var(--verde-950);
		margin-bottom: 28px;
	}
	.intro-note b {
		color: var(--verde-900);
	}

	/* ---------- SECTION shell ---------- */
	section.block {
		padding: 32px 0;
	}
	section.block.tight {
		padding: 0 0 24px;
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
		font-size: 14px;
		max-width: 640px;
		margin-top: 8px;
	}
	.divider {
		height: 1px;
		background: var(--linea);
		border: 0;
		margin: 0;
	}

	/* ---------- PILL FILTERS ---------- */
	.pillrow {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 16px;
	}
	.pill {
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
		gap: 7px;
	}
	.pill:hover {
		border-color: var(--verde-500);
	}
	.pill.active {
		background: var(--verde-900);
		border-color: var(--verde-900);
		color: #fff;
	}
	.pill .ic {
		font-size: 13px;
		line-height: 1;
	}
	.pill .chk {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		flex: 0 0 auto;
	}
	.pill.active .chk {
		background: #fff;
		color: var(--verde-900);
		border-color: #fff;
	}

	/* ---------- RIESGOS GRID ---------- */
	.risk-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 20px;
	}
	@media (max-width: 900px) {
		.risk-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 600px) {
		.risk-grid {
			grid-template-columns: 1fr;
		}
	}
	.risk-card {
		text-align: left;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 16px;
		padding: 16px 16px 15px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.15s,
			box-shadow 0.15s;
		position: relative;
	}
	.risk-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--sombra);
	}
	.risk-card[aria-expanded='true'] {
		border-color: var(--naranja-500);
		box-shadow: var(--sombra);
	}
	.risk-card .rc-top {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.risk-card .rc-icon {
		width: 28px;
		height: 28px;
		border-radius: 9px;
		background: var(--verde-100);
		color: var(--verde-800);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		flex: 0 0 auto;
	}
	.risk-card .rc-cat {
		font-family: var(--ff-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tinta-40);
	}
	.risk-card .rc-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 15px;
		line-height: 1.3;
		margin: 0 0 4px;
	}
	.risk-card .rc-hint {
		font-size: 12.5px;
		color: var(--tinta-40);
		font-family: var(--ff-mono);
	}

	.risk-detail {
		grid-column: 1 / -1;
		margin-top: 2px;
		background: var(--verde-950);
		color: var(--papel);
		border-radius: 18px;
		padding: 22px;
		position: relative;
		overflow: hidden;
	}
	@media (max-width: 640px) {
		.risk-detail {
			padding: 16px;
		}
	}
	.rd-arc {
		position: absolute;
		right: -120px;
		top: -120px;
		width: 300px;
		height: 300px;
		border-radius: 50%;
		border: 60px solid rgba(255, 255, 255, 0.05);
		pointer-events: none;
	}
	.rd-top {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.rd-eyebrow {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde-300);
	}
	.rd-title {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: clamp(18px, 2.2vw, 23px);
		margin: 6px 0 0;
		max-width: 560px;
	}
	.rd-close {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.16);
		color: #fff;
		min-width: 44px;
		min-height: 44px;
		border-radius: 50%;
		cursor: pointer;
		font-size: 15px;
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.rd-close:hover {
		background: rgba(255, 255, 255, 0.16);
	}
	.rd-label {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--verde-300);
		margin: 18px 0 8px;
		position: relative;
		z-index: 1;
	}
	.rd-response {
		font-size: 15px;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.92);
		position: relative;
		z-index: 1;
		max-width: 680px;
	}
	.rd-measures {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 6px;
		position: relative;
		z-index: 1;
	}
	.rd-mchip {
		font-family: var(--ff-mono);
		font-size: 12px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: #fff;
		padding: 8px 13px;
		border-radius: 999px;
		cursor: pointer;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.rd-mchip:hover {
		background: rgba(255, 255, 255, 0.16);
	}
	.rd-none {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.55);
		font-style: italic;
	}
	.rd-caveat {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.55);
		margin-top: 10px;
		position: relative;
		z-index: 1;
		max-width: 600px;
		line-height: 1.5;
	}

	/* ---------- FICHAS DE MEDIDA ---------- */
	.overview-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 20px;
	}
	.overview-row {
		display: grid;
		grid-template-columns: 1.6fr 1.6fr auto;
		align-items: center;
		gap: 14px;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 14px;
		padding: 13px 16px;
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
	}
	.ov-snippet {
		font-size: 12.5px;
		color: var(--tinta-60);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@media (max-width: 760px) {
		.ov-snippet {
			white-space: normal;
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

	.mficha {
		margin-top: 20px;
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
		margin-bottom: 6px;
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
		max-width: 560px;
	}
	.mficha-back {
		background: var(--papel-2);
		border: 1.5px solid var(--linea);
		color: var(--tinta-60);
		border-radius: 999px;
		padding: 9px 15px;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.mficha-back:hover {
		border-color: var(--verde-500);
	}

	.mficha-riskchips {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin: 12px 0 20px;
	}
	.mf-riskchip {
		font-family: var(--ff-mono);
		font-size: 11px;
		font-weight: 600;
		background: var(--naranja-100);
		color: var(--naranja-600);
		padding: 7px 12px;
		border-radius: 999px;
		cursor: pointer;
		border: 1px solid rgba(168, 66, 15, 0.22);
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.mf-riskchip:hover {
		background: #fde2cc;
	}

	.layer-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	@media (max-width: 820px) {
		.layer-grid {
			grid-template-columns: 1fr;
		}
	}
	.layer {
		background: var(--papel-2);
		border-radius: 16px;
		padding: 16px 18px;
	}
	.layer.salvaguarda {
		background: var(--naranja-100);
	}
	.layer.noexito {
		background: var(--naranja-100);
	}
	.layer.limitacion {
		background: var(--papel-2);
	}
	.layer .lk {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 10px;
	}
	.layer.comprueba .lk {
		color: var(--verde-700);
	}
	.layer.salvaguarda .lk {
		color: var(--naranja-600);
	}
	.layer.limitacion .lk {
		color: var(--tinta-40);
	}
	.layer.noexito .lk {
		color: var(--naranja-600);
	}
	.layer ul {
		display: flex;
		flex-direction: column;
		gap: 6px;
		list-style: none;
	}
	.layer li {
		font-size: 13px;
		color: var(--tinta);
		line-height: 1.5;
		padding-left: 14px;
		position: relative;
	}
	.layer li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 8px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.5;
	}
	.layer p {
		font-size: 13.5px;
		color: var(--tinta);
		line-height: 1.6;
		margin: 0;
	}
	.noexito-note {
		font-size: 12px;
		color: var(--tinta-40);
		margin: 14px 2px 0;
		line-height: 1.5;
		max-width: 640px;
	}

	/* ---------- INDICADORES ---------- */
	.indicator-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		margin-top: 20px;
	}
	@media (max-width: 760px) {
		.indicator-grid {
			grid-template-columns: 1fr;
		}
	}
	.indicator-card {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		background: var(--blanco);
		border: 1px solid var(--linea);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.indicator-num {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 15px;
		color: var(--verde-800);
		background: var(--verde-100);
		width: 30px;
		height: 30px;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
	}
	.indicator-txt {
		font-size: 13.5px;
		color: var(--tinta);
		line-height: 1.5;
		padding-top: 4px;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 20px;
	}
	.meta-badge {
		font-family: var(--ff-mono);
		font-size: 11.5px;
		font-weight: 600;
		background: var(--papel-2);
		border: 1px solid var(--linea);
		color: var(--tinta-60);
		padding: 8px 13px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 38px;
	}
	.meta-badge svg {
		flex: 0 0 auto;
	}

	.compare-note {
		margin-top: 18px;
		background: var(--verde-950);
		color: #fff;
		border-radius: 16px;
		padding: 16px 20px;
		font-size: 14px;
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.compare-note b {
		color: var(--verde-300);
	}

	.econ-box {
		margin-top: 18px;
		background: var(--papel-2);
		border: 1px solid var(--linea);
		border-radius: 16px;
		padding: 18px 20px;
	}
	.econ-box .lk {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--verde-700);
		margin-bottom: 12px;
	}
	.econ-figs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
		margin-bottom: 12px;
	}
	@media (max-width: 640px) {
		.econ-figs {
			grid-template-columns: 1fr 1fr;
		}
	}
	.econ-fig .v {
		font-family: var(--ff-display);
		font-weight: 700;
		font-size: 18px;
		color: var(--verde-900);
	}
	.econ-fig .v .u {
		font-size: 0.55em;
		color: var(--tinta-40);
		font-weight: 500;
		margin-left: 2px;
	}
	.econ-fig .k {
		font-family: var(--ff-mono);
		font-size: 10.5px;
		color: var(--tinta-40);
		margin-top: 3px;
	}
	.econ-box p {
		font-size: 12.5px;
		color: var(--tinta-60);
		margin: 6px 0 0;
		line-height: 1.55;
	}

	/* ---------- CORRECCIÓN ---------- */
	.correct-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin-top: 20px;
	}
	@media (max-width: 900px) {
		.correct-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 520px) {
		.correct-grid {
			grid-template-columns: 1fr;
		}
	}
	.correct-card {
		background: var(--verde-950);
		color: #fff;
		border-radius: 14px;
		padding: 16px;
		text-align: left;
	}
	.correct-card .cc-ic {
		font-size: 16px;
		color: var(--naranja-400);
		margin-bottom: 8px;
	}
	.correct-card .cc-txt {
		font-family: var(--ff-display);
		font-weight: 600;
		font-size: 14px;
	}
	.correct-note {
		margin-top: 18px;
		background: var(--naranja-100);
		border: 1px solid rgba(168, 66, 15, 0.2);
		border-radius: 14px;
		padding: 14px 18px;
		font-size: 13.5px;
		color: var(--verde-950);
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}
	.correct-note b {
		color: var(--naranja-600);
	}

	/* ---------- NOTA FINAL (fuente / qué no hace) ---------- */
	.layer-note {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--linea);
		border: 1px solid var(--linea);
		border-radius: var(--radio);
		overflow: hidden;
		margin-top: 32px;
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
		font-size: 12.5px;
		color: var(--tinta-60);
		line-height: 1.55;
	}
	.layer-cell.b .lk {
		color: var(--naranja-600);
	}
</style>
