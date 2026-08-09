<script lang="ts">
	import { page } from '$app/state';
	import {
		LogIn,
		Loader2,
		CheckCircle2,
		ArrowUp,
		ArrowDown,
		X,
		ArrowLeft,
		ArrowRight,
		MapPin,
		PartyPopper
	} from '@lucide/svelte';
	import type {
		ListeningAreaType,
		ListeningEvolution,
		ListeningPersonalRelation,
		ListeningResponse,
		ListeningRound,
		ListeningSeverity,
		HousingSituation
	} from '$lib/types';
	import {
		listeningSeverityLabels,
		listeningEvolutionLabels,
		listeningPersonalRelationLabels,
		listeningAreaTypeLabels,
		housingSituationLabels
	} from '$lib/labels';
	import { VIVIENDA_LISTENING_OPTIONS } from '$lib/data/viviendaListeningOptions';
	import {
		setListeningPriorities,
		setListeningDetail,
		setListeningContext,
		setListeningCompleted,
		type ListeningContextInput
	} from '$lib/services/listeningService';
	import { authState } from '$lib/auth/session.svelte';

	interface Props {
		round?: ListeningRound;
		responses: ListeningResponse[];
		context?: {
			community?: string;
			areaType?: ListeningAreaType;
			housingSituation?: HousingSituation;
		};
		completed: boolean;
	}

	let { round, responses: initialResponses, context, completed }: Props = $props();

	let responses = $state<ListeningResponse[]>(initialResponses);

	const OTHER_CAUSE_CODE = 'otra_causa';
	const UNKNOWN_CAUSE_CODE = 'sin_informacion_causa';

	const SEVERITIES: ListeningSeverity[] = [
		'muy_grave',
		'grave',
		'moderada',
		'poco_grave',
		'sin_info'
	];
	const EVOLUTIONS: ListeningEvolution[] = ['empeorado', 'similar', 'mejorado', 'no_sabe'];
	const RELATIONS: ListeningPersonalRelation[] = [
		'directamente',
		'persona_cercana',
		'profesional',
		'no_afecta',
		'prefiere_no_responder'
	];
	const AREA_TYPES: ListeningAreaType[] = [
		'urbano',
		'intermedio',
		'rural',
		'prefiere_no_responder'
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

	type Step = 'priorities' | 'deepen' | 'context' | 'summary';

	function optionByCode(code: string) {
		return VIVIENDA_LISTENING_OPTIONS.find((o) => o.code === code);
	}

	function responseFor(code: string): ListeningResponse | undefined {
		return responses.find((r) => r.optionCode === code);
	}

	function hasDeepAnswer(code: string): boolean {
		const r = responseFor(code);
		return Boolean(r?.severity);
	}

	let selected = $state<string[]>(
		[...responses]
			.filter((r) => r.rank)
			.sort((a, b) => (a.rank as number) - (b.rank as number))
			.map((r) => r.optionCode)
	);

	function initialStep(): { step: Step; deepenIndex: number } {
		if (completed) return { step: 'summary', deepenIndex: 0 };
		if (selected.length === 0) return { step: 'priorities', deepenIndex: 0 };
		const idx = selected.findIndex((code) => !hasDeepAnswer(code));
		if (idx !== -1) return { step: 'deepen', deepenIndex: idx };
		return { step: 'context', deepenIndex: 0 };
	}

	const initial = initialStep();
	let step = $state<Step>(initial.step);
	let deepenIndex = $state(initial.deepenIndex);
	let returnToSummary = $state(false);

	type SaveState = 'idle' | 'saving' | 'saved' | 'error';
	let prioritiesSaveState = $state<SaveState>('idle');
	let prioritiesSaveError = $state<string | null>(null);

	function toggleSelected(code: string) {
		if (selected.includes(code)) {
			selected = selected.filter((c) => c !== code);
		} else if (selected.length < 3) {
			selected = [...selected, code];
		}
	}

	function moveUp(index: number) {
		if (index <= 0) return;
		const next = [...selected];
		[next[index - 1], next[index]] = [next[index], next[index - 1]];
		selected = next;
	}

	function moveDown(index: number) {
		if (index >= selected.length - 1) return;
		const next = [...selected];
		[next[index], next[index + 1]] = [next[index + 1], next[index]];
		selected = next;
	}

	async function confirmPriorities() {
		if (!round || selected.length === 0) return;
		prioritiesSaveState = 'saving';
		prioritiesSaveError = null;
		try {
			await setListeningPriorities(round.id, selected);
			responses = responses.map((r) =>
				selected.includes(r.optionCode) ? r : { ...r, rank: undefined }
			);
			for (const code of selected) {
				if (!responseFor(code)) {
					responses = [
						...responses,
						{
							id: crypto.randomUUID(),
							roundId: round.id,
							userId: '',
							optionCode: code,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
						}
					];
				}
			}
			prioritiesSaveState = 'saved';
			deepenIndex = 0;
			step = 'deepen';
		} catch (err) {
			prioritiesSaveState = 'error';
			prioritiesSaveError =
				err instanceof Error ? err.message : 'No se ha podido guardar tu selección.';
		}
	}

	let deepenSeverity = $state<ListeningSeverity | undefined>(undefined);
	let deepenEvolution = $state<ListeningEvolution | undefined>(undefined);
	let deepenRelation = $state<ListeningPersonalRelation | undefined>(undefined);
	let deepenCause = $state<string | undefined>(undefined);
	let deepenCauseOther = $state('');
	let deepenComment = $state('');
	let deepenSaveState = $state<SaveState>('idle');
	let deepenSaveError = $state<string | null>(null);
	let deepenDirty = $state(false);
	let savedCommentSnapshot = '';

	function loadDeepenForm(code: string) {
		const r = responseFor(code);
		deepenSeverity = r?.severity;
		deepenEvolution = r?.evolution;
		deepenRelation = r?.personalRelation;
		deepenCause = r?.causeCode;
		deepenCauseOther = r?.causeOther ?? '';
		deepenComment = r?.comment ?? '';
		savedCommentSnapshot = deepenComment;
		deepenSaveState = 'idle';
		deepenSaveError = null;
		deepenDirty = false;
	}

	$effect(() => {
		if (step === 'deepen' && selected[deepenIndex]) {
			loadDeepenForm(selected[deepenIndex]);
		}
	});

	function markDirty() {
		deepenDirty = deepenComment !== savedCommentSnapshot;
	}

	async function saveDeepenAndContinue() {
		if (!round) return;
		const code = selected[deepenIndex];
		if (!code || !deepenSeverity) return;
		deepenSaveState = 'saving';
		deepenSaveError = null;
		try {
			await setListeningDetail(round.id, code, {
				severity: deepenSeverity,
				evolution: deepenEvolution,
				personalRelation: deepenRelation,
				causeCode: deepenCause,
				causeOther: deepenCause === OTHER_CAUSE_CODE ? deepenCauseOther || undefined : undefined,
				comment: deepenComment || undefined
			});
			responses = responses.map((r) =>
				r.optionCode === code
					? {
							...r,
							severity: deepenSeverity,
							evolution: deepenEvolution,
							personalRelation: deepenRelation,
							causeCode: deepenCause,
							causeOther:
								deepenCause === OTHER_CAUSE_CODE ? deepenCauseOther || undefined : undefined,
							comment: deepenComment || undefined
						}
					: r
			);
			savedCommentSnapshot = deepenComment;
			deepenDirty = false;
			deepenSaveState = 'saved';
			if (returnToSummary) {
				returnToSummary = false;
				step = 'summary';
			} else if (deepenIndex < selected.length - 1) {
				deepenIndex += 1;
			} else {
				step = 'context';
			}
		} catch (err) {
			deepenSaveState = 'error';
			deepenSaveError =
				err instanceof Error ? err.message : 'No se ha podido guardar tu respuesta.';
		}
	}

	function goBackFromDeepen() {
		if (
			deepenDirty &&
			!confirm('Tienes texto sin guardar en el comentario. ¿Salir sin guardarlo?')
		) {
			return;
		}
		if (returnToSummary) {
			returnToSummary = false;
			step = 'summary';
		} else if (deepenIndex > 0) {
			deepenIndex -= 1;
		} else {
			step = 'priorities';
		}
	}

	let community = $state(context?.community ?? '');
	let areaType = $state<ListeningAreaType | ''>(context?.areaType ?? '');
	let housingSituation = $state<HousingSituation | ''>(context?.housingSituation ?? '');
	let contextSaveState = $state<SaveState>('idle');

	async function saveContextAndContinue() {
		if (!round) {
			step = 'summary';
			return;
		}
		contextSaveState = 'saving';
		try {
			const input: ListeningContextInput = {
				community: community || undefined,
				areaType: areaType || undefined,
				housingSituation: housingSituation || undefined
			};
			if (community || areaType || housingSituation) {
				await setListeningContext(round.id, input);
			}
			contextSaveState = 'saved';
			step = 'summary';
		} catch {
			contextSaveState = 'error';
		}
	}

	function skipContext() {
		step = 'summary';
	}

	let finishSaveState = $state<SaveState>('idle');
	let finished = $state(completed);

	async function finish() {
		if (!round) return;
		finishSaveState = 'saving';
		try {
			await setListeningCompleted(round.id);
			finishSaveState = 'saved';
			finished = true;
		} catch {
			finishSaveState = 'error';
		}
	}

	function editSection(target: Step, index = 0) {
		returnToSummary = target === 'deepen';
		step = target;
		deepenIndex = index;
	}

	function causeLabel(code: string, optionCode: string): string {
		if (code === OTHER_CAUSE_CODE) return 'Otra causa';
		if (code === UNKNOWN_CAUSE_CODE) return 'No tengo información suficiente';
		return optionByCode(optionCode)?.causes.find((c) => c.code === code)?.label ?? code;
	}
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h2 class="font-display text-base font-semibold text-ink-900">Tu participación</h2>

	{#if !authState.session}
		<p class="mt-2 text-sm text-ink-600">
			Puedes leer esta escucha sin registrarte. Inicia sesión únicamente si quieres participar.
		</p>
		<a
			href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
			class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
		>
			<LogIn class="size-3.5" /> Iniciar sesión o crear cuenta
		</a>
	{:else if !round || round.status !== 'open'}
		<p class="mt-2 text-sm text-ink-500">Esta escucha no está abierta todavía.</p>
	{:else}
		<!-- Progreso -->
		<ol class="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label="Progreso de tu participación">
			{#each [{ id: 'priorities', label: '1. Prioriza' }, { id: 'deepen', label: '2. Profundiza' }, { id: 'context', label: '3. Contexto' }, { id: 'summary', label: '4. Resumen' }] as s, i (s.id)}
				<li
					class="flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium {step === s.id
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-400'}"
				>
					{i + 1}. {s.label.replace(/^\d+\.\s*/, '')}
				</li>
			{/each}
		</ol>

		{#if step === 'priorities'}
			<div class="mt-4">
				<p class="text-sm font-semibold text-ink-900">
					¿Cuáles son los tres problemas de vivienda que más te preocupan?
				</p>
				<p class="mt-0.5 text-xs text-ink-400">
					Elige entre uno y tres. Puedes cambiar el orden con las flechas.
				</p>

				{#if selected.length > 0}
					<ul class="mt-3 flex flex-col gap-1.5">
						{#each selected as code, i (code)}
							<li
								class="flex items-center gap-2 rounded-xl border border-brand-600 bg-brand-50 px-3 py-2"
							>
								<span
									class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
									>{i + 1}</span
								>
								<span class="min-w-0 flex-1 truncate text-sm font-medium text-ink-900"
									>{optionByCode(code)?.label}</span
								>
								<button
									type="button"
									onclick={() => moveUp(i)}
									disabled={i === 0}
									aria-label={`Subir ${optionByCode(code)?.label} en la prioridad`}
									class="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30"
								>
									<ArrowUp class="size-4" />
								</button>
								<button
									type="button"
									onclick={() => moveDown(i)}
									disabled={i === selected.length - 1}
									aria-label={`Bajar ${optionByCode(code)?.label} en la prioridad`}
									class="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30"
								>
									<ArrowDown class="size-4" />
								</button>
								<button
									type="button"
									onclick={() => toggleSelected(code)}
									aria-label={`Quitar ${optionByCode(code)?.label} de tus prioridades`}
									class="rounded-lg p-1.5 text-ink-500 hover:bg-white"
								>
									<X class="size-4" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				<p class="mt-3 text-xs font-semibold text-ink-700">Resto de problemas</p>
				{#if selected.length >= 3}
					<p class="mt-1 text-xs text-ink-500">
						Ya has elegido tres. Quita alguno de la lista de arriba para cambiar tu selección.
					</p>
				{/if}
				<ul class="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					{#each VIVIENDA_LISTENING_OPTIONS.filter((o) => !selected.includes(o.code)) as option (option.code)}
						<li>
							<button
								type="button"
								onclick={() => toggleSelected(option.code)}
								disabled={selected.length >= 3}
								class="w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-sm text-ink-700 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{option.label}
							</button>
						</li>
					{/each}
				</ul>

				<button
					type="button"
					onclick={confirmPriorities}
					disabled={selected.length === 0 || prioritiesSaveState === 'saving'}
					class="mt-4 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
				>
					{#if prioritiesSaveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
					Guardar y continuar <ArrowRight class="size-3.5" />
				</button>
				{#if prioritiesSaveState === 'error'}
					<p class="text-critical-600 mt-1.5 text-xs" role="alert">
						{prioritiesSaveError ?? 'Error al guardar.'}
					</p>
				{/if}
			</div>
		{:else if step === 'deepen' && selected[deepenIndex]}
			{@const code = selected[deepenIndex]}
			{@const option = optionByCode(code)}
			<div class="mt-4">
				<p class="text-xs font-medium text-brand-700">
					Preocupación {deepenIndex + 1} de {selected.length}
				</p>
				<p class="mt-0.5 text-sm font-semibold text-ink-900">{option?.label}</p>

				<p class="mt-3 text-xs font-semibold text-ink-700">Gravedad percibida</p>
				<div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each SEVERITIES as s (s)}
						<button
							type="button"
							onclick={() => {
								deepenSeverity = s;
							}}
							aria-pressed={deepenSeverity === s}
							class="rounded-xl border px-2 py-2 text-left text-sm font-medium {deepenSeverity === s
								? 'border-brand-600 bg-brand-50 text-brand-800'
								: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
						>
							{listeningSeverityLabels[s]}
						</button>
					{/each}
				</div>

				<p class="mt-3 text-xs font-semibold text-ink-700">Evolución</p>
				<div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each EVOLUTIONS as ev (ev)}
						<button
							type="button"
							onclick={() => {
								deepenEvolution = ev;
							}}
							aria-pressed={deepenEvolution === ev}
							class="rounded-xl border px-2 py-2 text-left text-sm font-medium {deepenEvolution ===
							ev
								? 'border-brand-600 bg-brand-50 text-brand-800'
								: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
						>
							{listeningEvolutionLabels[ev]}
						</button>
					{/each}
				</div>

				<p class="mt-3 text-xs font-semibold text-ink-700">Relación personal</p>
				<div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each RELATIONS as rel (rel)}
						<button
							type="button"
							onclick={() => {
								deepenRelation = rel;
							}}
							aria-pressed={deepenRelation === rel}
							class="rounded-xl border px-2 py-2 text-left text-sm font-medium {deepenRelation ===
							rel
								? 'border-brand-600 bg-brand-50 text-brand-800'
								: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
						>
							{listeningPersonalRelationLabels[rel]}
						</button>
					{/each}
				</div>

				<label for="deepen-cause" class="mt-3 block text-xs font-semibold text-ink-700"
					>Causa principal percibida</label
				>
				<select
					id="deepen-cause"
					bind:value={deepenCause}
					class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				>
					<option value={undefined}>Sin indicar</option>
					{#each option?.causes ?? [] as cause (cause.code)}
						<option value={cause.code}>{cause.label}</option>
					{/each}
					<option value={OTHER_CAUSE_CODE}>Otra causa</option>
					<option value={UNKNOWN_CAUSE_CODE}>No tengo información suficiente</option>
				</select>
				{#if deepenCause === OTHER_CAUSE_CODE}
					<input
						bind:value={deepenCauseOther}
						maxlength="200"
						placeholder="Describe brevemente la causa (opcional)"
						class="mt-2 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				{/if}

				<label for="deepen-comment" class="mt-3 block text-xs font-semibold text-ink-700">
					¿Quieres explicar brevemente tu experiencia o tu respuesta? (opcional)
				</label>
				<textarea
					id="deepen-comment"
					bind:value={deepenComment}
					oninput={markDirty}
					rows="3"
					maxlength="500"
					placeholder="Máximo 500 caracteres…"
					class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				></textarea>
				<p class="mt-1 text-right text-xs text-ink-400">{deepenComment.length}/500</p>
				<p class="text-xs text-ink-400">
					No incluyas datos identificativos, médicos o financieros tuyos ni de terceros. Este
					comentario es privado y nunca se publica automáticamente.
				</p>

				<div class="mt-4 flex items-center gap-2">
					<button
						type="button"
						onclick={goBackFromDeepen}
						class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
					>
						<ArrowLeft class="size-3.5" /> Atrás
					</button>
					<button
						type="button"
						onclick={saveDeepenAndContinue}
						disabled={!deepenSeverity || deepenSaveState === 'saving'}
						class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
					>
						{#if deepenSaveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
						{returnToSummary
							? 'Guardar y volver al resumen'
							: deepenIndex < selected.length - 1
								? 'Guardar y continuar'
								: 'Guardar y seguir'}
						<ArrowRight class="size-3.5" />
					</button>
				</div>
				{#if !deepenSeverity}
					<p class="mt-1.5 text-xs text-ink-400">
						Indica al menos la gravedad percibida para continuar.
					</p>
				{/if}
				{#if deepenSaveState === 'error'}
					<p class="text-critical-600 mt-1.5 text-xs" role="alert">
						{deepenSaveError ?? 'Error al guardar.'}
					</p>
				{/if}
			</div>
		{:else if step === 'context'}
			<div class="mt-4">
				<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
					<MapPin class="size-4 text-brand-700" /> Contexto voluntario
				</p>
				<p class="mt-0.5 text-xs text-ink-400">
					Totalmente opcional. Puedes omitir este paso sin problema.
				</p>

				<label for="context-community" class="mt-3 block text-xs font-semibold text-ink-700"
					>Comunidad o ciudad autónoma</label
				>
				<input
					id="context-community"
					bind:value={community}
					maxlength="120"
					placeholder="Opcional"
					class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<p class="mt-1 text-xs text-ink-400">
					No incluyas datos personales tuyos o de terceros que no sean necesarios.
				</p>

				<p class="mt-3 text-xs font-semibold text-ink-700">Tipo de entorno</p>
				<div class="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each AREA_TYPES as a (a)}
						<button
							type="button"
							onclick={() => {
								areaType = a;
							}}
							aria-pressed={areaType === a}
							class="rounded-xl border px-2 py-2 text-sm font-medium {areaType === a
								? 'border-brand-600 bg-brand-50 text-brand-800'
								: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
						>
							{listeningAreaTypeLabels[a]}
						</button>
					{/each}
				</div>

				<label for="context-housing" class="mt-3 block text-xs font-semibold text-ink-700"
					>Situación general relacionada con la vivienda</label
				>
				<select
					id="context-housing"
					bind:value={housingSituation}
					class="mt-1.5 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				>
					<option value="">Prefiero no indicar</option>
					{#each HOUSING_SITUATIONS as situation (situation)}
						<option value={situation}>{housingSituationLabels[situation]}</option>
					{/each}
				</select>

				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onclick={() => (step = 'deepen')}
						class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
					>
						<ArrowLeft class="size-3.5" /> Atrás
					</button>
					<button
						type="button"
						onclick={skipContext}
						class="rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
					>
						Omitir
					</button>
					<button
						type="button"
						onclick={saveContextAndContinue}
						disabled={contextSaveState === 'saving'}
						class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
					>
						{#if contextSaveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
						Guardar y continuar <ArrowRight class="size-3.5" />
					</button>
				</div>
				{#if contextSaveState === 'error'}
					<p class="text-critical-600 mt-1.5 text-xs" role="alert">
						No se ha podido guardar tu contexto.
					</p>
				{/if}
			</div>
		{:else if step === 'summary'}
			<div class="mt-4">
				{#if finished}
					<div
						class="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
					>
						<PartyPopper class="size-4 text-brand-700" />
						<p class="text-sm font-medium text-brand-800">
							Tu participación está guardada. Puedes volver y modificarla mientras esta escucha siga
							abierta.
						</p>
					</div>
				{:else}
					<p class="text-sm text-ink-700">
						Revisa tu resumen. Solo tú puedes ver estas respuestas.
					</p>
				{/if}

				<div class="mt-3 flex items-center justify-between">
					<p class="text-xs font-semibold text-ink-700">Tus prioridades</p>
					<button
						type="button"
						onclick={() => editSection('priorities')}
						class="text-xs font-semibold text-brand-700 hover:underline">Modificar</button
					>
				</div>
				<ul class="mt-1.5 flex flex-col gap-1.5">
					{#each selected as code, i (code)}
						{@const r = responseFor(code)}
						{@const option = optionByCode(code)}
						<li class="rounded-xl border border-ink-100 px-3 py-2.5">
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-medium text-ink-900">{i + 1}. {option?.label}</span>
								<button
									type="button"
									onclick={() => editSection('deepen', i)}
									class="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
									>Editar</button
								>
							</div>
							{#if r?.severity}
								<dl
									class="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-ink-600 sm:grid-cols-2"
								>
									<div>
										<dt class="inline text-ink-400">Gravedad:</dt>
										<dd class="inline">{listeningSeverityLabels[r.severity]}</dd>
									</div>
									{#if r.evolution}<div>
											<dt class="inline text-ink-400">Evolución:</dt>
											<dd class="inline">{listeningEvolutionLabels[r.evolution]}</dd>
										</div>{/if}
									{#if r.personalRelation}<div>
											<dt class="inline text-ink-400">Relación:</dt>
											<dd class="inline">{listeningPersonalRelationLabels[r.personalRelation]}</dd>
										</div>{/if}
									{#if r.causeCode}<div>
											<dt class="inline text-ink-400">Causa:</dt>
											<dd class="inline">
												{causeLabel(r.causeCode, code)}{r.causeCode === OTHER_CAUSE_CODE &&
												r.causeOther
													? ` — ${r.causeOther}`
													: ''}
											</dd>
										</div>{/if}
								</dl>
								{#if r.comment}
									<p class="mt-1 text-xs text-ink-500">"{r.comment}"</p>
								{/if}
							{:else}
								<p class="mt-1 text-xs text-ink-400">Sin profundizar todavía.</p>
							{/if}
						</li>
					{/each}
				</ul>

				<div class="mt-3 flex items-center justify-between">
					<p class="text-xs font-semibold text-ink-700">Contexto voluntario</p>
					<button
						type="button"
						onclick={() => editSection('context')}
						class="text-xs font-semibold text-brand-700 hover:underline">Modificar</button
					>
				</div>
				<p class="mt-1 text-xs text-ink-500">
					{#if community || areaType || housingSituation}
						{[
							community,
							areaType ? listeningAreaTypeLabels[areaType] : '',
							housingSituation ? housingSituationLabels[housingSituation] : ''
						]
							.filter(Boolean)
							.join(' · ')}
					{:else}
						No indicado.
					{/if}
				</p>

				{#if !finished}
					<button
						type="button"
						onclick={finish}
						disabled={finishSaveState === 'saving'}
						class="mt-4 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
					>
						{#if finishSaveState === 'saving'}<Loader2
								class="size-3.5 animate-spin"
							/>{:else}<CheckCircle2 class="size-3.5" />{/if}
						Finalizar participación
					</button>
					{#if finishSaveState === 'error'}
						<p class="text-critical-600 mt-1.5 text-xs" role="alert">
							No se ha podido guardar tu confirmación.
						</p>
					{/if}
				{/if}
			</div>
		{/if}
	{/if}
</div>
