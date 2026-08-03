<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
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
		ShieldAlert,
		Clock,
		Sparkles
	} from '@lucide/svelte';
	import type {
		ListeningRound,
		ListeningSurveyAreaType,
		ListeningSurveyResponse,
		TopicCommitment,
		TopicMeasure
	} from '$lib/types';
	import { listeningSurveyAreaTypeLabels } from '$lib/labels';
	import {
		SANIDAD_LISTENING_CAUSES,
		SANIDAD_LISTENING_PROBLEMS
	} from '$lib/data/sanidadListeningOptions';
	import { autonomousCommunities } from '$lib/data/regions';
	import {
		setListeningSurveyResponse,
		type ListeningSurveyInput
	} from '$lib/services/listeningSurveyService';
	import { authState } from '$lib/auth/session.svelte';
	import SanidadListeningResults from './SanidadListeningResults.svelte';

	interface Props {
		round?: ListeningRound;
		measures: TopicMeasure[];
		commitments: TopicCommitment[];
		initialResponse?: ListeningSurveyResponse;
	}

	let { round, measures, commitments, initialResponse }: Props = $props();

	const DRAFT_KEY = 'convoca:escucha-sanidad:draft:v1';
	const AREA_TYPES: ListeningSurveyAreaType[] = [
		'rural',
		'ciudad_mediana',
		'gran_area_urbana',
		'prefiere_no_responder'
	];

	interface FormState {
		problems: string[];
		otherProblemText: string;
		mainCause: string | undefined;
		prioritizedMeasureIds: string[];
		commitmentMostUrgentId: string | undefined;
		commitmentMostDifficultId: string | undefined;
		missingImprovement: string;
		community: string;
		areaType: ListeningSurveyAreaType | '';
	}

	function emptyFormState(): FormState {
		return {
			problems: [],
			otherProblemText: '',
			mainCause: undefined,
			prioritizedMeasureIds: [],
			commitmentMostUrgentId: undefined,
			commitmentMostDifficultId: undefined,
			missingImprovement: '',
			community: '',
			areaType: ''
		};
	}

	function responseToFormState(r: ListeningSurveyResponse): FormState {
		return {
			problems: [...r.problems],
			otherProblemText: r.otherProblemText ?? '',
			mainCause: r.mainCause,
			prioritizedMeasureIds: [...r.prioritizedMeasureIds],
			commitmentMostUrgentId: r.commitmentMostUrgentId,
			commitmentMostDifficultId: r.commitmentMostDifficultId,
			missingImprovement: r.missingImprovement ?? '',
			community: r.community ?? '',
			areaType: r.areaType ?? ''
		};
	}

	// step: 0 = portada, 1-6 = pasos, 7 = confirmación
	let step = $state(0);
	let form = $state<FormState>(emptyFormState());
	let hydrated = $state(false);
	let finished = $state(false);
	let pendingAutoSubmit = $state(false);

	type SaveState = 'idle' | 'saving' | 'saved' | 'error';
	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);
	let showResults = $state(false);

	function loadDraft(): { form: FormState; step: number; pendingAutoSubmit: boolean } | null {
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function saveDraft() {
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, pendingAutoSubmit }));
		} catch {
			// localStorage puede no estar disponible (modo privado estricto);
			// degradamos sin romper el flujo, solo se pierde la persistencia local.
		}
	}

	function clearDraft() {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {
			// ver saveDraft: degradación silenciosa.
		}
	}

	onMount(() => {
		hydrated = true;
		const draft = loadDraft();
		if (draft) {
			form = draft.form;
			step = draft.step;
			pendingAutoSubmit = draft.pendingAutoSubmit;
		} else if (initialResponse) {
			form = responseToFormState(initialResponse);
			finished = true;
			step = 7;
		}
	});

	// Persistencia local continua: sobrevive a recargas y al ir y volver de
	// iniciar sesión. No sustituye el guardado real en el servidor, que solo
	// ocurre al enviar (autenticado).
	$effect(() => {
		if (hydrated && !finished) saveDraft();
	});

	// Si hay un envío pendiente de sesión y la sesión ya está disponible,
	// completa el envío automáticamente sin que la persona pierda su lugar.
	$effect(() => {
		if (hydrated && pendingAutoSubmit && authState.session) {
			pendingAutoSubmit = false;
			submitFinal();
		}
	});

	const PROBLEMS_MAX = 3;
	function toggleProblem(code: string) {
		if (form.problems.includes(code)) {
			form.problems = form.problems.filter((c) => c !== code);
		} else if (form.problems.length < PROBLEMS_MAX) {
			form.problems = [...form.problems, code];
		}
	}

	const MEASURES_MAX = 3;
	function toggleMeasure(id: string) {
		if (form.prioritizedMeasureIds.includes(id)) {
			form.prioritizedMeasureIds = form.prioritizedMeasureIds.filter((m) => m !== id);
		} else if (form.prioritizedMeasureIds.length < MEASURES_MAX) {
			form.prioritizedMeasureIds = [...form.prioritizedMeasureIds, id];
		}
	}
	function moveMeasure(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= form.prioritizedMeasureIds.length) return;
		const next = [...form.prioritizedMeasureIds];
		[next[index], next[target]] = [next[target], next[index]];
		form.prioritizedMeasureIds = next;
	}

	function measureTitle(id: string): string {
		return measures.find((m) => m.id === id)?.title ?? 'Medida';
	}

	const canContinue = $derived.by(() => {
		if (step === 1) return form.problems.length > 0;
		if (step === 2) return Boolean(form.mainCause);
		if (step === 3) return form.prioritizedMeasureIds.length > 0;
		if (step === 4)
			return Boolean(form.commitmentMostUrgentId) && Boolean(form.commitmentMostDifficultId);
		return true;
	});

	function nextStep() {
		if (step === 6) {
			finish();
		} else {
			step += 1;
		}
	}
	function prevStep() {
		if (step > 0) step -= 1;
	}

	function toInput(): ListeningSurveyInput {
		return {
			problems: form.problems,
			otherProblemText: form.problems.includes('otro')
				? form.otherProblemText || undefined
				: undefined,
			mainCause: form.mainCause,
			prioritizedMeasureIds: form.prioritizedMeasureIds,
			commitmentMostUrgentId: form.commitmentMostUrgentId,
			commitmentMostDifficultId: form.commitmentMostDifficultId,
			missingImprovement: form.missingImprovement || undefined,
			community: form.community || undefined,
			areaType: form.areaType || undefined
		};
	}

	async function finish() {
		if (!round) return;
		if (!authState.session) {
			pendingAutoSubmit = true;
			saveDraft();
			goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		await submitFinal();
	}

	async function submitFinal() {
		if (!round) return;
		saveState = 'saving';
		saveError = null;
		try {
			await setListeningSurveyResponse(round.id, toInput());
			saveState = 'saved';
			finished = true;
			step = 7;
			clearDraft();
		} catch (err) {
			saveState = 'error';
			saveError = err instanceof Error ? err.message : 'No se ha podido guardar tu respuesta.';
		}
	}

	function editResponse() {
		finished = false;
		step = 1;
		showResults = false;
	}

	const STEP_LABELS = ['Dónde falla', 'Causa', 'Medidas', 'Compromisos', 'Qué falta', 'Territorio'];
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
	{#if !round || round.status !== 'open'}
		<p class="text-sm text-ink-500">Esta escucha no está abierta todavía.</p>
	{:else if finished}
		<div
			class="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
		>
			<CheckCircle2 class="size-4 shrink-0 text-brand-700" />
			<p class="text-sm font-medium text-brand-800">Tu respuesta ya forma parte de la escucha</p>
		</div>
		<ul class="mt-3 flex flex-col gap-1 text-xs text-ink-500">
			<li>· Puedes modificarla mientras la escucha continúe abierta.</li>
			<li>· No representa una votación oficial.</li>
			<li>
				· Se combinará con el resto para detectar prioridades, desacuerdos y propuestas de mejora.
			</li>
		</ul>

		<div class="mt-4 rounded-xl border border-ink-100 p-3">
			<p class="text-xs font-semibold text-ink-700">Tu resumen privado</p>
			<dl class="mt-2 flex flex-col gap-1.5 text-xs text-ink-600">
				{#if form.problems.length > 0}
					<div>
						<dt class="inline text-ink-400">Dónde falla más:</dt>
						<dd class="inline">
							{form.problems
								.map((c) =>
									c === 'otro'
										? form.otherProblemText || 'Otro problema'
										: (SANIDAD_LISTENING_PROBLEMS.find((p) => p.code === c)?.label ?? c)
								)
								.join(' · ')}
						</dd>
					</div>
				{/if}
				{#if form.mainCause}
					<div>
						<dt class="inline text-ink-400">Causa principal:</dt>
						<dd class="inline">
							{SANIDAD_LISTENING_CAUSES.find((c) => c.code === form.mainCause)?.label}
						</dd>
					</div>
				{/if}
				{#if form.prioritizedMeasureIds.length > 0}
					<div>
						<dt class="inline text-ink-400">Medidas priorizadas:</dt>
						<dd class="inline">
							{form.prioritizedMeasureIds
								.map((id, i) => `${i + 1}. ${measureTitle(id)}`)
								.join(' · ')}
						</dd>
					</div>
				{/if}
				{#if form.commitmentMostUrgentId}
					<div>
						<dt class="inline text-ink-400">Compromiso más urgente:</dt>
						<dd class="inline">
							{commitments.find((c) => c.id === form.commitmentMostUrgentId)?.title}
						</dd>
					</div>
				{/if}
				{#if form.commitmentMostDifficultId}
					<div>
						<dt class="inline text-ink-400">Compromiso más difícil:</dt>
						<dd class="inline">
							{commitments.find((c) => c.id === form.commitmentMostDifficultId)?.title}
						</dd>
					</div>
				{/if}
			</dl>
		</div>

		<div class="mt-4 flex flex-wrap gap-2">
			<button
				type="button"
				onclick={editResponse}
				class="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Modificar mi respuesta
			</button>
			<a
				href="/pulso/soluciones/plan-sanidad-2036"
				class="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
			>
				Volver al Plan Sanidad 2036
			</a>
			<button
				type="button"
				onclick={() => (showResults = !showResults)}
				class="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
			>
				{showResults ? 'Ocultar resultados' : 'Ver cómo se analizarán los resultados'}
			</button>
		</div>

		{#if showResults}
			<div class="mt-4">
				<SanidadListeningResults {round} {measures} {commitments} />
			</div>
		{/if}
	{:else if step === 0}
		<div class="flex items-center gap-2">
			<Sparkles class="size-5 text-brand-700" />
			<h2 class="font-display text-lg font-semibold text-ink-900">Antes de empezar</h2>
		</div>
		<p class="mt-2 text-sm leading-relaxed text-ink-700">
			La sanidad no se mejora solo desde los despachos. Queremos conocer qué está fallando, qué
			debería cambiar primero y qué soluciones todavía no aparecen en el Plan Sanidad 2036.
		</p>
		<ul class="mt-3 flex flex-col gap-1.5 text-xs text-ink-500">
			<li class="flex items-start gap-1.5">
				<Clock class="mt-0.5 size-3.5 shrink-0" /> Participar lleva aproximadamente 4 minutos.
			</li>
			<li>· No es una encuesta representativa de toda España.</li>
			<li>· No es una votación oficial.</li>
			<li>· Las respuestas ayudarán a revisar y mejorar la propuesta de Convoca.</li>
			<li>
				· No incluyas nombres, diagnósticos, historiales, informes, centros concretos ni información
				que permita identificar a pacientes o profesionales.
			</li>
			<li>· Las respuestas abiertas no se publicarán individualmente.</li>
			<li>· Los resultados públicos serán siempre agregados.</li>
		</ul>
		<button
			type="button"
			onclick={() => (step = 1)}
			class="mt-4 flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
		>
			Empezar la escucha <ArrowRight class="size-4" />
		</button>
	{:else}
		<!-- El recorrido es libre sin sesión; solo se pide iniciar sesión al llegar al final. -->
		{@render stepContent()}
	{/if}
</div>

{#snippet stepContent()}
	<!-- Progreso -->
	<ol class="flex flex-wrap gap-1.5 text-xs" aria-label="Progreso de la escucha">
		{#each STEP_LABELS as label, i (label)}
			<li
				class="rounded-full border px-2.5 py-1 font-medium {step === i + 1
					? 'border-brand-600 bg-brand-50 text-brand-800'
					: i + 1 < step
						? 'border-ink-200 bg-ink-50 text-ink-500'
						: 'border-dashed border-ink-200 text-ink-400'}"
			>
				{i + 1}. {label}
			</li>
		{/each}
	</ol>

	{#if step === 1}
		<p class="mt-3 text-sm font-semibold text-ink-900">
			¿Dónde crees que está fallando más la sanidad pública?
		</p>
		<p class="mt-0.5 text-xs text-ink-400">Elige hasta tres.</p>
		<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each SANIDAD_LISTENING_PROBLEMS as option (option.code)}
				{@const selected = form.problems.includes(option.code)}
				<button
					type="button"
					onclick={() => toggleProblem(option.code)}
					disabled={!selected && form.problems.length >= PROBLEMS_MAX}
					aria-pressed={selected}
					class="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 {selected
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{#if selected}<CheckCircle2 class="mt-0.5 size-3.5 shrink-0 text-brand-600" />{/if}
					{option.label}
				</button>
			{/each}
		</div>
		{#if form.problems.includes('otro')}
			<div class="mt-3">
				<label for="other-problem" class="text-xs font-semibold text-ink-700"
					>Cuéntanoslo brevemente</label
				>
				<input
					id="other-problem"
					bind:value={form.otherProblemText}
					maxlength="150"
					placeholder="Máximo 150 caracteres…"
					class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<p class="mt-1 text-xs text-ink-400">
					No incluyas datos personales o médicos. {form.otherProblemText.length}/150
				</p>
			</div>
		{/if}
	{:else if step === 2}
		<p class="mt-3 text-sm font-semibold text-ink-900">
			¿Cuál crees que es la causa principal de esos problemas?
		</p>
		<p class="mt-0.5 text-xs text-ink-400">
			Elige una opción. No hace falta conocimiento técnico para responder.
		</p>
		<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each SANIDAD_LISTENING_CAUSES as option (option.code)}
				<button
					type="button"
					onclick={() => (form.mainCause = option.code)}
					aria-pressed={form.mainCause === option.code}
					class="rounded-xl border px-3 py-2.5 text-left text-sm font-medium {form.mainCause ===
					option.code
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{:else if step === 3}
		<p class="mt-3 text-sm font-semibold text-ink-900">
			Si el Plan Sanidad 2036 tuviera que empezar por tres medidas, ¿cuáles elegirías?
		</p>
		<p class="mt-0.5 text-xs text-ink-400">Elige hasta tres. Puedes cambiar el orden.</p>

		{#if form.prioritizedMeasureIds.length > 0}
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each form.prioritizedMeasureIds as id, i (id)}
					<li
						class="flex items-center gap-2 rounded-xl border border-brand-600 bg-brand-50 px-3 py-2"
					>
						<span
							class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
							>{i + 1}</span
						>
						<span class="min-w-0 flex-1 truncate text-sm font-medium text-ink-900"
							>{measureTitle(id)}</span
						>
						<button
							type="button"
							onclick={() => moveMeasure(i, -1)}
							disabled={i === 0}
							aria-label={`Subir ${measureTitle(id)} en la prioridad`}
							class="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30"
						>
							<ArrowUp class="size-4" />
						</button>
						<button
							type="button"
							onclick={() => moveMeasure(i, 1)}
							disabled={i === form.prioritizedMeasureIds.length - 1}
							aria-label={`Bajar ${measureTitle(id)} en la prioridad`}
							class="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30"
						>
							<ArrowDown class="size-4" />
						</button>
						<button
							type="button"
							onclick={() => toggleMeasure(id)}
							aria-label={`Quitar ${measureTitle(id)} de tus prioridades`}
							class="rounded-lg p-1.5 text-ink-500 hover:bg-white"
						>
							<X class="size-4" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<p class="mt-3 text-xs font-semibold text-ink-700">Resto de medidas</p>
		<ul class="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
			{#each measures.filter((m) => !form.prioritizedMeasureIds.includes(m.id)) as measure (measure.id)}
				<li>
					<button
						type="button"
						onclick={() => toggleMeasure(measure.id)}
						disabled={form.prioritizedMeasureIds.length >= MEASURES_MAX}
						class="w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-sm text-ink-700 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{measure.title}
					</button>
				</li>
			{/each}
		</ul>
	{:else if step === 4}
		<p class="mt-3 text-sm font-semibold text-ink-900">¿Qué compromiso debería cumplirse antes?</p>
		<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each commitments as commitment (commitment.id)}
				<button
					type="button"
					onclick={() => (form.commitmentMostUrgentId = commitment.id)}
					aria-pressed={form.commitmentMostUrgentId === commitment.id}
					class="rounded-xl border px-3 py-2.5 text-left text-sm font-medium {form.commitmentMostUrgentId ===
					commitment.id
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{commitment.title}
				</button>
			{/each}
		</div>

		<p class="mt-4 text-sm font-semibold text-ink-900">
			¿Cuál crees que será más difícil de cumplir?
		</p>
		<p class="mt-0.5 text-xs text-ink-400">Puede coincidir con el anterior.</p>
		<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each commitments as commitment (commitment.id)}
				<button
					type="button"
					onclick={() => (form.commitmentMostDifficultId = commitment.id)}
					aria-pressed={form.commitmentMostDifficultId === commitment.id}
					class="rounded-xl border px-3 py-2.5 text-left text-sm font-medium {form.commitmentMostDifficultId ===
					commitment.id
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{commitment.title}
				</button>
			{/each}
		</div>
	{:else if step === 5}
		<p class="mt-3 text-sm font-semibold text-ink-900">
			¿Qué cambio importante crees que todavía falta en el Plan Sanidad 2036?
		</p>
		<p class="mt-0.5 text-xs text-ink-500">
			Propón una mejora concreta sobre el funcionamiento del sistema. No incluyas diagnósticos,
			tratamientos, historiales, nombres ni información que permita identificar a una persona.
		</p>
		<textarea
			bind:value={form.missingImprovement}
			rows="5"
			maxlength="1000"
			placeholder="Opcional, máximo 1.000 caracteres…"
			class="mt-2 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
		></textarea>
		<p class="mt-1 text-right text-xs text-ink-400">{form.missingImprovement.length}/1000</p>
		<div class="mt-1 flex items-start gap-1.5 text-xs text-ink-400">
			<ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
			Este texto es privado y no se publica automáticamente ni se usa como testimonio público.
		</div>
	{:else if step === 6}
		<p class="mt-3 text-sm font-semibold text-ink-900">Contexto territorial (opcional)</p>
		<p class="mt-0.5 text-xs text-ink-500">
			Estas respuestas permiten comprobar si las prioridades cambian según el territorio. Puedes
			omitirlas.
		</p>

		<label for="community" class="mt-3 block text-xs font-semibold text-ink-700"
			>Comunidad autónoma</label
		>
		<select
			id="community"
			bind:value={form.community}
			class="mt-1 w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
		>
			<option value="">Prefiero no indicar</option>
			{#each autonomousCommunities as community (community.name)}
				<option value={community.name}>{community.name}</option>
			{/each}
		</select>

		<p class="mt-3 text-xs font-semibold text-ink-700">Tipo de entorno</p>
		<div class="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each AREA_TYPES as a (a)}
				<button
					type="button"
					onclick={() => (form.areaType = a)}
					aria-pressed={form.areaType === a}
					class="rounded-xl border px-2 py-2 text-sm font-medium {form.areaType === a
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{listeningSurveyAreaTypeLabels[a]}
				</button>
			{/each}
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={prevStep}
			disabled={step === 1}
			class="flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
		>
			<ArrowLeft class="size-3.5" /> Atrás
		</button>
		{#if step >= 5}
			<button
				type="button"
				onclick={() => (step === 6 ? finish() : (step += 1))}
				class="rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
			>
				Omitir
			</button>
		{/if}
		<button
			type="button"
			onclick={nextStep}
			disabled={!canContinue || saveState === 'saving'}
			class="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{#if saveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
			{#if step === 6}
				{authState.session ? 'Enviar mi respuesta' : 'Continuar e iniciar sesión'}
				{#if !authState.session}<LogIn class="size-3.5" />{/if}
			{:else}
				Continuar <ArrowRight class="size-3.5" />
			{/if}
		</button>
	</div>
	{#if saveState === 'error'}
		<p class="text-critical-600 mt-2 text-xs" role="alert">
			{saveError ?? 'No se ha podido guardar tu respuesta.'}
		</p>
	{/if}
{/snippet}
