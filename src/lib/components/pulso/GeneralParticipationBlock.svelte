<script lang="ts">
	import { page } from '$app/state';
	import { LogIn, Loader2, CheckCircle2, ListChecks, MapPin } from '@lucide/svelte';
	import type {
		GeneralParticipationResponse,
		GeneralParticipationResults,
		GeneralPosition,
		HousingSituation,
		InvestmentOpinion,
		PacePreference,
		ParticipantContext,
		ParticipationRound,
		ParticipationSummary,
		PriorityResult,
		ResponsePriority,
		TopicMeasure
	} from '$lib/types';
	import {
		generalPositionLabels,
		investmentOpinionLabels,
		pacePreferenceLabels,
		housingSituationLabels
	} from '$lib/labels';
	import {
		setGeneralParticipationResponse,
		setResponsePriorities,
		setParticipantContext
	} from '$lib/services/participationService';
	import { authState } from '$lib/auth/session.svelte';
	import ContentTypeTag from './ContentTypeTag.svelte';

	interface Props {
		round?: ParticipationRound;
		measures: TopicMeasure[];
		measuresRespondedCount: number;
		myGeneralResponse?: GeneralParticipationResponse;
		myPriorities: ResponsePriority[];
		myContext?: ParticipantContext;
		generalResults?: GeneralParticipationResults;
		priorityResults: PriorityResult[];
		summary?: ParticipationSummary;
	}

	let {
		round,
		measures,
		measuresRespondedCount,
		myGeneralResponse,
		myPriorities,
		myContext,
		generalResults,
		priorityResults,
		summary
	}: Props = $props();

	const totalMeasures = $derived(measures.length);

	const GENERAL_POSITIONS: GeneralPosition[] = ['favor', 'con_cambios', 'en_contra', 'mas_info'];
	const INVESTMENT_OPINIONS: InvestmentOpinion[] = [
		'insuficiente',
		'adecuada',
		'excesiva',
		'sin_info'
	];
	const PACE_PREFERENCES: PacePreference[] = [
		'urgentes_primero',
		'progresiva_inicial',
		'gradual_decada',
		'no_apoyo',
		'sin_opinion'
	];
	const HOUSING_SITUATIONS: HousingSituation[] = [
		'alquiler',
		'propiedad',
		'buscando',
		'con_familiares',
		'vivienda_publica',
		'otra',
		'prefiere_no_responder'
	];

	let generalPosition = $state<GeneralPosition | undefined>(myGeneralResponse?.generalPosition);
	let investmentOpinion = $state<InvestmentOpinion | undefined>(
		myGeneralResponse?.investmentOpinion
	);
	let pacePreference = $state<PacePreference | undefined>(myGeneralResponse?.pacePreference);
	let unaddressedProblem = $state(myGeneralResponse?.unaddressedProblem ?? '');

	type SaveState = 'idle' | 'saving' | 'saved' | 'updated' | 'error';
	let generalSaveState = $state<SaveState>('idle');
	let generalSaveError = $state<string | null>(null);
	let showGeneralResults = $state(Boolean(myGeneralResponse));

	async function saveGeneral() {
		if (!round || !generalPosition || !investmentOpinion || !pacePreference) return;
		const wasFirst = !myGeneralResponse;
		generalSaveState = 'saving';
		generalSaveError = null;
		try {
			await setGeneralParticipationResponse(round.id, {
				generalPosition,
				investmentOpinion,
				pacePreference,
				unaddressedProblem: unaddressedProblem || undefined
			});
			generalSaveState = wasFirst ? 'saved' : 'updated';
			showGeneralResults = true;
		} catch (err) {
			generalSaveState = 'error';
			generalSaveError =
				err instanceof Error ? err.message : 'No se ha podido guardar tu valoración.';
		}
	}

	// --- Prioridades: hasta 3 medidas, ordenadas ---
	let selectedPriorities = $state<string[]>(
		[...myPriorities].sort((a, b) => a.rank - b.rank).map((p) => p.measureId)
	);
	let prioritiesSaveState = $state<SaveState>('idle');
	let prioritiesSaveError = $state<string | null>(null);

	function togglePriority(measureId: string) {
		if (selectedPriorities.includes(measureId)) {
			selectedPriorities = selectedPriorities.filter((id) => id !== measureId);
		} else if (selectedPriorities.length < 3) {
			selectedPriorities = [...selectedPriorities, measureId];
		}
	}

	async function savePriorities() {
		if (!round) return;
		prioritiesSaveState = 'saving';
		prioritiesSaveError = null;
		try {
			await setResponsePriorities(round.id, selectedPriorities);
			prioritiesSaveState = 'saved';
		} catch (err) {
			prioritiesSaveState = 'error';
			prioritiesSaveError =
				err instanceof Error ? err.message : 'No se ha podido guardar tu selección.';
		}
	}

	// --- Contexto voluntario ---
	let community = $state(myContext?.community ?? '');
	let housingSituation = $state<HousingSituation | ''>(myContext?.housingSituation ?? '');
	let contextSaveState = $state<SaveState>('idle');

	async function saveContext() {
		if (!round) return;
		contextSaveState = 'saving';
		try {
			await setParticipantContext(round.id, {
				community: community || undefined,
				housingSituation: housingSituation || undefined
			});
			contextSaveState = 'saved';
		} catch {
			contextSaveState = 'error';
		}
	}

	function measureTitle(measureId: string): string {
		return measures.find((m) => m.id === measureId)?.title ?? 'Medida';
	}

	function resultPercentage(count: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((count / total) * 100);
	}
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h2 class="font-display text-base font-semibold text-ink-900">Tu participación</h2>

	{#if !authState.session}
		<p class="mt-2 text-sm text-ink-600">
			Puedes leer todo el plan sin registrarte. Inicia sesión únicamente si quieres participar.
		</p>
		<a
			href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
			class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
		>
			<LogIn class="size-3.5" /> Iniciar sesión o crear cuenta
		</a>
	{:else if !round || round.status !== 'open'}
		<p class="mt-2 text-sm text-ink-500">
			La participación sobre este tema no está abierta todavía.
		</p>
	{:else}
		<p class="mt-1 text-sm text-ink-700">
			Has valorado {measuresRespondedCount} de las {totalMeasures} medidas.
		</p>
		<p class="mt-0.5 text-xs text-ink-400">
			Puedes continuar cuando quieras. No es necesario responder a todo.
		</p>

		<!-- Prioridades -->
		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
				<ListChecks class="size-4 text-brand-700" /> Elige las tres medidas que deberían recibir mayor
				prioridad
			</p>
			<p class="mt-0.5 text-xs text-ink-400">
				Puedes elegir una, dos o tres, en el orden que prefieras.
			</p>
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each measures as measure (measure.id)}
					{@const rank = selectedPriorities.indexOf(measure.id)}
					<li>
						<button
							type="button"
							onclick={() => togglePriority(measure.id)}
							disabled={rank === -1 && selectedPriorities.length >= 3}
							class="flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 {rank >=
							0
								? 'border-brand-600 bg-brand-50'
								: 'border-ink-200 hover:border-brand-300 hover:bg-brand-50'}"
						>
							<span
								class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold {rank >=
								0
									? 'bg-brand-600 text-white'
									: 'bg-ink-100 text-ink-400'}">{rank >= 0 ? rank + 1 : ''}</span
							>
							<span class="min-w-0">
								<span class="block font-medium text-ink-900">{measure.title}</span>
								{#if measure.summary}
									<span class="mt-0.5 block text-xs text-ink-500">{measure.summary}</span>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
			<button
				type="button"
				onclick={savePriorities}
				disabled={prioritiesSaveState === 'saving'}
				class="mt-2.5 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
			>
				{#if prioritiesSaveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
				{prioritiesSaveState === 'saving' ? 'Guardando…' : 'Guardar prioridades'}
			</button>
			{#if prioritiesSaveState === 'saved'}
				<p class="mt-1.5 text-xs font-medium text-brand-700">Prioridades guardadas.</p>
			{:else if prioritiesSaveState === 'error'}
				<p class="text-critical-600 mt-1.5 text-xs" role="alert">
					{prioritiesSaveError ?? 'Error al guardar.'}
				</p>
			{/if}

			{#if priorityResults.length > 0}
				<div class="mt-3">
					<ContentTypeTag type="pulso" class="mb-2" />
					<ul class="flex flex-col gap-1">
						{#each priorityResults.slice(0, 5) as pr (pr.measureId)}
							<li class="flex items-center justify-between text-xs text-ink-700">
								<span class="truncate">{measureTitle(pr.measureId)}</span>
								<span class="shrink-0 text-ink-400"
									>{pr.timesTop3} {pr.timesTop3 === 1 ? 'vez' : 'veces'} en el top 3</span
								>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Valoración general -->
		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="text-sm font-semibold text-ink-900">Valoración general del plan</p>
			<p class="mt-0.5 text-xs text-ink-400">
				Estás valorando el conjunto después de revisar {measuresRespondedCount} de las {totalMeasures}
				medidas.
			</p>

			<p class="mt-3 text-xs font-semibold text-ink-700">
				¿Cuál es tu posición sobre el Plan Vivienda 2036 en su conjunto?
			</p>
			<div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each GENERAL_POSITIONS as pos (pos)}
					<button
						type="button"
						onclick={() => (generalPosition = pos)}
						aria-pressed={generalPosition === pos}
						class="rounded-xl border px-2 py-2 text-sm font-medium {generalPosition === pos
							? 'border-brand-600 bg-brand-50 text-brand-800'
							: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
					>
						{generalPositionLabels[pos]}
					</button>
				{/each}
			</div>

			<p class="mt-3 text-xs font-semibold text-ink-700">¿Cómo valoras la inversión planteada?</p>
			<select
				bind:value={investmentOpinion}
				class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			>
				<option value={undefined}>Sin indicar</option>
				{#each INVESTMENT_OPINIONS as opt (opt)}
					<option value={opt}>{investmentOpinionLabels[opt]}</option>
				{/each}
			</select>

			<p class="mt-3 text-xs font-semibold text-ink-700">¿Qué ritmo de aplicación prefieres?</p>
			<select
				bind:value={pacePreference}
				class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			>
				<option value={undefined}>Sin indicar</option>
				{#each PACE_PREFERENCES as opt (opt)}
					<option value={opt}>{pacePreferenceLabels[opt]}</option>
				{/each}
			</select>

			<label for="unaddressed-problem" class="mt-3 block text-xs font-semibold text-ink-700">
				¿Qué problema importante relacionado con la vivienda crees que este plan no aborda?
				(opcional)
			</label>
			<textarea
				id="unaddressed-problem"
				bind:value={unaddressedProblem}
				rows="2"
				maxlength="600"
				placeholder="Máximo 600 caracteres…"
				class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			></textarea>

			<button
				type="button"
				onclick={saveGeneral}
				disabled={generalSaveState === 'saving' ||
					!generalPosition ||
					!investmentOpinion ||
					!pacePreference}
				class="mt-3 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
			>
				{#if generalSaveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
				{generalSaveState === 'saving'
					? 'Guardando…'
					: myGeneralResponse
						? 'Actualizar valoración'
						: 'Guardar valoración'}
			</button>
			{#if generalSaveState === 'saved'}
				<p class="mt-1.5 text-xs font-medium text-brand-700">Respuesta guardada.</p>
			{:else if generalSaveState === 'updated'}
				<p class="mt-1.5 text-xs font-medium text-brand-700">Respuesta actualizada.</p>
			{:else if generalSaveState === 'error'}
				<p class="text-critical-600 mt-1.5 text-xs" role="alert">
					{generalSaveError ?? 'Error al guardar.'}
				</p>
			{/if}

			{#if !showGeneralResults}
				<button
					type="button"
					onclick={() => (showGeneralResults = true)}
					class="mt-3 block text-sm font-semibold text-brand-700 hover:underline"
				>
					Ver resultados
				</button>
			{:else if generalResults}
				<div class="mt-3">
					<ContentTypeTag type="pulso" class="mb-2" />
					{#if summary && summary.totalGeneralResponses > 0}
						<ul class="flex flex-col gap-1">
							{#each GENERAL_POSITIONS as pos (pos)}
								{@const count = generalResults.generalPosition[pos] ?? 0}
								<li class="flex items-center gap-2 text-xs">
									<span class="w-44 shrink-0 text-ink-700">{generalPositionLabels[pos]}</span>
									<span class="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
										<span
											class="block h-full rounded-full bg-brand-500"
											style={`width:${resultPercentage(count, summary.totalGeneralResponses)}%`}
										></span>
									</span>
									<span class="w-10 shrink-0 text-right font-medium text-ink-800"
										>{resultPercentage(count, summary.totalGeneralResponses)}%</span
									>
								</li>
							{/each}
						</ul>
						<p class="mt-1.5 text-xs text-ink-400">
							{summary.totalGeneralResponses}
							{summary.totalGeneralResponses === 1
								? 'persona ha valorado'
								: 'personas han valorado'} el conjunto del plan
						</p>
					{:else}
						<p class="text-xs text-ink-400">Todavía sin respuestas.</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Contexto voluntario -->
		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
				<MapPin class="size-4 text-brand-700" /> Contexto voluntario
			</p>
			<p class="mt-0.5 text-xs text-ink-400">
				Estos datos opcionales ayudan a interpretar mejor los resultados. No convierten la
				participación en una encuesta representativa.
			</p>
			<input
				bind:value={community}
				maxlength="120"
				placeholder="Comunidad o ciudad autónoma (opcional)"
				class="mt-2 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			/>
			<select
				bind:value={housingSituation}
				class="mt-2 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			>
				<option value="">Prefiero no indicar situación</option>
				{#each HOUSING_SITUATIONS as situation (situation)}
					<option value={situation}>{housingSituationLabels[situation]}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={saveContext}
				disabled={contextSaveState === 'saving'}
				class="mt-2 flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
			>
				{#if contextSaveState === 'saving'}<Loader2
						class="size-3.5 animate-spin"
					/>{:else if contextSaveState === 'saved'}<CheckCircle2
						class="size-3.5 text-brand-600"
					/>{/if}
				{contextSaveState === 'saved' ? 'Guardado' : 'Guardar contexto'}
			</button>
		</div>
	{/if}
</div>
