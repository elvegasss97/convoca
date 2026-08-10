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
		AlertTriangle,
		Gauge,
		MessagesSquare,
		BookText,
		Clock3,
		ShieldCheck
	} from '@lucide/svelte';
	import type {
		MeasureParticipationResults,
		MeasureParticipationResponse,
		MeasurePosition,
		MeasureUrgency,
		ParticipationRound,
		TopicMeasureAlternative,
		TopicSource
	} from '$lib/types';
	import {
		measurePositionLabels,
		measureUrgencyLabels,
		measureReasonOptionsByPosition,
		topicMeasureAlternativeStatusLabels
	} from '$lib/labels';
	import {
		setMeasureParticipationResponse,
		type MeasureParticipationInput
	} from '$lib/services/participationService';
	import {
		createDevelopedProposal,
		listMyDevelopedProposalsForMeasure,
		listPublicDevelopedProposals,
		type DevelopedProposalInput
	} from '$lib/services/topicsService';
	import { authState } from '$lib/auth/session.svelte';
	import ContentTypeTag from './ContentTypeTag.svelte';

	interface Props {
		measure: import('$lib/types').TopicMeasure;
		topicId: string;
		number: number;
		round?: ParticipationRound;
		results: MeasureParticipationResults;
		myResponse?: MeasureParticipationResponse;
		sources?: TopicSource[];
		expanded: boolean;
		onToggle: () => void;
	}

	let {
		measure,
		topicId,
		number,
		round,
		results = $bindable(),
		myResponse = $bindable(),
		sources = [],
		expanded,
		onToggle
	}: Props = $props();

	const roundOpen = $derived(round?.status === 'open');

	// La página se renderiza en servidor y parece lista antes de que el
	// cliente termine de hidratar: un clic justo en ese hueco se pierde en
	// silencio. Se deshabilita el botón (con `disabled`, sin depender de JS)
	// hasta que este componente termine de montarse.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	const POSITIONS: MeasurePosition[] = ['favor', 'con_cambios', 'en_contra', 'mas_info'];
	const URGENCIES: MeasureUrgency[] = [
		'inmediata',
		'primeros_anos',
		'medio_plazo',
		'no_aplicar',
		'sin_opinion'
	];

	// --- Formulario de respuesta (posición + motivo + comentario + urgencia + cambio rápido) ---
	let formPosition = $state<MeasurePosition | undefined>(myResponse?.position);
	let formReasonCode = $state(myResponse?.reasonCode ?? '');
	let formReasonOther = $state(myResponse?.reasonOther ?? '');
	let formComment = $state(myResponse?.comment ?? '');
	let formUrgency = $state<MeasureUrgency | ''>(myResponse?.urgency ?? '');
	let formQuickChange = $state(myResponse?.quickChange ?? '');
	let showCommentField = $state(Boolean(myResponse?.comment));

	type SaveState = 'idle' | 'saving' | 'saved' | 'updated' | 'error';
	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);
	let showResults = $state(Boolean(myResponse));

	const reasonOptions = $derived(formPosition ? measureReasonOptionsByPosition[formPosition] : []);

	async function saveResponse() {
		if (!authState.session || !round || !formPosition) return;
		const wasFirstResponse = !myResponse;
		saveState = 'saving';
		saveError = null;
		try {
			const input: MeasureParticipationInput = {
				position: formPosition,
				reasonCode: formReasonCode || undefined,
				reasonOther: formReasonCode === 'otro' ? formReasonOther || undefined : undefined,
				comment: formComment || undefined,
				urgency: formUrgency || undefined,
				quickChange: formPosition === 'con_cambios' ? formQuickChange || undefined : undefined
			};
			await setMeasureParticipationResponse(round.id, measure.id, input);
			const previousPosition = myResponse?.position;
			myResponse = {
				id: myResponse?.id ?? '',
				roundId: round.id,
				measureId: measure.id,
				userId: '',
				position: input.position,
				reasonCode: input.reasonCode,
				reasonOther: input.reasonOther,
				comment: input.comment,
				urgency: input.urgency,
				quickChange: input.quickChange,
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

	// --- Propuestas desarrolladas: se cargan solo al expandir la medida ---
	let myProposals = $state<TopicMeasureAlternative[]>([]);
	let publicProposals = $state<TopicMeasureAlternative[]>([]);
	let proposalsLoaded = $state(false);
	$effect(() => {
		if (expanded && !proposalsLoaded) {
			proposalsLoaded = true;
			Promise.all([
				round && authState.session
					? listMyDevelopedProposalsForMeasure(round.id, measure.id)
					: Promise.resolve([]),
				listPublicDevelopedProposals(measure.id)
			]).then(([mine, published]) => {
				myProposals = mine;
				publicProposals = published;
			});
		}
	});

	let showProposalForm = $state(false);
	const emptyProposalForm: DevelopedProposalInput = {
		title: '',
		measurePart: '',
		description: '',
		reason: '',
		expectedEffect: '',
		acknowledgedRisks: '',
		sourceUrl: ''
	};
	let proposalForm = $state<DevelopedProposalInput>({ ...emptyProposalForm });
	let proposalSubmitting = $state(false);
	let proposalError = $state<string | null>(null);

	const proposalValid = $derived(
		proposalForm.title.trim().length >= 5 && proposalForm.description.trim().length >= 10
	);

	async function saveProposal(asDraft: boolean) {
		if (!round || !authState.session || !proposalValid) return;
		proposalSubmitting = true;
		proposalError = null;
		try {
			const created = await createDevelopedProposal(
				topicId,
				round.id,
				measure.id,
				proposalForm,
				asDraft
			);
			myProposals = [created, ...myProposals];
			proposalForm = { ...emptyProposalForm };
			showProposalForm = false;
		} catch (err) {
			proposalError = err instanceof Error ? err.message : 'No se ha podido guardar tu propuesta.';
		} finally {
			proposalSubmitting = false;
		}
	}
</script>

<div
	class="overflow-hidden rounded-2xl border bg-white transition-colors {expanded
		? 'border-brand-200'
		: 'border-ink-100'}"
>
	<button
		type="button"
		onclick={onToggle}
		disabled={!hydrated}
		aria-expanded={expanded}
		aria-controls={`topic-measure-panel-${measure.id}`}
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
				{#if !expanded && (measure.estimatedCost || measure.timeframe)}
					<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
						{#if measure.estimatedCost}
							<span class="flex items-center gap-1 text-xs text-ink-500">
								<Coins class="size-3 shrink-0 text-brand-600" />{measure.estimatedCost}
							</span>
						{/if}
						{#if measure.timeframe}
							<span class="flex items-center gap-1 text-xs text-ink-500">
								<CalendarClock class="size-3 shrink-0 text-brand-600" />{measure.timeframe.replace(
									'Plazo: ',
									''
								)}
							</span>
						{/if}
					</div>
				{/if}
				{#if myResponse}
					<span
						class="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
					>
						<CheckCircle2 class="size-3.5" /> Ya has valorado esta medida
					</span>
				{/if}
				<span class="mt-2 block text-xs font-semibold text-brand-700">
					{expanded ? 'Ocultar medida' : 'Ver medida'}
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
		<div id={`topic-measure-panel-${measure.id}`} class="border-t border-ink-100 p-4">
			<div
				class="mb-3 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs leading-relaxed text-warning-700"
			>
				<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
				Borrador elaborado por Convoca. No representa automáticamente la opinión de los participantes.
			</div>

			{#if measure.problemAddressed}
				<p class="text-xs text-ink-500">
					<strong class="font-semibold text-ink-700">Problema que resuelve:</strong>
					{measure.problemAddressed}
				</p>
			{/if}

			<p class="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-700">
				{measure.explanation}
			</p>

			{#if measure.howItWorks}
				<p class="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-700">
					<Cog class="mt-0.5 size-4 shrink-0 text-ink-400" />
					<span
						><strong class="font-semibold text-ink-900">Cómo funcionaría:</strong>
						{measure.howItWorks}</span
					>
				</p>
			{/if}

			{#if measure.responsibleScope}
				<p class="mt-2 flex items-start gap-2 text-sm leading-relaxed text-ink-700">
					<Landmark class="mt-0.5 size-4 shrink-0 text-ink-400" />
					<span
						><strong class="font-semibold text-ink-900">Quién lo aplicaría:</strong>
						{measure.responsibleScope}</span
					>
				</p>
			{/if}

			<div class="mt-3 grid grid-cols-1 gap-2.5 rounded-xl bg-brand-50/60 p-3 sm:grid-cols-2">
				{#if measure.estimatedCost}
					<div class="flex items-start gap-2 text-xs text-ink-700">
						<Coins class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
						<span
							><strong class="font-semibold text-ink-900">Inversión estimada:</strong>
							{measure.estimatedCost}</span
						>
					</div>
				{/if}
				{#if measure.timeframe}
					<div class="flex items-start gap-2 text-xs text-ink-700">
						<CalendarClock class="mt-0.5 size-3.5 shrink-0 text-brand-600" />
						<span
							><strong class="font-semibold text-ink-900">Plazo:</strong>
							{measure.timeframe.replace('Plazo: ', '')}</span
						>
					</div>
				{/if}
			</div>

			{#if measure.argumentsFor || measure.risks || measure.indicators.length > 0}
				<div class="mt-4 border-t border-ink-100 pt-3">
					<p
						class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase"
					>
						<ShieldCheck class="size-3.5 text-ink-400" /> Riesgos, garantías e indicadores
					</p>
					{#if measure.argumentsFor}
						<p class="mt-2 text-sm leading-relaxed text-ink-700">
							<strong class="font-semibold text-brand-800">Ventajas:</strong>
							{measure.argumentsFor}
						</p>
					{/if}
					{#if measure.risks}
						<p class="mt-2 text-sm leading-relaxed text-ink-700">
							<strong class="font-semibold text-ink-900">Riesgos o dificultades:</strong>
							{measure.risks}
						</p>
					{/if}
					{#if measure.indicators.length > 0}
						<div class="mt-2">
							<p class="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
								<Gauge class="size-3.5 text-brand-600" /> Indicadores para medirla
							</p>
							<ul class="mt-1.5 flex flex-col gap-1">
								{#each measure.indicators as indicator (indicator)}
									<li class="text-xs text-ink-600">· {indicator}</li>
								{/each}
							</ul>
						</div>
					{/if}
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
							Puedes leer todo el plan sin registrarte. Inicia sesión únicamente si quieres
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
					<!-- 1. Posición -->
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
								{measurePositionLabels[pos]}
							</button>
						{/each}
					</div>

					<!-- 2. Motivo principal -->
					{#if formPosition}
						<p class="mt-3 text-xs font-semibold text-ink-700">¿Cuál es el motivo principal?</p>
						<select
							bind:value={formReasonCode}
							class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							<option value="">Sin indicar</option>
							{#each reasonOptions as opt (opt.code)}
								<option value={opt.code}>{opt.label}</option>
							{/each}
						</select>
						{#if formReasonCode === 'otro'}
							<input
								bind:value={formReasonOther}
								maxlength="200"
								placeholder="Describe brevemente el motivo…"
								class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							/>
							<p class="mt-1 text-xs text-ink-400">
								No incluyas datos personales tuyos o de terceros que no sean necesarios.
							</p>
						{/if}
					{/if}

					<!-- 3. Explicación opcional -->
					{#if formPosition}
						{#if !showCommentField}
							<button
								type="button"
								onclick={() => (showCommentField = true)}
								class="mt-3 text-xs font-semibold text-brand-700 hover:underline"
							>
								¿Quieres explicar tu respuesta?
							</button>
						{:else}
							<div class="mt-3">
								<label for={`comment-${measure.id}`} class="text-xs font-semibold text-ink-700"
									>¿Quieres explicar tu respuesta? (privado, no se publica)</label
								>
								<textarea
									id={`comment-${measure.id}`}
									bind:value={formComment}
									rows="2"
									maxlength="400"
									placeholder="Opcional, máximo 400 caracteres…"
									class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
								></textarea>
								<p class="mt-1 text-xs text-ink-400">
									No incluyas datos personales tuyos o de terceros que no sean necesarios.
								</p>
							</div>
						{/if}
					{/if}

					<!-- 4. Urgencia -->
					{#if formPosition}
						<p class="mt-3 text-xs font-semibold text-ink-700">
							¿Con qué urgencia debería aplicarse?
						</p>
						<select
							bind:value={formUrgency}
							class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							<option value="">Sin indicar</option>
							{#each URGENCIES as u (u)}
								<option value={u}>{measureUrgencyLabels[u]}</option>
							{/each}
						</select>
					{/if}

					<!-- 5. Cambio rápido -->
					{#if formPosition === 'con_cambios'}
						<div class="mt-3">
							<label for={`quick-${measure.id}`} class="text-xs font-semibold text-ink-700"
								>¿Qué cambiarías? (cambio rápido, privado)</label
							>
							<textarea
								id={`quick-${measure.id}`}
								bind:value={formQuickChange}
								rows="2"
								maxlength="400"
								placeholder="Opcional, máximo 400 caracteres…"
								class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<p class="mt-1 text-xs text-ink-400">
								No incluyas datos personales tuyos o de terceros que no sean necesarios.
							</p>
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
							<p class="text-xs text-ink-400">Aún no hay datos suficientes.</p>
						{:else}
							<ul class="flex flex-col gap-1.5">
								{#each POSITIONS as pos (pos)}
									<li class="flex items-center gap-2 text-xs">
										<span class="w-40 shrink-0 text-ink-700">{measurePositionLabels[pos]}</span>
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
								{results.positionCounts.favor +
									results.positionCounts.con_cambios +
									results.positionCounts.en_contra +
									results.positionCounts.mas_info}
								de {results.totalResponses}
								{results.totalResponses === 1 ? 'respuesta' : 'respuestas'} — A favor:
								{results.positionCounts.favor} de {results.totalResponses} ({percentage(
									results.positionCounts.favor
								)}%)
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Propuestas desarrolladas -->
			<div class="mt-4 border-t border-ink-100 pt-4">
				<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
					<MessagesSquare class="size-4 text-brand-700" /> Propuestas de modificación
					{#if proposalsLoaded && publicProposals.length > 0}<span class="text-ink-400"
							>({publicProposals.length})</span
						>{/if}
				</p>

				{#if publicProposals.length > 0}
					<ul class="mt-2 flex flex-col gap-2">
						{#each publicProposals as proposal (proposal.id)}
							<li class="rounded-xl border border-ink-100 p-3">
								<div class="flex flex-wrap items-center gap-1.5">
									<ContentTypeTag type="ciudadana" />
									<span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
										>{topicMeasureAlternativeStatusLabels[proposal.status]}</span
									>
								</div>
								<p class="mt-1.5 text-sm font-medium text-ink-900">{proposal.title}</p>
								<p class="mt-0.5 text-sm text-ink-600">{proposal.description}</p>
								{#if proposal.editorialResponse}
									<p class="mt-1.5 rounded-lg bg-brand-50 p-2 text-xs text-brand-800">
										<strong class="font-semibold">Respuesta de Convoca:</strong>
										{proposal.editorialResponse}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if proposalsLoaded}
					<p class="mt-2 text-xs text-ink-400">
						Todavía no hay propuestas publicadas para esta medida.
					</p>
				{/if}

				{#if myProposals.length > 0}
					<div class="mt-3">
						<p class="text-xs font-semibold text-ink-700">Tus propuestas</p>
						<ul class="mt-1.5 flex flex-col gap-2">
							{#each myProposals as proposal (proposal.id)}
								<li class="rounded-xl border border-dashed border-ink-200 p-3">
									<span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
										>{topicMeasureAlternativeStatusLabels[proposal.status]}</span
									>
									<p class="mt-1.5 text-sm font-medium text-ink-900">{proposal.title}</p>
									<p class="mt-0.5 text-sm text-ink-600">{proposal.description}</p>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if authState.session && roundOpen}
					{#if !showProposalForm}
						<button
							type="button"
							onclick={() => (showProposalForm = true)}
							class="mt-2.5 text-sm font-semibold text-brand-700 hover:underline"
						>
							Hacer una propuesta desarrollada
						</button>
					{:else}
						<form class="mt-2.5 space-y-2" onsubmit={(e) => e.preventDefault()}>
							{#if proposalError}
								<p class="text-critical-600 text-sm" role="alert">{proposalError}</p>
							{/if}
							<input
								bind:value={proposalForm.title}
								maxlength="120"
								placeholder="Título"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							/>
							<input
								bind:value={proposalForm.measurePart}
								maxlength="200"
								placeholder="Parte de la medida que modificarías (opcional)"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							/>
							<textarea
								bind:value={proposalForm.description}
								rows="2"
								maxlength="600"
								placeholder="Cambio propuesto"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<textarea
								bind:value={proposalForm.reason}
								rows="2"
								maxlength="400"
								placeholder="Motivo (opcional)"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<textarea
								bind:value={proposalForm.expectedEffect}
								rows="2"
								maxlength="400"
								placeholder="Efecto esperado (opcional)"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<textarea
								bind:value={proposalForm.acknowledgedRisks}
								rows="2"
								maxlength="400"
								placeholder="Riesgos que reconoces (opcional)"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<input
								bind:value={proposalForm.sourceUrl}
								maxlength="300"
								placeholder="Fuente o enlace (opcional)"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							/>
							<p class="text-xs text-ink-400">
								No se publica automáticamente: pasará por moderación antes de aparecer aquí.
							</p>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									disabled={proposalSubmitting || !proposalValid}
									onclick={() => saveProposal(false)}
									class="rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
								>
									{proposalSubmitting ? 'Enviando…' : 'Enviar a moderación'}
								</button>
								<button
									type="button"
									disabled={proposalSubmitting || !proposalValid}
									onclick={() => saveProposal(true)}
									class="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-60"
								>
									<Clock3 class="size-3.5" /> Guardar como borrador
								</button>
								<button
									type="button"
									onclick={() => (showProposalForm = false)}
									class="rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
								>
									Cancelar
								</button>
							</div>
						</form>
					{/if}
				{:else if !authState.session}
					<a
						href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
						class="mt-2.5 inline-block text-sm font-semibold text-brand-700 hover:underline"
					>
						Inicia sesión para proponer un cambio
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
