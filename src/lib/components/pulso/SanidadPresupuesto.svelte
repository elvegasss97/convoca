<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		SANIDAD_BUDGET_ACUMULADOS,
		SANIDAD_BUDGET_SCENARIOS,
		SANIDAD_BUDGET_TOTALES_2032,
		type SanidadBudgetScenarioKey
	} from '$lib/data/sanidadBudgetData';
	import SanidadBudgetChart from './SanidadBudgetChart.svelte';
	import SanidadMeasureBudgetGrid from './SanidadMeasureBudgetGrid.svelte';
	import SanidadM2Special from './SanidadM2Special.svelte';

	let scenario = $state<SanidadBudgetScenarioKey>('Central');
	let year = $state('2032');

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	// El resumen de cabecera es fijo (escenario central + banda completa), igual
	// que en el artifact de referencia: no cambia con el selector de escenario
	// de más abajo, porque su función es dar el marco general antes de entrar
	// en el detalle interactivo.
	const heroCentral = SANIDAD_BUDGET_TOTALES_2032.Central;
	const heroBajo = SANIDAD_BUDGET_TOTALES_2032.Bajo;
	const heroAlto = SANIDAD_BUDGET_TOTALES_2032.Alto;
	const heroAcumulado = SANIDAD_BUDGET_ACUMULADOS.Central;

	const METHOD_ITEMS = [
		{
			q: 'El presupuesto se construye de abajo arriba',
			a: 'Cada medida se calcula sumando unidades reales por su coste unitario: profesionales adicionales, plazas de formación, módulos por 100.000 habitantes, centros de Atención Primaria, hospitales de referencia. No se reparte porcentualmente ningún total político fijado de antemano.'
		},
		{
			q: 'Solo se cuenta lo incremental frente al escenario sin plan',
			a: 'El gasto de cada año es la diferencia entre el escenario CONVOCA y un escenario base que ya incluye la oferta FSE ordinaria, las plantillas actuales y los programas ya financiados. Por eso no se atribuyen al plan la oferta oficial de plazas, los 172,4 M€ ya invertidos en Atención Primaria, los 39 M€/año del Plan de Salud Mental, los 60,058 M€ de salud bucodental, el Plan Veo ni las inversiones digitales anteriores.'
		},
		{
			q: 'Todo está en euros constantes de 2026',
			a: 'Las cifras no incorporan inflación futura. Sirven para comparar magnitudes entre años y escenarios, no como una previsión nominal de gasto en cada ejercicio presupuestario real.'
		},
		{
			q: 'El gasto puntual, el recurrente y el extraordinario se separan',
			items: [
				'Recurrente: personal, mantenimiento y programas que se repiten cada año.',
				'Puntual (temporal): inversión física y digital, concentrada entre 2027 y 2030.',
				'Extraordinario: el vaciado del atasco de listas de espera heredado (M2), que no vuelve a aparecer después de 2030.'
			]
		},
		{
			q: '¿Por qué la banda bajo–alto es tan amplia?',
			a: 'Representa tres decisiones distintas de cobertura e intensidad —por ejemplo, un cupo de Atención Primaria más o menos exigente, o una cohorte de formación más o menos grande— no un margen de error estadístico. El escenario central es el punto de trabajo recomendado, y todos los supuestos permanecen editables.'
		},
		{
			q: '¿De dónde sale "hasta el 0,5 % del PIB"?',
			a: 'Es únicamente un techo político orientativo que se ha manejado en el debate público, no un resultado que salga de este modelo. El modelo calcula el coste desde las unidades y los costes unitarios, no desde ese porcentaje.'
		}
	];
	const openMethodIndices = new SvelteSet<number>([0]);
	function toggleMethod(i: number) {
		if (openMethodIndices.has(i)) openMethodIndices.delete(i);
		else openMethodIndices.add(i);
	}
</script>

<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
	<div class="rounded-2xl bg-brand-50 p-4">
		<div class="font-mono text-[11px] tracking-wide text-brand-700 uppercase">
			Escenario central · 2032
		</div>
		<div class="mt-1.5 font-display text-2xl font-bold text-brand-900 sm:text-3xl">
			{eur(heroCentral)}<span class="ml-1 text-sm font-medium text-brand-600">M€ / año</span>
		</div>
		<div class="mt-1 text-xs text-ink-500">Gasto adicional frente a no aplicar el plan</div>
	</div>
	<div class="rounded-2xl bg-brand-50 p-4">
		<div class="font-mono text-[11px] tracking-wide text-brand-700 uppercase">
			Banda de escenarios · 2032
		</div>
		<div class="mt-1.5 font-display text-2xl font-bold text-brand-900 sm:text-3xl">
			{eur(heroBajo)}–{eur(heroAlto)}<span class="ml-1 text-sm font-medium text-brand-600"
				>M€ / año</span
			>
		</div>
		<div class="mt-1 text-xs text-ink-500">Según intensidad y cobertura elegidas</div>
	</div>
	<div class="rounded-2xl bg-brand-50 p-4">
		<div class="font-mono text-[11px] tracking-wide text-brand-700 uppercase">
			Acumulado 2027–2036
		</div>
		<div class="mt-1.5 font-display text-2xl font-bold text-brand-900 sm:text-3xl">
			{eur(heroAcumulado)}<span class="ml-1 text-sm font-medium text-brand-600">M€</span>
		</div>
		<div class="mt-1 text-xs text-ink-500">Suma del gasto incremental de los diez años</div>
	</div>
</div>
<p class="mt-3 text-xs text-ink-500">
	Todas las cifras son gasto <strong class="font-semibold text-ink-700">incremental</strong> frente
	al escenario sin plan, en euros
	<strong class="font-semibold text-ink-700">constantes de 2026</strong>. No es el presupuesto total
	de Sanidad, es lo que añadiría CONVOCA.
</p>

<!-- ---------- ESCENARIO (control global de la sección) ---------- -->
<div
	class="mt-5 inline-flex rounded-full border border-ink-100 bg-ink-50 p-1"
	role="radiogroup"
	aria-label="Escenario"
>
	{#each SANIDAD_BUDGET_SCENARIOS as s (s.key)}
		<button
			type="button"
			role="radio"
			aria-checked={s.key === scenario}
			onclick={() => (scenario = s.key)}
			class={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
				s.key === scenario ? 'bg-brand-900 text-white' : 'text-ink-600 hover:bg-white'
			}`}
		>
			<span class="size-2 rounded-full" style={`background-color: var(--color-${s.colorToken})`}
			></span>
			{s.label}
			<span class="hidden text-xs font-normal opacity-70 sm:inline">· {s.desc}</span>
		</button>
	{/each}
</div>

<!-- ---------- EVOLUCIÓN ANUAL ---------- -->
<section class="mt-6">
	<h3 class="font-display text-base font-semibold text-ink-900">¿Cómo crece el gasto año a año?</h3>
	<p class="mt-1 mb-4 text-sm text-ink-500">
		Compara los tres escenarios y observa cómo se reparte el coste entre las ocho medidas en cada
		año.
	</p>
	<SanidadBudgetChart {scenario} {year} onYearChange={(y) => (year = y)} />
</section>

<!-- ---------- DESGLOSE POR MEDIDAS ---------- -->
<section class="mt-8">
	<h3 class="font-display text-base font-semibold text-ink-900">Desglose por medida</h3>
	<p class="mt-1 mb-4 text-sm text-ink-500">
		Toca una medida para ver su evolución completa, su banda de escenarios y los recursos que
		financia.
	</p>
	<SanidadMeasureBudgetGrid {scenario} {year} />
</section>

<!-- ---------- M2 ESPECIAL ---------- -->
<section class="mt-8">
	<h3 class="font-display text-base font-semibold text-ink-900">
		M2 · Listas de espera: dos gastos distintos
	</h3>
	<p class="mt-1 mb-4 text-sm text-ink-500">
		Vaciar el atasco heredado y mantener una garantía permanente no son la misma partida. Mezclarlas
		exageraría el coste real de 2032.
	</p>
	<SanidadM2Special />
</section>

<!-- ---------- METODOLOGÍA ---------- -->
<section class="mt-8">
	<h3 class="font-display text-base font-semibold text-ink-900">Metodología, en lenguaje llano</h3>
	<div class="mt-4 flex flex-col gap-2">
		{#each METHOD_ITEMS as item, i (item.q)}
			{@const isOpen = openMethodIndices.has(i)}
			<div class="overflow-hidden rounded-2xl border border-ink-100">
				<button
					type="button"
					onclick={() => toggleMethod(i)}
					aria-expanded={isOpen}
					class="flex w-full items-center justify-between gap-3 p-3.5 text-left font-display text-sm font-semibold text-ink-900 sm:p-4"
				>
					{item.q}
					{#if isOpen}<ChevronUp class="size-4 shrink-0 text-ink-400" />{:else}<ChevronDown
							class="size-4 shrink-0 text-ink-400"
						/>{/if}
				</button>
				{#if isOpen}
					<div
						class="border-t border-ink-100 px-3.5 pt-3 pb-4 text-sm leading-relaxed text-ink-600 sm:px-4"
					>
						{#if item.a}
							<p>{item.a}</p>
						{:else if item.items}
							<ul class="flex flex-col gap-1.5">
								{#each item.items as line (line)}
									<li class="list-disc pl-1 marker:text-ink-300">{line}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>

<div
	class="mt-8 flex flex-col gap-3 border-t border-ink-100 pt-5 text-xs text-ink-500 sm:flex-row sm:gap-8"
>
	<div class="sm:max-w-sm">
		<p class="font-semibold text-ink-700">Fuente de los datos</p>
		<p class="mt-1">
			Presupuesto_CONVOCA_Sanidad_2036.xlsx y Memoria_Presupuesto_CONVOCA_Sanidad_2036.md (cierre de
			fuentes: 5 de agosto de 2026). Los totales y series proceden directamente del libro de
			cálculo; no se han recalculado ni interpolado años.
		</p>
	</div>
	<div class="sm:max-w-sm">
		<p class="font-semibold text-ink-700">Límites que se mantienen visibles</p>
		<p class="mt-1">
			La banda bajo–alto refleja decisiones de cobertura, no un margen de error estadístico. Varios
			módulos de M4–M8 son hipótesis de política pendientes de acordar con las comunidades autónomas
			y de validar mediante pilotos.
		</p>
	</div>
</div>
