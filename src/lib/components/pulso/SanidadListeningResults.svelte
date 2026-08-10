<script lang="ts">
	import { onMount } from 'svelte';
	import { BarChart3, ShieldAlert } from '@lucide/svelte';
	import type { ListeningRound, TopicCommitment, TopicMeasure } from '$lib/types';
	import { listeningProblemLabel } from '$lib/data/sanidadListeningOptions';
	import {
		getListeningSurveySummary,
		getListeningSurveyTerritoryBreakdown,
		getListeningSurveyTotal
	} from '$lib/services/listeningSurveyService';

	interface Props {
		round?: ListeningRound;
		measures: TopicMeasure[];
		commitments: TopicCommitment[];
	}

	let { round, measures, commitments }: Props = $props();

	const TERRITORY_THRESHOLD = 30;
	// Con pocas respuestas totales, un "más seleccionado" no dice nada útil
	// y podría acercarse a señalar una respuesta individual: se espera a
	// una base mínima antes de mostrar desgloses, no solo el total.
	const REVEAL_THRESHOLD = 5;

	let loading = $state(true);
	let total = $state(0);
	let counts = $state<Awaited<ReturnType<typeof getListeningSurveySummary>>>([]);
	let territory = $state<Awaited<ReturnType<typeof getListeningSurveyTerritoryBreakdown>>>([]);

	onMount(async () => {
		if (!round) {
			loading = false;
			return;
		}
		try {
			const [t, c, terr] = await Promise.all([
				getListeningSurveyTotal(round.id),
				getListeningSurveySummary(round.id),
				getListeningSurveyTerritoryBreakdown(round.id, TERRITORY_THRESHOLD)
			]);
			total = t;
			counts = c;
			territory = terr;
		} catch {
			// Estado honesto: si falla la carga, se muestra igualmente el
			// aviso de "todavía sin base suficiente" en vez de un error críptico.
		} finally {
			loading = false;
		}
	});

	function topOf(dimension: string, limit: number) {
		return counts
			.filter((c) => c.dimension === dimension)
			.sort((a, b) => b.responseCount - a.responseCount)
			.slice(0, limit);
	}

	function measureTitle(id: string): string {
		return measures.find((m) => m.id === id)?.title ?? 'Medida';
	}

	function commitmentTitle(id: string): string {
		return commitments.find((c) => c.id === id)?.title ?? 'Compromiso';
	}

	const topProblems = $derived(topOf('problem', 5));
	const topMeasures = $derived(topOf('prioritized_measure', 3));
	const topUrgent = $derived(topOf('commitment_most_urgent', 1)[0]);
	const topDifficult = $derived(topOf('commitment_most_difficult', 1)[0]);
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h3 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
		<BarChart3 class="size-4 text-brand-700" /> Cómo se analizarán los resultados
	</h3>

	{#if loading}
		<p class="mt-2 text-sm text-ink-400">Cargando…</p>
	{:else}
		<p class="mt-2 text-sm text-ink-700">
			<strong class="font-semibold text-ink-900">{total}</strong>
			{total === 1 ? 'participación válida' : 'participaciones válidas'} hasta ahora.
		</p>

		{#if total < REVEAL_THRESHOLD}
			<p
				class="mt-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-3 text-sm text-ink-500"
			>
				Todavía no hay respuestas suficientes para mostrar resultados agregados. Se publicarán
				cuando exista una base suficiente.
			</p>
		{:else}
			<div class="mt-3">
				<p class="text-xs font-semibold text-ink-700">Problemas más seleccionados</p>
				<ul class="mt-1.5 flex flex-col gap-1">
					{#each topProblems as row (row.code)}
						<li class="flex items-center justify-between text-xs text-ink-700">
							<span>{listeningProblemLabel(row.code)}</span>
							<span class="text-ink-400"
								>{row.responseCount} {row.responseCount === 1 ? 'vez' : 'veces'}</span
							>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-3">
				<p class="text-xs font-semibold text-ink-700">Medidas más priorizadas</p>
				<ul class="mt-1.5 flex flex-col gap-1">
					{#each topMeasures as row (row.code)}
						<li class="flex items-center justify-between text-xs text-ink-700">
							<span>{measureTitle(row.code)}</span>
							<span class="text-ink-400"
								>{row.responseCount} {row.responseCount === 1 ? 'vez' : 'veces'}</span
							>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				<div class="rounded-xl border border-ink-100 p-3">
					<p class="text-xs text-ink-500">Compromiso considerado más urgente</p>
					<p class="mt-0.5 text-sm font-semibold text-ink-900">
						{topUrgent ? commitmentTitle(topUrgent.code) : 'Pendiente de datos'}
					</p>
				</div>
				<div class="rounded-xl border border-ink-100 p-3">
					<p class="text-xs text-ink-500">Compromiso considerado más difícil</p>
					<p class="mt-0.5 text-sm font-semibold text-ink-900">
						{topDifficult ? commitmentTitle(topDifficult.code) : 'Pendiente de datos'}
					</p>
				</div>
			</div>
		{/if}

		<div class="mt-3">
			<p class="text-xs font-semibold text-ink-700">Distribución por territorio</p>
			{#if territory.length > 0}
				<ul class="mt-1.5 flex flex-col gap-1">
					{#each territory as row (row.community)}
						<li class="flex items-center justify-between text-xs text-ink-700">
							<span>{row.community}</span>
							<span class="text-ink-400">{row.responseCount} respuestas</span>
						</li>
					{/each}
				</ul>
			{:else}
				<!--
					0043: el desglose es todo-o-nada por ronda, no por comunidad — si cualquier
					comunidad con respuestas está por debajo de TERRITORY_THRESHOLD, no se muestra
					ninguna (protección frente a reconstrucción por resta sobre un catálogo cerrado
					de comunidades). No afirmar que "ninguna" tiene base suficiente: puede que la
					mayoría sí la tenga y una sola esté bloqueando el desglose completo.
				-->
				<p class="mt-1.5 text-xs text-ink-400">
					Por privacidad, el desglose por comunidad autónoma solo se muestra cuando todas las
					comunidades con respuestas superan las {TERRITORY_THRESHOLD}. Aún no hay datos suficientes
					para mostrarlo.
				</p>
			{/if}
		</div>

		<div
			class="mt-3 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs leading-relaxed text-warning-700"
		>
			<ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
			Estos resultados reflejan una participación abierta en Convoca. No constituyen una muestra representativa
			de la población española ni una votación oficial.
		</div>
	{/if}
</div>
