<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		ChevronDown,
		ChevronUp,
		Loader2,
		CheckCircle2,
		LogIn,
		Landmark,
		Coins,
		CalendarClock,
		Cog,
		ShieldAlert,
		Gauge,
		BookText
	} from '@lucide/svelte';
	import type {
		MeasureParticipationResults,
		MeasureParticipationResponse,
		MeasurePosition,
		ParticipationRound,
		TopicSource
	} from '$lib/types';
	import { simpleMeasurePositionLabels } from '$lib/labels';
	import {
		setMeasureParticipationResponse,
		type MeasureParticipationInput
	} from '$lib/services/participationService';
	import { authState } from '$lib/auth/session.svelte';
	import ContentTypeTag from './ContentTypeTag.svelte';

	interface Props {
		measure: import('$lib/types').TopicMeasure;
		number: number;
		round?: ParticipationRound;
		results: MeasureParticipationResults;
		myResponse?: MeasureParticipationResponse;
		sources?: TopicSource[];
	}

	let {
		measure,
		number,
		round,
		results = $bindable(),
		myResponse = $bindable(),
		sources = []
	}: Props = $props();

	let expanded = $state(false);
	const roundOpen = $derived(round?.status === 'open');

	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	const POSITIONS: MeasurePosition[] = ['favor', 'con_cambios', 'en_contra', 'mas_info'];
	const commentRequiredPositions: MeasurePosition[] = ['con_cambios', 'en_contra'];

	let formPosition = $state<MeasurePosition | undefined>(myResponse?.position);
	let formComment = $state(myResponse?.comment ?? '');

	type SaveState = 'idle' | 'saving' | 'saved' | 'updated' | 'error';
	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);
	let showResults = $state(Boolean(myResponse));

	async function saveResponse() {
		if (!authState.session || !round || !formPosition) return;
		const wasFirstResponse = !myResponse;
		saveState = 'saving';
		saveError = null;
		try {
			const input: MeasureParticipationInput = {
				position: formPosition,
				comment: formComment || undefined
			};
			await setMeasureParticipationResponse(round.id, measure.id, input);
			const previousPosition = myResponse?.position;
			myResponse = {
				id: myResponse?.id ?? '',
				roundId: round.id,
				measureId: measure.id,
				userId: '',
				position: input.position,
				comment: input.comment,
				createdAt: myResponse?.createdAt ?? new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			if (previousPosition !== input.position) {
				const nextCounts = { ...results.positionCounts };
				if (previousPosition)
					nextCounts[previousPosition] = Math.max(0, nextCounts[previousPosition] - 1);
				nextCounts[input.position] += 1;
				results = {
					...results,
					positionCounts: nextCounts,
					totalResponses: previousPosition ? results.totalResponses : results.totalResponses + 1
				};
			}
			saveState = wasFirstResponse ? 'saved' : 'updated';
			showResults = true;
		} catch (err) {
			saveState = 'error';
			saveError = err instanceof Error ? err.message : 'No se ha podido guardar tu respuesta.';
		}
	}

	function percentage(count: number): number {
		if (results.totalResponses === 0) return 0;
		return Math.round((count / results.totalResponses) * 100);
	}
</script>

<div class="overflow-hidden rounded-2xl border border-ink-100 bg-white">
	<button
		type="button"
		onclick={() => (expanded = !expanded)}
		disabled={!hydrated}
		aria-expanded={expanded}
		class="flex w-full items-start justify-between gap-3 p-4 text-left disabled:cursor-wait disabled:opacity-90"
	>
		<div class="flex min-w-0 gap-3">
			<span
				class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
				>{number}</span
			>
			<div class="min-w-0">
				<h4 class="font-display text-base font-semibold text-ink-900">{measure.title}</h4>
				{#if measure.summary}
					<p class="mt-1 text-sm leading-relaxed text-ink-600">{measure.summary}</p>
				{/if}
				{#if measure.problemAddressed}
					<p class="mt-1.5 text-xs text-ink-500">
						<strong class="font-semibold text-ink-700">El problema:</strong>
						{measure.problemAddressed}
					</p>
				{/if}
				<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
					{#if measure.responsibleScope}
						<span class="flex items-center gap-1"
							><Landmark class="size-3.5 text-ink-400" /> {measure.responsibleScope}</span
						>
					{/if}
					{#if measure.timeframe}
						<span class="flex items-center gap-1"
							><CalendarClock class="size-3.5 text-ink-400" /> {measure.timeframe}</span
						>
					{/if}
					{#if measure.estimatedCost}
						<span class="flex items-center gap-1"
							><Coins class="size-3.5 text-ink-400" /> {measure.estimatedCost}</span
						>
					{/if}
				</div>
				{#if myResponse}
					<span
						class="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
					>
						<CheckCircle2 class="size-3.5" /> Ya has valorado esta medida
					</span>
				{/if}
				<span class="mt-2 block text-xs font-semibold text-brand-700">
					{#if !hydrated}
						Preparando…
					{:else}
						{expanded ? 'Ocultar medida' : 'Ver medida'}
					{/if}
				</span>
			</div>
		</div>
		{#if expanded}
			<ChevronUp class="mt-1 size-5 shrink-0 text-ink-400" />
		{:else}
			<ChevronDown class="mt-1 size-5 shrink-0 text-ink-400" />
		{/if}
	</button>

	{#if expanded}
		<div class="border-t border-ink-100 p-4">
			<p class="text-sm leading-relaxed whitespace-pre-line text-ink-700">{measure.explanation}</p>

			{#if measure.howItWorks}
				<div class="mt-3 flex items-start gap-2 rounded-xl border border-ink-100 bg-ink-50 p-3">
					<Cog class="mt-0.5 size-4 shrink-0 text-ink-500" />
					<p class="text-sm leading-relaxed text-ink-700">
						<strong class="font-semibold text-ink-900">Cómo funciona:</strong>
						{measure.howItWorks}
					</p>
				</div>
			{/if}

			<div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
				{#if measure.responsibleScope}
					<div class="flex items-start gap-2 text-xs text-ink-600">
						<Landmark class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
						<span
							><strong class="font-semibold text-ink-800">Quién responde:</strong>
							{measure.responsibleScope}</span
						>
					</div>
				{/if}
				{#if measure.estimatedCost}
					<div class="flex items-start gap-2 text-xs text-ink-600">
						<Coins class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
						<span
							><strong class="font-semibold text-ink-800">Coste estimado:</strong>
							{measure.estimatedCost}</span
						>
					</div>
				{/if}
				{#if measure.timeframe}
					<div class="flex items-start gap-2 text-xs text-ink-600">
						<CalendarClock class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
						<span
							><strong class="font-semibold text-ink-800">Calendario:</strong>
							{measure.timeframe}</span
						>
					</div>
				{/if}
			</div>

			{#if measure.argumentsFor}
				<div class="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
					<strong class="font-semibold">Ventajas:</strong>
					{measure.argumentsFor}
				</div>
			{/if}
			{#if measure.risks}
				<div class="mt-2 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700">
					<strong class="font-semibold">Riesgos o dificultades:</strong>
					{measure.risks}
				</div>
			{/if}

			{#if measure.indicators.length > 0}
				<div class="mt-3">
					<p class="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
						<Gauge class="size-3.5 text-brand-600" /> Cómo se medirá
					</p>
					<ul class="mt-1.5 flex flex-col gap-1">
						{#each measure.indicators as indicator (indicator)}
							<li class="text-xs text-ink-600">· {indicator}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if measure.safeguard}
				<div
					class="border-warning-200 mt-3 flex items-start gap-2 rounded-xl border bg-warning-50 p-3"
				>
					<ShieldAlert class="mt-0.5 size-4 shrink-0 text-warning-700" />
					<p class="text-warning-800 text-sm leading-relaxed">
						<strong class="font-semibold">Qué no contará como éxito:</strong>
						{measure.safeguard}
					</p>
				</div>
			{/if}

			{#if sources.length > 0}
				<div class="mt-3">
					<p class="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
						<BookText class="size-3.5 text-brand-600" /> Fuentes de esta medida
					</p>
					<ul class="mt-1.5 flex flex-col gap-1">
						{#each sources as source (source.id)}
							<li class="text-xs">
								{#if source.url}
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer nofollow"
										class="text-brand-700 hover:underline">{source.label}</a
									>
								{:else}
									<span class="text-ink-700">{source.label}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Participación -->
			<div class="mt-4 border-t border-ink-100 pt-4">
				<p class="text-sm font-semibold text-ink-900">Tu participación en esta medida</p>

				{#if !authState.session}
					<div
						class="mt-2 flex flex-col items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3"
					>
						<p class="text-sm text-brand-900">
							Puedes leer toda la propuesta sin registrarte. Inicia sesión únicamente si quieres
							participar.
						</p>
						<a
							href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
							class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
						>
							<LogIn class="size-3.5" /> Iniciar sesión o crear cuenta
						</a>
					</div>
				{:else if !roundOpen}
					<p class="mt-2 text-sm text-ink-500">
						La participación sobre esta medida no está abierta todavía.
					</p>
				{:else}
					<p class="mt-3 text-xs font-semibold text-ink-700">
						¿Cuál es tu posición sobre esta medida?
					</p>
					<div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
						{#each POSITIONS as pos (pos)}
							<button
								type="button"
								onclick={() => (formPosition = pos)}
								aria-pressed={formPosition === pos}
								class="flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition {formPosition ===
								pos
									? 'border-brand-600 bg-brand-50 text-brand-800'
									: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
							>
								{#if formPosition === pos}<CheckCircle2 class="size-4 text-brand-600" />{/if}
								{simpleMeasurePositionLabels[pos]}
							</button>
						{/each}
					</div>

					{#if formPosition && commentRequiredPositions.includes(formPosition)}
						<div class="mt-3">
							<label for={`comment-${measure.id}`} class="text-xs font-semibold text-ink-700">
								¿Qué cambiarías o por qué no la apoyas? (privado, opcional, máximo 500 caracteres)
							</label>
							<textarea
								id={`comment-${measure.id}`}
								bind:value={formComment}
								rows="3"
								maxlength="500"
								placeholder="Opcional…"
								class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<p class="mt-1 text-right text-xs text-ink-400">{formComment.length}/500</p>
						</div>
					{/if}

					{#if formPosition}
						<button
							type="button"
							onclick={saveResponse}
							disabled={saveState === 'saving'}
							class="mt-3 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
						>
							{#if saveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
							{saveState === 'saving'
								? 'Guardando…'
								: myResponse
									? 'Actualizar respuesta'
									: 'Guardar respuesta'}
						</button>
						{#if saveState === 'saved'}
							<p class="mt-1.5 text-xs font-medium text-brand-700">Respuesta guardada.</p>
						{:else if saveState === 'updated'}
							<p class="mt-1.5 text-xs font-medium text-brand-700">Respuesta actualizada.</p>
						{:else if saveState === 'error'}
							<p class="text-critical-600 mt-1.5 text-xs" role="alert">
								{saveError ?? 'Error al guardar. Inténtalo de nuevo.'}
							</p>
						{/if}
					{/if}
				{/if}

				{#if !showResults}
					<button
						type="button"
						onclick={() => (showResults = true)}
						class="mt-3 text-sm font-semibold text-brand-700 hover:underline"
					>
						Ver resultados
					</button>
				{:else}
					<div class="mt-3">
						<ContentTypeTag type="pulso" class="mb-2" />
						{#if results.totalResponses === 0}
							<p class="text-xs text-ink-400">Todavía sin respuestas.</p>
						{:else}
							<ul class="flex flex-col gap-1.5">
								{#each POSITIONS as pos (pos)}
									<li class="flex items-center gap-2 text-xs">
										<span class="w-40 shrink-0 text-ink-700"
											>{simpleMeasurePositionLabels[pos]}</span
										>
										<span class="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
											<span
												class="block h-full rounded-full bg-brand-500"
												style={`width:${percentage(results.positionCounts[pos])}%`}
											></span>
										</span>
										<span class="w-10 shrink-0 text-right font-medium text-ink-800"
											>{percentage(results.positionCounts[pos])}%</span
										>
									</li>
								{/each}
							</ul>
							<p class="mt-1.5 text-xs text-ink-400">
								{results.totalResponses}
								{results.totalResponses === 1 ? 'respuesta' : 'respuestas'}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
