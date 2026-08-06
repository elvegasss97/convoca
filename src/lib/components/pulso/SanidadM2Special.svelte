<script lang="ts">
	import { AlertCircle } from '@lucide/svelte';
	import {
		SANIDAD_M2_BACKLOG_TOTAL,
		SANIDAD_M2_EXTRA,
		SANIDAD_BUDGET_YEARS
	} from '$lib/data/sanidadBudgetData';

	// Este bloque siempre usa el escenario Central, igual que en el artifact de
	// referencia: la separación entre gasto extraordinario y recurrente de M2 es
	// una explicación fija del propio diseño de la medida, no cambia con el
	// selector de escenario del resto de la sección.
	const backlogTotal = SANIDAD_M2_BACKLOG_TOTAL.Central;
	const recurrente2032 = SANIDAD_M2_EXTRA.Central['2032'].recurrente;
	const recurrentePct = Math.round((recurrente2032 / backlogTotal) * 100);

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	const maxYearTotal = Math.max(
		...SANIDAD_BUDGET_YEARS.map((y) => {
			const d = SANIDAD_M2_EXTRA.Central[y];
			return d.extraordinario + d.recurrente;
		})
	);

	let hoverYear = $state<string | null>(null);
</script>

<div class="rounded-3xl border border-ink-100 bg-gradient-to-br from-accent-50 to-white p-5 sm:p-7">
	<span
		class="inline-block rounded-full bg-accent-600 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-white"
	>
		M2 · Garantía nacional frente a las listas de espera
	</span>

	<div class="mt-5 grid gap-4 sm:grid-cols-2">
		<div class="rounded-2xl border-t-4 border-accent-500 border-t-accent-500 bg-white p-5">
			<div class="font-mono text-[11px] tracking-wide text-ink-400 uppercase">
				Gasto extraordinario · 2027–2030
			</div>
			<div class="mt-2 font-display text-2xl font-bold text-accent-600 sm:text-3xl">
				{eur(backlogTotal)} M€
			</div>
			<p class="mt-1.5 text-[13.5px] text-ink-600">
				Vaciar de una vez el atasco de diciembre de 2025: 184.715 personas esperando más de seis
				meses. Se ejecuta y desaparece.
			</p>
			<div class="mt-3.5 h-2 overflow-hidden rounded-full bg-ink-100">
				<span class="block h-full rounded-full bg-accent-500" style="width:100%"></span>
			</div>
		</div>
		<div class="rounded-2xl border-t-4 border-t-brand-600 bg-white p-5">
			<div class="font-mono text-[11px] tracking-wide text-ink-400 uppercase">
				Gasto recurrente · desde 2032
			</div>
			<div class="mt-2 font-display text-2xl font-bold text-brand-700 sm:text-3xl">
				{eur(recurrente2032)} M€ <span class="text-base font-medium text-ink-400">/ año</span>
			</div>
			<p class="mt-1.5 text-[13.5px] text-ink-600">
				Capacidad de reserva estructural, coordinación entre servicios de salud, transparencia y
				alternativa pública. Esto es lo que continúa cada año.
			</p>
			<div class="mt-3.5 h-2 overflow-hidden rounded-full bg-ink-100">
				<span class="block h-full rounded-full bg-brand-600" style={`width:${recurrentePct}%`}
				></span>
			</div>
		</div>
	</div>

	<div class="mt-5 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
		<div class="mb-3 font-mono text-[11px] tracking-wide text-ink-400 uppercase">
			Cómo se reparte el gasto de M2 cada año (escenario central)
		</div>
		<div
			class="flex h-32 items-end gap-1.5 overflow-x-auto pb-0.5"
			role="group"
			aria-label="Reparto anual del gasto de M2, escenario central"
		>
			{#each SANIDAD_BUDGET_YEARS as y (y)}
				{@const d = SANIDAD_M2_EXTRA.Central[y]}
				{@const total = d.extraordinario + d.recurrente}
				{@const heightPct = maxYearTotal > 0 ? (total / maxYearTotal) * 100 : 0}
				{@const recPct = total > 0 ? (d.recurrente / total) * 100 : 0}
				{@const exPct = total > 0 ? (d.extraordinario / total) * 100 : 0}
				<button
					type="button"
					onmouseenter={() => (hoverYear = y)}
					onmouseleave={() => (hoverYear = null)}
					onfocus={() => (hoverYear = y)}
					onblur={() => (hoverYear = null)}
					aria-label={`${y}: ${eur(total)} millones de euros, de los cuales ${eur(d.extraordinario)} extraordinarios y ${eur(d.recurrente)} recurrentes`}
					class="flex h-full min-w-[30px] flex-1 flex-col items-center justify-end gap-1.5"
				>
					<span
						class="flex w-full max-w-[34px] flex-col-reverse overflow-hidden rounded-t"
						style={`height:${heightPct}%; ${hoverYear === y ? 'filter:brightness(1.08)' : ''}`}
					>
						<span class="block w-full bg-brand-600" style={`height:${recPct}%`}></span>
						<span class="block w-full bg-accent-500" style={`height:${exPct}%`}></span>
					</span>
					<span class="font-mono text-[10px] text-ink-400">{y}</span>
				</button>
			{/each}
		</div>
		<div class="mt-3.5 flex flex-wrap gap-4 text-xs text-ink-600">
			<span class="inline-flex items-center gap-1.5">
				<span class="size-2.5 rounded-sm bg-accent-500"></span>Extraordinario (backlog)
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="size-2.5 rounded-sm bg-brand-600"></span>Recurrente (estructural)
			</span>
		</div>
	</div>

	<div
		class="mt-4 flex items-start gap-2.5 rounded-2xl border border-accent-300 bg-accent-50 p-4 text-sm text-brand-950"
	>
		<AlertCircle class="mt-0.5 size-4 shrink-0 text-accent-600" />
		<p>
			<strong class="text-accent-700"
				>Los {eur(backlogTotal)} M€ no se vuelven a sumar en 2032.</strong
			>
			El coste anual de 2032 en el escenario central es {eur(recurrente2032)} M€ — nunca {eur(
				backlogTotal + recurrente2032
			)} M€. El atasco se paga una vez, entre 2027 y 2030; la garantía se sostiene después.
		</p>
	</div>
</div>
