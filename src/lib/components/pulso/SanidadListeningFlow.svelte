<script lang="ts">
	import { browser } from '$app/environment';
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
		Sparkles,
		Undo2,
		Info,
		BarChart3
	} from '@lucide/svelte';
	import type {
		ListeningRound,
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
	import {
		SANIDAD_LISTENING_AREA_TYPES,
		SANIDAD_LISTENING_DRAFT_VERSION,
		SANIDAD_LISTENING_MEASURES_MAX,
		SANIDAD_LISTENING_PROBLEMS_MAX,
		emptySanidadListeningForm,
		isSanidadListeningDraftExpired,
		isValidSanidadListeningDraftPayload,
		sanidadListeningFormsEqual,
		type SanidadListeningDraftPayload,
		type SanidadListeningFormState,
		type SanidadListeningValidationContext
	} from '$lib/utils/sanidadListeningDraft';

	interface Props {
		round?: ListeningRound;
		measures: TopicMeasure[];
		commitments: TopicCommitment[];
		initialResponse?: ListeningSurveyResponse;
	}

	let { round, measures, commitments, initialResponse }: Props = $props();

	// Distinta de una v1 previa (sin `version`/`savedAt`): un borrador v1
	// antiguo que quedara en el navegador de alguien simplemente no valida
	// y se ignora, no se intenta migrar.
	const DRAFT_KEY = 'convoca:escucha-sanidad:draft:v2';
	const AREA_TYPES = SANIDAD_LISTENING_AREA_TYPES;
	const PROBLEMS_MAX = SANIDAD_LISTENING_PROBLEMS_MAX;
	const MEASURES_MAX = SANIDAD_LISTENING_MEASURES_MAX;

	type FormState = SanidadListeningFormState;
	type DraftPayload = SanidadListeningDraftPayload;

	interface Conflict {
		draftForm: FormState;
		draftStep: number;
		serverForm: FormState;
	}

	const emptyFormState = emptySanidadListeningForm;

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

	const formsEqual = sanidadListeningFormsEqual;

	// Función (no `const` reactivo) a propósito: `measures`/`commitments` no
	// cambian tras la carga inicial de esta pantalla, y esto solo se usa en
	// la resolución síncrona de estado inicial, una única vez.
	function buildValidationContext(): SanidadListeningValidationContext {
		return {
			problemCodes: SANIDAD_LISTENING_PROBLEMS.map((o) => o.code),
			causeCodes: SANIDAD_LISTENING_CAUSES.map((o) => o.code),
			measureIds: measures.map((m) => m.id),
			commitmentIds: commitments.map((c) => c.id),
			communityNames: autonomousCommunities.map((c) => c.name)
		};
	}

	// Lee, valida y —si procede— caduca el borrador. Nunca lanza: un fallo
	// de lectura (almacenamiento bloqueado, JSON corrupto...) se trata igual
	// que "no hay borrador", nunca rompe el flujo.
	function loadRawDraft(): DraftPayload | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!isValidSanidadListeningDraftPayload(parsed, buildValidationContext())) {
				localStorage.removeItem(DRAFT_KEY);
				return null;
			}
			if (isSanidadListeningDraftExpired(parsed)) {
				localStorage.removeItem(DRAFT_KEY);
				return null;
			}
			return parsed;
		} catch {
			return null;
		}
	}

	function clearDraft() {
		if (!browser) return;
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {
			// Sin almacenamiento disponible no hay nada que borrar: degradación silenciosa.
		}
	}

	function probeStorageAvailable(): boolean {
		if (!browser) return false;
		try {
			const testKey = '__convoca_storage_probe__';
			localStorage.setItem(testKey, '1');
			localStorage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	}

	// Escritura inmediata (sin debounce), para el único momento en que no
	// podemos permitirnos esperar: justo antes de salir hacia /login, donde
	// un debounce pendiente podría no llegar a ejecutarse.
	function flushDraftSave() {
		if (!browser) return;
		try {
			const payload: DraftPayload = {
				version: SANIDAD_LISTENING_DRAFT_VERSION,
				form: $state.snapshot(form),
				step,
				pendingAutoSubmit,
				savedAt: Date.now()
			};
			localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
			storageAvailable = true;
		} catch {
			storageAvailable = false;
		}
	}

	// Resuelto una única vez, de forma síncrona, ANTES del primer render:
	// evita el salto visual de "onMount" (portada vacía primero, respuesta
	// restaurada un instante después) que provocaba la sensación de que el
	// borrador se perdía en cada recarga completa.
	function resolveInitialState(): {
		form: FormState;
		step: number;
		pendingAutoSubmit: boolean;
		finished: boolean;
		conflict: Conflict | null;
		restoredFromDraft: boolean;
	} {
		const server = initialResponse ? responseToFormState(initialResponse) : null;
		const draft = loadRawDraft();

		if (draft && server) {
			if (formsEqual(draft.form, server)) {
				// Mismo contenido: no hay conflicto real que resolver, y el
				// borrador ya sobra una vez que el servidor tiene lo mismo.
				clearDraft();
				return {
					form: server,
					step: 7,
					pendingAutoSubmit: false,
					finished: true,
					conflict: null,
					restoredFromDraft: false
				};
			}
			// Difieren: nunca se sobrescribe ninguna de las dos en silencio.
			// La respuesta ya enviada conserva prioridad como registro oficial
			// hasta que la persona confirme explícitamente lo contrario.
			return {
				form: emptyFormState(),
				step: 0,
				pendingAutoSubmit: false,
				finished: false,
				conflict: { draftForm: draft.form, draftStep: draft.step, serverForm: server },
				restoredFromDraft: false
			};
		}
		if (draft && !server) {
			return {
				form: draft.form,
				step: draft.step,
				pendingAutoSubmit: draft.pendingAutoSubmit,
				finished: false,
				conflict: null,
				restoredFromDraft: draft.step > 0
			};
		}
		if (!draft && server) {
			return {
				form: server,
				step: 7,
				pendingAutoSubmit: false,
				finished: true,
				conflict: null,
				restoredFromDraft: false
			};
		}
		return {
			form: emptyFormState(),
			step: 0,
			pendingAutoSubmit: false,
			finished: false,
			conflict: null,
			restoredFromDraft: false
		};
	}

	const initialState = resolveInitialState();

	// step: 0 = portada, 1-6 = pasos, 7 = confirmación
	let step = $state(initialState.step);
	let form = $state<FormState>(initialState.form);
	let finished = $state(initialState.finished);
	let pendingAutoSubmit = $state(initialState.pendingAutoSubmit);
	let conflict = $state<Conflict | null>(initialState.conflict);
	let restoredFromDraft = $state(initialState.restoredFromDraft);
	let storageAvailable = $state(browser ? probeStorageAvailable() : false);

	type SaveState = 'idle' | 'saving' | 'saved' | 'error';
	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);
	let showResults = $state(false);
	let showPortadaResults = $state(false);

	function discardDraft() {
		const confirmed = confirm(
			'¿Borrar tu borrador guardado en este dispositivo y empezar de nuevo? Esto no afecta a ninguna respuesta que ya hayas enviado.'
		);
		if (!confirmed) return;
		clearDraft();
		form = emptyFormState();
		step = 1;
		pendingAutoSubmit = false;
		restoredFromDraft = false;
	}

	function resolveConflictKeepServer() {
		if (!conflict) return;
		form = conflict.serverForm;
		step = 7;
		finished = true;
		clearDraft();
		conflict = null;
	}

	function resolveConflictKeepDraft() {
		if (!conflict) return;
		form = conflict.draftForm;
		step = conflict.draftStep > 0 ? conflict.draftStep : 1;
		finished = false;
		restoredFromDraft = true;
		conflict = null;
	}

	// Persistencia local continua (con debounce): sobrevive a recargas y al
	// ir y volver de iniciar sesión. No sustituye el guardado real en el
	// servidor, que solo ocurre al enviar (autenticado). Se pausa mientras
	// hay un conflicto sin resolver, para no sobrescribir el borrador con el
	// formulario vacío que se muestra durante la decisión.
	$effect(() => {
		// Leído aquí (no dentro del setTimeout) para que Svelte registre estas
		// dependencias: el debounce solo retrasa la escritura, no la detección
		// del cambio.
		const formSnapshot = $state.snapshot(form);
		const stepSnapshot = step;
		const pendingSnapshot = pendingAutoSubmit;
		if (!browser || finished || conflict) return;
		const timeout = setTimeout(() => {
			try {
				const payload: DraftPayload = {
					version: SANIDAD_LISTENING_DRAFT_VERSION,
					form: formSnapshot,
					step: stepSnapshot,
					pendingAutoSubmit: pendingSnapshot,
					savedAt: Date.now()
				};
				localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
				storageAvailable = true;
			} catch {
				storageAvailable = false;
			}
		}, 400);
		return () => clearTimeout(timeout);
	});

	// Si hay un envío pendiente de sesión y la sesión ya está disponible,
	// completa el envío automáticamente sin que la persona pierda su lugar.
	$effect(() => {
		if (browser && pendingAutoSubmit && authState.session && !conflict) {
			pendingAutoSubmit = false;
			submitFinal();
		}
	});

	function toggleProblem(code: string) {
		if (form.problems.includes(code)) {
			form.problems = form.problems.filter((c) => c !== code);
		} else if (form.problems.length < PROBLEMS_MAX) {
			form.problems = [...form.problems, code];
		}
	}

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
		restoredFromDraft = false;
		if (step === 6) {
			finish();
		} else {
			step += 1;
		}
	}
	function prevStep() {
		restoredFromDraft = false;
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
			// Escritura inmediata, no con el debounce habitual: la pestaña va a
			// navegar fuera de la SPA (a /login) justo después, y un guardado
			// pendiente en un setTimeout podría no llegar a ejecutarse a tiempo.
			flushDraftSave();
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
	{:else if conflict}
		<div
			class="flex items-center gap-2 rounded-xl border border-warning-300 bg-warning-50 px-3.5 py-2.5"
		>
			<Info class="size-4 shrink-0 text-warning-700" />
			<p class="text-warning-800 text-sm font-medium">Tienes dos respuestas distintas</p>
		</div>
		<p class="mt-2 text-sm text-ink-600">
			Ya existe una respuesta tuya guardada en la escucha, y este dispositivo también tiene un
			borrador sin enviar con respuestas diferentes. Elige con cuál quieres continuar — la otra no
			se pierde hasta que lo confirmes.
		</p>
		<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
			<div class="rounded-xl border border-ink-100 p-3">
				<p class="text-xs font-semibold text-ink-700">Tu respuesta ya enviada</p>
				{@render formSummary(conflict.serverForm)}
				<button
					type="button"
					onclick={resolveConflictKeepServer}
					class="mt-3 w-full rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
				>
					Continuar con esta respuesta
				</button>
			</div>
			<div class="rounded-xl border border-ink-100 p-3">
				<p class="text-xs font-semibold text-ink-700">Tu borrador sin enviar en este dispositivo</p>
				{@render formSummary(conflict.draftForm)}
				<button
					type="button"
					onclick={resolveConflictKeepDraft}
					class="mt-3 w-full rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
				>
					Recuperar este borrador
				</button>
			</div>
		</div>
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
			{@render formSummary(form)}
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

		<!-- Invitación secundaria, nunca obligatoria: votar no es parte de
		     completar esta escucha, solo una segunda cosa que se puede hacer
		     ahora que ya se ha participado. -->
		<div class="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-4">
			<p class="font-display text-sm font-semibold text-ink-900">
				Ahora elige qué abordamos después
			</p>
			<p class="mt-1 text-sm text-ink-600">
				Tu participación ayuda a mejorar el bloque de sanidad. También puedes decidir cuál será el
				próximo problema que trabajará Convoca.
			</p>
			<a
				href="/pulso/proximo-bloque"
				class="mt-2.5 inline-flex items-center gap-1 rounded-full bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
			>
				Elegir el próximo bloque <ArrowRight class="size-3.5" />
			</a>
		</div>
	{:else if step === 0}
		<div class="flex items-center gap-2">
			<Sparkles class="size-5 text-brand-700" />
			<h2 class="font-display text-lg font-semibold text-ink-900">Antes de empezar</h2>
		</div>
		<ul class="mt-2 flex flex-col gap-1.5 text-xs text-ink-500">
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
		<div class="mt-4 flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => (step = 1)}
				class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Empezar la escucha <ArrowRight class="size-4" />
			</button>
			<button
				type="button"
				onclick={() => (showPortadaResults = !showPortadaResults)}
				class="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
			>
				<BarChart3 class="size-3.5" />
				{showPortadaResults ? 'Ocultar estado de los resultados' : 'Ver estado de los resultados'}
			</button>
		</div>
		{#if showPortadaResults}
			<div class="mt-4">
				<SanidadListeningResults {round} {measures} {commitments} />
			</div>
		{/if}
	{:else}
		<!-- El recorrido es libre sin sesión; solo se pide iniciar sesión al llegar al final. -->
		{@render stepContent()}
	{/if}
</div>

{#snippet formSummary(f: FormState)}
	<dl class="mt-2 flex flex-col gap-1.5 text-xs text-ink-600">
		{#if f.problems.length > 0}
			<div>
				<dt class="inline text-ink-400">Dónde falla más:</dt>
				<dd class="inline">
					{f.problems
						.map((c) =>
							c === 'otro'
								? f.otherProblemText || 'Otro problema'
								: (SANIDAD_LISTENING_PROBLEMS.find((p) => p.code === c)?.label ?? c)
						)
						.join(' · ')}
				</dd>
			</div>
		{/if}
		{#if f.mainCause}
			<div>
				<dt class="inline text-ink-400">Causa principal:</dt>
				<dd class="inline">
					{SANIDAD_LISTENING_CAUSES.find((c) => c.code === f.mainCause)?.label}
				</dd>
			</div>
		{/if}
		{#if f.prioritizedMeasureIds.length > 0}
			<div>
				<dt class="inline text-ink-400">Medidas priorizadas:</dt>
				<dd class="inline">
					{f.prioritizedMeasureIds.map((id, i) => `${i + 1}. ${measureTitle(id)}`).join(' · ')}
				</dd>
			</div>
		{/if}
		{#if f.commitmentMostUrgentId}
			<div>
				<dt class="inline text-ink-400">Compromiso más urgente:</dt>
				<dd class="inline">{commitments.find((c) => c.id === f.commitmentMostUrgentId)?.title}</dd>
			</div>
		{/if}
		{#if f.commitmentMostDifficultId}
			<div>
				<dt class="inline text-ink-400">Compromiso más difícil:</dt>
				<dd class="inline">
					{commitments.find((c) => c.id === f.commitmentMostDifficultId)?.title}
				</dd>
			</div>
		{/if}
	</dl>
{/snippet}

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

	{#if !storageAvailable}
		<p class="mt-2 flex items-start gap-1.5 text-xs text-warning-700">
			<Info class="mt-0.5 size-3.5 shrink-0" /> Este navegador no permite guardar tu progreso localmente:
			si recargas la página o sales antes de enviar, tendrás que volver a responder.
		</p>
	{/if}
	<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
		{#if restoredFromDraft}
			<p class="flex items-center gap-1.5 text-xs text-ink-400">
				<Undo2 class="size-3.5 shrink-0" /> Hemos recuperado tu borrador guardado en este dispositivo.
			</p>
		{:else}
			<span></span>
		{/if}
		<button
			type="button"
			onclick={discardDraft}
			class="text-xs font-medium text-ink-400 underline hover:text-ink-700"
		>
			Descartar borrador y empezar de nuevo
		</button>
	</div>

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
