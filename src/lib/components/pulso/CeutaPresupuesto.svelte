<script lang="ts">
	/**
	 * Presupuesto interactivo de Plan Ceuta: selector Bajo/Central/Alto que
	 * actualiza en conjunto KPIs, tabla por medida, financiación europea
	 * potencial, reserva de emergencia, gráfico anual, tabla anual accesible
	 * y la fórmula del CIE — todo derivado de una única fuente tipada
	 * (`$lib/data/ceutaEconomicModel.ts`), verificada por triple vía contra
	 * el `.md`, el `.xlsx` y el artifact de referencia (ver comentario en ese
	 * módulo). Mismo patrón que `SanidadPresupuesto.svelte` (componente
	 * bespoke + datos estáticos tipados, sin usar las tablas genéricas
	 * `topic_budget_*`), con paleta visual propia de Ceuta en vez de los
	 * tokens brand/accent globales — aislada con el scoping automático de
	 * Svelte, igual que ya hace `SanidadRiesgos.svelte` para su propia
	 * identidad.
	 */
	import { FileSpreadsheet, FileText } from '@lucide/svelte';
	import {
		CEUTA_ESCENARIOS,
		CEUTA_ESCENARIOS_META,
		CEUTA_NOMBRES_MEDIDA,
		CEUTA_ORDEN_MEDIDAS,
		calcularCIE,
		calendarioAcumulado,
		costeAnualMedida,
		meur,
		pesoMedidaPct,
		type CeutaScenarioKey
	} from '$lib/data/ceutaEconomicModel';

	let scenario = $state<CeutaScenarioKey>('central');
	const esc = $derived(CEUTA_ESCENARIOS[scenario]);
	const cie = $derived(calcularCIE(esc));
	const acumulado = $derived(calendarioAcumulado(esc));

	const SCENARIO_KEYS: readonly CeutaScenarioKey[] = CEUTA_ESCENARIOS_META.map((s) => s.key);
	let scenarioButtonEls: (HTMLButtonElement | null)[] = $state([]);

	/** Mismo patrón WAI-APG de radiogroup con flechas/Inicio/Fin ya usado en SanidadPresupuesto.svelte. */
	function radiogroupKeydown(e: KeyboardEvent, index: number) {
		let next: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % SCENARIO_KEYS.length;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
			next = (index - 1 + SCENARIO_KEYS.length) % SCENARIO_KEYS.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = SCENARIO_KEYS.length - 1;
		if (next !== null) {
			e.preventDefault();
			scenario = SCENARIO_KEYS[next];
			scenarioButtonEls[next]?.focus();
		}
	}

	function scenarioColor(key: CeutaScenarioKey): string {
		return key === 'bajo'
			? 'var(--ceuta-turquoise-light)'
			: key === 'alto'
				? 'var(--ceuta-sand)'
				: 'var(--ceuta-deep)';
	}

	const DOWNLOADS = [
		{
			href: '/descargas/ceuta/Plan-Ceuta-Modelo-Economico-Borrador-0.1.xlsx',
			label: 'Libro de cálculo completo',
			type: 'Excel',
			icon: FileSpreadsheet
		},
		{
			href: '/descargas/ceuta/Plan-Ceuta-Borrador-0.1.md',
			label: 'Borrador completo del plan',
			type: 'Markdown',
			icon: FileText
		}
	];

	let methodOpen = $state(false);

	const maxAnual = $derived(Math.max(...esc.calendario.map((a) => a.inv + a.op)));
</script>

<div class="ceuta-scope">
	<!-- ---------- CABECERA FIJA ---------- -->
	<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
		<div class="hero-tarjeta">
			<div class="hero-label">Inversión inicial · Central</div>
			<div class="hero-valor">{meur(CEUTA_ESCENARIOS.central.inversion)}</div>
			<div class="hero-nota">Puesta en marcha, una sola vez</div>
		</div>
		<div class="hero-tarjeta">
			<div class="hero-label">Banda Bajo–Alto</div>
			<div class="hero-valor">
				{meur(CEUTA_ESCENARIOS.bajo.inversion)}–{meur(CEUTA_ESCENARIOS.alto.inversion)}
			</div>
			<div class="hero-nota">Pruebas de sensibilidad, no previsiones de llegadas</div>
		</div>
		<div class="hero-tarjeta">
			<div class="hero-label">Gasto bruto 2026–2031 · Central</div>
			<div class="hero-valor">{meur(CEUTA_ESCENARIOS.central.gastoBruto)}</div>
			<div class="hero-nota">Inversión + operación acumuladas, antes de ayudas</div>
		</div>
	</div>
	<p class="mt-3 text-xs text-ink-500">
		Presupuesto preliminar y editable, en euros constantes de julio de 2026. El escenario Central es
		la base recomendada para someter el plan a revisión técnica y presupuestaria — no es una
		decisión ya tomada.
	</p>

	<!-- ---------- SELECTOR DE ESCENARIO ---------- -->
	<div
		class="selector-wrap mt-5 inline-flex rounded-full p-1"
		role="radiogroup"
		aria-label="Escenario económico"
	>
		{#each CEUTA_ESCENARIOS_META as s, i (s.key)}
			<button
				bind:this={scenarioButtonEls[i]}
				type="button"
				role="radio"
				aria-checked={s.key === scenario}
				tabindex={s.key === scenario ? 0 : -1}
				onclick={() => (scenario = s.key)}
				onkeydown={(e) => radiogroupKeydown(e, i)}
				class="selector-boton"
				class:activo={s.key === scenario}
			>
				<span class="size-2 rounded-full" style={`background-color:${scenarioColor(s.key)}`}></span>
				{s.label}
				<span class="hidden text-xs font-normal opacity-75 sm:inline">· {s.desc}</span>
			</button>
		{/each}
	</div>

	<!-- ---------- KPIs DEL ESCENARIO ELEGIDO ---------- -->
	<div class="kpi-grid" aria-live="polite">
		<div class="kpi-tarjeta">
			<span class="kpi-label">Inversión inicial bruta</span>
			<div class="kpi-valor">{meur(esc.inversion)}</div>
			<div class="kpi-nota">Puesta en marcha, una sola vez</div>
		</div>
		<div class="kpi-tarjeta">
			<span class="kpi-label">Coste anual maduro</span>
			<div class="kpi-valor">{meur(esc.totalAnual)}</div>
			<div class="kpi-nota">Personal + operación, en régimen estable</div>
		</div>
		<div class="kpi-tarjeta">
			<span class="kpi-label">Gasto bruto 2026–2031</span>
			<div class="kpi-valor">{meur(esc.gastoBruto)}</div>
			<div class="kpi-nota">Antes de cualquier ayuda europea</div>
		</div>
		<div class="kpi-tarjeta">
			<span class="kpi-label">Coste estatal estimado</span>
			<div class="kpi-valor">{meur(esc.costeEstatal)}</div>
			<div class="kpi-nota">Gasto bruto menos financiación europea potencial</div>
		</div>
	</div>

	<!-- ---------- TABLA POR MEDIDA ---------- -->
	<h3 class="seccion-titulo mt-8">Inversión y coste anual por medida</h3>
	<div class="tabla-wrapper">
		<p class="scroll-hint">Desliza para ver la tabla completa →</p>
		<table class="tabla-datos">
			<caption
				>Inversión inicial y coste anual maduro (personal + operación) por medida, escenario {esc.label},
				en millones de euros constantes de julio de 2026.</caption
			>
			<thead>
				<tr>
					<th>Medida</th>
					<th>Inversión inicial</th>
					<th>Personal / año</th>
					<th>Otros costes / año</th>
					<th>Total anual maduro</th>
					<th>Peso sobre el total</th>
				</tr>
			</thead>
			<tbody>
				{#each CEUTA_ORDEN_MEDIDAS as id (id)}
					{@const m = esc.medidas[id]}
					{@const totalMedida = costeAnualMedida(esc, id)}
					{@const peso = pesoMedidaPct(esc, id)}
					<tr>
						<td>{CEUTA_NOMBRES_MEDIDA[id]}</td>
						<td>{meur(m.inv)}</td>
						<td>{meur(m.personal)}</td>
						<td>{meur(m.otros)}</td>
						<td><strong>{meur(totalMedida)}</strong></td>
						<td>
							<div class="peso-fila">
								<span class="peso-pct">{peso.toFixed(1)}%</span>
								<span class="barra-comparacion"><span style={`width:${peso}%`}></span></span>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td>Total</td>
					<td>{meur(esc.inversion)}</td>
					<td>{meur(esc.personal)}</td>
					<td>{meur(esc.otros)}</td>
					<td>{meur(esc.totalAnual)}</td>
					<td></td>
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- ---------- FINANCIACIÓN UE Y RESERVA ---------- -->
	<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
		<div class="tarjeta">
			<h4 class="tarjeta-titulo">Financiación europea potencial</h4>
			<p class="tarjeta-valor">{meur(esc.financiacionUE)}</p>
			<span class="chip chip-financiacion">Potencial · No concedida</span>
			<p class="tarjeta-nota">
				Sensibilidad sobre inversión y operación acumulada, dentro de los márgenes que permiten FAMI
				e IGFV. La elegibilidad de una partida no equivale a una concesión.
			</p>
		</div>
		<div class="tarjeta">
			<h4 class="tarjeta-titulo">Reserva anual de emergencia</h4>
			<p class="tarjeta-valor">{meur(esc.reserva)} / año</p>
			<span class="chip chip-reserva">Techo contingente · No sumado al gasto esperado</span>
			<p class="tarjeta-nota">
				Crédito disponible para una crisis concreta. Solo se ejecuta si una activación real lo
				requiere; no forma parte del gasto bruto 2026–2031 mientras no se active.
			</p>
		</div>
	</div>

	<!-- ---------- GRÁFICO ANUAL + TABLA ACCESIBLE ---------- -->
	<h3 class="seccion-titulo mt-8">Inversión frente a operación, 2026–2031</h3>
	<p class="mt-1 mb-3 text-sm text-ink-600">
		La inversión es el gasto único de puesta en marcha. La operación es el coste recurrente de
		mantener el sistema funcionando cada año, incluido el año en que el CIE modular entraría en
		servicio.
	</p>
	<div class="leyenda-barras">
		<span><i style="background:var(--ceuta-deep)"></i>Inversión</span>
		<span><i style="background:var(--ceuta-turquoise-light)"></i>Operación</span>
	</div>
	<div
		class="mini-barra-anual"
		role="img"
		aria-label="Gráfico de barras apiladas de inversión y operación por año, 2026 a 2031, escenario {esc.label}"
	>
		{#each esc.calendario as a (a.anio)}
			{@const total = a.inv + a.op}
			{@const hInv = maxAnual ? (a.inv / maxAnual) * 170 : 0}
			{@const hOp = maxAnual ? (a.op / maxAnual) * 170 : 0}
			<div
				class="col"
				aria-label={`${a.anio}: inversión ${meur(a.inv)}, operación ${meur(a.op)}, total ${meur(total)}`}
			>
				<span class="valor">{meur(total)}</span>
				<div class="pila" style={`height:${hInv + hOp}px`}>
					<div class="seg-op" style={`height:${hOp}px`}></div>
					<div class="seg-inv" style={`height:${hInv}px`}></div>
				</div>
				<span class="anio">{a.anio}</span>
			</div>
		{/each}
	</div>
	<table class="visually-hidden">
		<caption
			>Tabla equivalente al gráfico de barras: inversión y operación por año, escenario {esc.label},
			en millones de euros.</caption
		>
		<thead><tr><th>Año</th><th>Inversión</th><th>Operación</th><th>Total</th></tr></thead>
		<tbody>
			{#each esc.calendario as a (a.anio)}
				<tr
					><td>{a.anio}</td><td>{meur(a.inv)}</td><td>{meur(a.op)}</td><td>{meur(a.inv + a.op)}</td
					></tr
				>
			{/each}
			<tr
				><td>Total 2026–2031</td><td>{meur(acumulado.inv)}</td><td>{meur(acumulado.op)}</td><td
					>{meur(acumulado.total)}</td
				></tr
			>
		</tbody>
	</table>

	<!-- ---------- FÓRMULA DEL CIE ---------- -->
	<h3 class="seccion-titulo mt-10">
		El CIE de Ceuta: una hipótesis económica, no una decisión tomada
	</h3>
	<p class="mt-1 mb-4 text-sm text-ink-600">
		El escenario {esc.label} usa <strong>{esc.cie.plazas} plazas</strong>. Es un supuesto de
		planificación: la cifra final dependerá de cuántos internamientos simultáneos autorice un juez y
		de la perspectiva real de retorno — nunca de multiplicar automáticamente el número de llegadas.
	</p>
	<div class="formula-cie" aria-live="polite">
		<div class="formula-linea">
			<span class="formula-parentesis" aria-hidden="true">(</span>
			<div class="formula-grupo">
				<span class="term"
					><span class="term-valor">{esc.cie.plazas} plazas</span><span class="term-etiqueta"
						>Capacidad modular</span
					></span
				>
				<span class="op">×</span>
				<span class="term"
					><span class="term-valor">42.006,14 €</span><span class="term-etiqueta"
						>Referencia 2020/plaza</span
					></span
				>
				<span class="op">×</span>
				<span class="term"
					><span class="term-valor">{esc.cie.cpi.toFixed(2)}</span><span class="term-etiqueta"
						>Actualización IPC</span
					></span
				>
				<span class="op">×</span>
				<span class="term"
					><span class="term-valor">{esc.cie.logistica.toFixed(2)}</span><span class="term-etiqueta"
						>Logística Ceuta</span
					></span
				>
				<span class="op">×</span>
				<span class="term"
					><span class="term-valor">{esc.cie.alcance.toFixed(2)}</span><span class="term-etiqueta"
						>Alcance y calidad</span
					></span
				>
				<span class="op">+</span>
				<span class="term"
					><span class="term-valor">{meur(esc.cie.fijos)}</span><span class="term-etiqueta"
						>Costes fijos</span
					></span
				>
				<span class="op">+</span>
				<span class="term"
					><span class="term-valor">{esc.cie.suelo > 0 ? meur(esc.cie.suelo) : '0 €'}</span><span
						class="term-etiqueta">Suelo</span
					></span
				>
			</div>
			<span class="formula-parentesis" aria-hidden="true">)</span>
			<span class="op">×</span>
			<span class="term"
				><span class="term-valor">{cie.factorContingencia.toFixed(2)}</span><span
					class="term-etiqueta">Contingencia {(esc.cie.contingencia * 100).toFixed(0)}%</span
				></span
			>
			<span class="op op-igual">=</span>
			<span class="term term-destacado"
				><span class="term-valor">{meur(cie.total)}</span><span class="term-etiqueta"
					>Inversión CIE · {esc.label}</span
				></span
			>
		</div>
		<p class="formula-nota">
			La suma dentro del paréntesis se calcula primero. El resultado se multiplica <strong
				>una sola vez</strong
			>
			por (1 + contingencia); la contingencia no multiplica solo al suelo.
		</p>
		<table class="visually-hidden">
			<caption>Tabla equivalente de la fórmula del CIE, escenario {esc.label}</caption>
			<tbody>
				<tr><th scope="row">Plazas</th><td>{esc.cie.plazas}</td></tr>
				<tr><th scope="row">Referencia por plaza (2020)</th><td>42.006,14 €</td></tr>
				<tr><th scope="row">Actualización IPC</th><td>{esc.cie.cpi.toFixed(2)}</td></tr>
				<tr><th scope="row">Logística Ceuta</th><td>{esc.cie.logistica.toFixed(2)}</td></tr>
				<tr><th scope="row">Alcance y calidad</th><td>{esc.cie.alcance.toFixed(2)}</td></tr>
				<tr><th scope="row">Costes fijos</th><td>{meur(esc.cie.fijos)}</td></tr>
				<tr><th scope="row">Suelo</th><td>{esc.cie.suelo > 0 ? meur(esc.cie.suelo) : '0 €'}</td></tr
				>
				<tr
					><th scope="row">Factor de contingencia</th><td
						>×{cie.factorContingencia.toFixed(2)} ({(esc.cie.contingencia * 100).toFixed(0)}%)</td
					></tr
				>
				<tr><th scope="row">Inversión total del CIE</th><td>{meur(cie.total)}</td></tr>
			</tbody>
		</table>
	</div>
	<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="resumen-cie">
			<span class="resumen-cie-label">CIE permanente (inversión)</span>
			<p class="resumen-cie-valor">{meur(cie.total)}</p>
		</div>
		<div class="resumen-cie">
			<span class="resumen-cie-label">CATE y primera atención</span>
			<p class="resumen-cie-valor">{meur(cie.cate)}</p>
		</div>
		<div class="resumen-cie">
			<span class="resumen-cie-label">Total Medida 7</span>
			<p class="resumen-cie-valor">{meur(cie.totalMedida7)}</p>
		</div>
	</div>
	<p class="mt-3 text-xs text-ink-500">
		La referencia de 42.006,14 €/plaza procede de dividir los 21.003.071,39 € sin IVA de la obra del
		CIE de Algeciras entre sus 500 plazas (2020). Es un ancla histórica para contrastar, no un
		precio ofertable para Ceuta.
	</p>

	<!-- ---------- METODOLOGÍA ---------- -->
	<div class="desplegable mt-8">
		<button
			type="button"
			class="desplegable-resumen"
			aria-expanded={methodOpen}
			aria-controls="ceuta-metodologia"
			onclick={() => (methodOpen = !methodOpen)}
		>
			Cómo se ha calculado este presupuesto
			<span aria-hidden="true">{methodOpen ? '–' : '+'}</span>
		</button>
		{#if methodOpen}
			<div id="ceuta-metodologia" class="desplegable-cuerpo">
				<p>
					El modelo es de abajo arriba: cada medida se descompone en inversiones concretas, plazas
					de personal por perfil y partidas de operación con un driver medible (personas retornadas,
					plazas de CIE, expedientes procesados). Cada partida tiene un supuesto Bajo, Central y
					Alto documentado en el anexo descargable.
				</p>
				<p>
					El escenario Central estima una necesidad operativa total de <strong>558 FTE</strong>.
					Tras asumir la reasignación de parte de los medios ya existentes, el modelo financia
					<strong>438,1 FTE incrementales equivalentes</strong> por 26,9 M€ anuales. Un FTE no equivale
					necesariamente a una plaza funcionarial nueva.
				</p>
				<p>
					Costes integrales de planificación por perfil (escenario Central): policial y custodia
					65.000 €/FTE-año; administrativo y logístico 50.000 €/FTE-año; jurídico, sanitario,
					interpretación y social 60.000 €/FTE-año; tecnología y ciberseguridad 75.000 €/FTE-año;
					judicial/fiscal compuesto 100.000 €/FTE-año.
				</p>
				<p>
					El componente más variable del gasto ordinario es el retorno: el escenario Central usa
					3.000 ejecuciones anuales a un coste medio de 2.500 €. Una resolución no ejecutada no
					genera ese coste ni cuenta como resultado.
				</p>
				<p>
					La inversión de 19,43 M€ ya declarada para El Tarajal, cofinanciada al 90 % con asistencia
					de emergencia europea, se trata como activo existente: el plan solo presupuestará la
					brecha que revele el inventario.
				</p>
				<p class="mb-0">
					<strong>Sigue abierto a validación:</strong> el coste contractual final depende del inventario
					real de activos y vacantes, la ubicación y el anteproyecto del CIE, las rutas reales de retorno,
					la RPT, el estudio de mercado y la financiación europea efectivamente concedida.
				</p>
			</div>
		{/if}
	</div>

	<!-- ---------- DESCARGAS ---------- -->
	<div class="mt-6 flex flex-wrap gap-2.5">
		{#each DOWNLOADS as d (d.href)}
			<a href={d.href} download class="descarga">
				<d.icon class="size-3.5 shrink-0" />
				{d.label}
				<span class="descarga-tipo">{d.type}</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.ceuta-scope {
		--ceuta-deep: #0b3550;
		--ceuta-night: #082a3f;
		--ceuta-turquoise: #127e88;
		--ceuta-turquoise-light: #5fbec4;
		--ceuta-sand: #d9a86c;
		--ceuta-sand-soft: #efdfc3;
		--ceuta-cream: #faf6ef;
		--ceuta-ink: #132531;
		--ceuta-ink-soft: #3e5560;
		--ceuta-line: #e1d8c7;
	}
	.hero-tarjeta {
		background: var(--ceuta-cream);
		border-radius: 16px;
		padding: 16px;
	}
	.hero-label {
		font-size: 0.68rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--ceuta-turquoise);
		font-weight: 700;
	}
	.hero-valor {
		margin-top: 6px;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--ceuta-night);
	}
	.hero-nota {
		margin-top: 4px;
		font-size: 0.72rem;
		color: var(--ceuta-ink-soft);
	}
	.selector-wrap {
		background: var(--ceuta-cream);
		border: 1px solid var(--ceuta-line);
	}
	.selector-boton {
		display: flex;
		min-height: 40px;
		align-items: center;
		gap: 6px;
		border-radius: 999px;
		padding: 8px 14px;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--ceuta-ink-soft);
		background: transparent;
		border: none;
		cursor: pointer;
	}
	.selector-boton.activo {
		background: var(--ceuta-deep);
		color: #fff;
	}
	.selector-boton:focus-visible {
		outline: 3px solid var(--ceuta-sand);
		outline-offset: 2px;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
		margin: 20px 0;
	}
	@media (max-width: 900px) {
		.kpi-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.kpi-tarjeta {
		border: 1px solid var(--ceuta-line);
		border-radius: 16px;
		padding: 14px;
	}
	.kpi-label {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--ceuta-ink-soft);
	}
	.kpi-valor {
		margin-top: 6px;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--ceuta-night);
	}
	.kpi-nota {
		margin-top: 4px;
		font-size: 0.7rem;
		color: var(--ceuta-ink-soft);
	}
	.seccion-titulo {
		font-size: 1rem;
		font-weight: 700;
		color: var(--ceuta-night);
	}
	.tabla-wrapper {
		margin-top: 12px;
		overflow-x: auto;
		border: 1px solid var(--ceuta-line);
		border-radius: 12px;
	}
	.scroll-hint {
		display: none;
		margin: 0;
		padding: 6px 12px;
		font-size: 0.7rem;
		color: var(--ceuta-ink-soft);
		border-bottom: 1px solid var(--ceuta-line);
	}
	@media (max-width: 640px) {
		.scroll-hint {
			display: block;
		}
	}
	table.tabla-datos {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	table.tabla-datos caption {
		text-align: left;
		padding: 8px 14px;
		font-size: 0.74rem;
		color: var(--ceuta-ink-soft);
	}
	table.tabla-datos th,
	table.tabla-datos td {
		padding: 10px 14px;
		text-align: right;
		border-bottom: 1px solid var(--ceuta-line);
	}
	table.tabla-datos th:first-child,
	table.tabla-datos td:first-child {
		text-align: left;
	}
	table.tabla-datos thead th {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		background: var(--ceuta-cream);
		color: var(--ceuta-ink-soft);
	}
	table.tabla-datos tfoot td {
		font-weight: 700;
		background: var(--ceuta-cream);
	}
	.peso-fila {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: flex-end;
	}
	.peso-pct {
		font-size: 0.72rem;
	}
	.barra-comparacion {
		display: block;
		height: 8px;
		width: 120px;
		border-radius: 6px;
		background: var(--ceuta-line);
		overflow: hidden;
	}
	.barra-comparacion span {
		display: block;
		height: 100%;
		background: var(--ceuta-turquoise);
	}
	.tarjeta {
		border: 1px solid var(--ceuta-line);
		border-radius: 16px;
		padding: 16px;
	}
	.tarjeta-titulo {
		font-size: 0.72rem;
		text-transform: uppercase;
		color: var(--ceuta-ink-soft);
		margin-bottom: 8px;
	}
	.tarjeta-valor {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--ceuta-night);
		margin: 0 0 6px;
	}
	.tarjeta-nota {
		margin-top: 10px;
		font-size: 0.8rem;
		color: var(--ceuta-ink-soft);
	}
	.chip {
		display: inline-flex;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		padding: 3px 9px;
		border-radius: 999px;
		font-weight: 700;
	}
	.chip-financiacion {
		background: var(--ceuta-sand-soft);
		color: #8a5f22;
	}
	.chip-reserva {
		background: #efe7f4;
		color: #6a4b8a;
	}
	.leyenda-barras {
		display: flex;
		gap: 16px;
		font-size: 0.78rem;
		color: var(--ceuta-ink-soft);
		margin-bottom: 6px;
	}
	.leyenda-barras span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.leyenda-barras i {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		display: inline-block;
	}
	.mini-barra-anual {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		height: 210px;
		margin: 16px 0;
		padding: 0 4px;
	}
	.mini-barra-anual .col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
	}
	.mini-barra-anual .pila {
		width: 100%;
		max-width: 52px;
		display: flex;
		flex-direction: column-reverse;
		border-radius: 6px 6px 0 0;
		overflow: hidden;
	}
	.mini-barra-anual .seg-inv {
		background: var(--ceuta-deep);
	}
	.mini-barra-anual .seg-op {
		background: var(--ceuta-turquoise-light);
	}
	.mini-barra-anual .anio {
		font-size: 0.68rem;
		margin-top: 6px;
		color: var(--ceuta-ink-soft);
	}
	.mini-barra-anual .valor {
		font-size: 0.64rem;
		color: var(--ceuta-ink-soft);
		margin-bottom: 4px;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.formula-cie {
		background: var(--ceuta-night);
		border-radius: 20px;
		padding: 24px;
		margin-top: 12px;
	}
	.formula-linea {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		color: #fff;
	}
	.formula-grupo {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		border: 1.5px dashed rgba(95, 190, 196, 0.55);
		border-radius: 12px;
		padding: 12px 14px;
		background: rgba(95, 190, 196, 0.05);
	}
	.formula-parentesis {
		font-size: 2rem;
		color: var(--ceuta-turquoise-light);
		font-weight: 300;
	}
	@media (max-width: 720px) {
		.formula-parentesis {
			display: none;
		}
		.formula-grupo {
			border-style: solid;
		}
	}
	.op {
		color: var(--ceuta-turquoise-light);
		font-weight: 700;
	}
	.op-igual {
		font-size: 1.2rem;
	}
	.term {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		padding: 7px 11px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.term-destacado {
		background: rgba(95, 190, 196, 0.18);
		border-color: var(--ceuta-turquoise-light);
	}
	.term-valor {
		font-weight: 700;
		color: var(--ceuta-turquoise-light);
	}
	.term-etiqueta {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #b9cbd4;
	}
	.formula-nota {
		font-size: 0.76rem;
		color: #b9cbd4;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
	}
	.resumen-cie {
		border: 1px solid var(--ceuta-line);
		background: var(--ceuta-cream);
		border-radius: 14px;
		padding: 14px;
	}
	.resumen-cie-label {
		font-size: 0.66rem;
		text-transform: uppercase;
		color: var(--ceuta-ink-soft);
	}
	.resumen-cie-valor {
		margin: 6px 0 0;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--ceuta-night);
	}
	.desplegable {
		border: 1px solid var(--ceuta-line);
		border-radius: 12px;
		overflow: hidden;
	}
	.desplegable-resumen {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 18px;
		font-weight: 700;
		color: var(--ceuta-deep);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}
	.desplegable-cuerpo {
		padding: 0 18px 20px;
		font-size: 0.88rem;
		color: var(--ceuta-ink-soft);
	}
	.desplegable-cuerpo p {
		margin: 0 0 10px;
	}
	.descarga {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid var(--ceuta-line);
		border-radius: 999px;
		padding: 7px 14px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ceuta-deep);
		text-decoration: none;
	}
	.descarga:hover {
		border-color: var(--ceuta-deep);
	}
	.descarga-tipo {
		font-size: 0.65rem;
		color: var(--ceuta-ink-soft);
	}
</style>
