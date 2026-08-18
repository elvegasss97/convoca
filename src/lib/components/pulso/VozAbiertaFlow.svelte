<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		LogIn,
		Loader2,
		CheckCircle2,
		AlertCircle,
		ShieldAlert,
		Info,
		Check,
		Undo2,
		ChevronDown,
		ChevronUp
	} from '@lucide/svelte';
	import type { OpenVoiceContribution } from '$lib/types';
	import {
		OPEN_VOICE_SCOPE_TYPES,
		openVoiceScopeTypeLabels,
		openVoiceStatusLabels
	} from '$lib/labels';
	import { authState } from '$lib/auth/session.svelte';
	import { safeRedirect } from '$lib/utils/safeRedirect';
	import { LEGAL_VERSIONS } from '$lib/legal/versions';
	import {
		submitOpenVoiceContribution,
		listMyOpenVoiceContributions,
		withdrawOpenVoiceContribution
	} from '$lib/services/openVoiceService';
	import {
		emptyOpenVoiceForm,
		isOpenVoiceContentMeaningful,
		isOpenVoiceDraftExpired,
		isValidOpenVoiceDraftPayload,
		OPEN_VOICE_CONTENT_MIN_LENGTH,
		OPEN_VOICE_DRAFT_VERSION,
		type OpenVoiceDraftPayload,
		type OpenVoiceFormState
	} from '$lib/utils/openVoiceDraft';
	import TerritoryPicker from './TerritoryPicker.svelte';

	const DRAFT_KEY = 'convoca:voz-abierta:draft:v1';

	const ORIENTATION_QUESTIONS = [
		'¿Qué está pasando?',
		'¿Desde cuándo ocurre?',
		'¿A quién afecta?',
		'¿Dónde sucede?',
		'¿Qué crees que debería cambiar?'
	];

	const PROGRESS_STAGES: { id: string; label: string }[] = [
		{ id: 'recibida', label: 'Recibida' },
		{ id: 'analisis_conjunto', label: 'Análisis conjunto' },
		{ id: 'posible_propuesta', label: 'Posible propuesta' }
	];

	function loadRawDraft(): OpenVoiceDraftPayload | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!isValidOpenVoiceDraftPayload(parsed)) {
				localStorage.removeItem(DRAFT_KEY);
				return null;
			}
			if (isOpenVoiceDraftExpired(parsed)) {
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
	// podemos permitirnos esperar: justo antes de salir hacia /login.
	function flushDraftSave() {
		if (!browser) return;
		try {
			const payload: OpenVoiceDraftPayload = {
				version: OPEN_VOICE_DRAFT_VERSION,
				form: $state.snapshot(form),
				pendingAutoSubmit,
				savedAt: Date.now()
			};
			localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
			storageAvailable = true;
		} catch {
			storageAvailable = false;
		}
	}

	// Resuelto una única vez, de forma síncrona, ANTES del primer render: evita
	// el salto visual de "onMount" (portada vacía primero, borrador restaurado
	// un instante después).
	function resolveInitialState(): {
		form: OpenVoiceFormState;
		pendingAutoSubmit: boolean;
		restoredFromDraft: boolean;
	} {
		const draft = loadRawDraft();
		if (!draft) {
			return { form: emptyOpenVoiceForm(), pendingAutoSubmit: false, restoredFromDraft: false };
		}
		return {
			form: draft.form,
			pendingAutoSubmit: draft.pendingAutoSubmit,
			restoredFromDraft: isOpenVoiceContentMeaningful(draft.form.content)
		};
	}

	const initialState = resolveInitialState();

	let form = $state<OpenVoiceFormState>(initialState.form);
	let pendingAutoSubmit = $state(initialState.pendingAutoSubmit);
	let restoredFromDraft = $state(initialState.restoredFromDraft);
	let storageAvailable = $state(browser ? probeStorageAvailable() : false);
	let showOrientation = $state(false);

	type SubmitState = 'idle' | 'submitting' | 'error';
	let submitState = $state<SubmitState>('idle');
	let submitError = $state<string | null>(null);
	let showValidation = $state(false);
	let justSubmitted = $state<OpenVoiceContribution | null>(null);

	const contentValid = $derived(isOpenVoiceContentMeaningful(form.content));

	// Persistencia local continua (con debounce): sobrevive a recargas y al ir
	// y volver de iniciar sesión. Se pausa mientras hay una confirmación
	// mostrada, para no reescribir el borrador ya vaciado.
	$effect(() => {
		const formSnapshot = $state.snapshot(form);
		const pendingSnapshot = pendingAutoSubmit;
		if (!browser || justSubmitted) return;
		const timeout = setTimeout(() => {
			try {
				const payload: OpenVoiceDraftPayload = {
					version: OPEN_VOICE_DRAFT_VERSION,
					form: formSnapshot,
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
		if (browser && pendingAutoSubmit && authState.session) {
			pendingAutoSubmit = false;
			submit();
		}
	});

	// "Tus aportaciones": se resuelve en el cliente tras montar (nunca en un
	// `load` de servidor) — con SSR activo, el servidor no tiene acceso a la
	// sesión de localStorage, igual que el resto de "mis respuestas" de Pulso
	// ciudadano.
	let myContributions = $state<OpenVoiceContribution[]>([]);
	let loadingMine = $state(false);
	let expandedId = $state<string | null>(null);

	async function refreshMine() {
		if (!authState.session) {
			myContributions = [];
			return;
		}
		loadingMine = true;
		try {
			myContributions = await listMyOpenVoiceContributions();
		} catch {
			// Silencioso a propósito: es un bloque secundario ("Tus
			// aportaciones"), no debe romper ni tapar el formulario principal.
		} finally {
			loadingMine = false;
		}
	}

	$effect(() => {
		if (authState.session) refreshMine();
		else myContributions = [];
	});

	function discardDraft() {
		const confirmed = confirm(
			'¿Borrar tu borrador guardado en este dispositivo y empezar de nuevo? Esto no afecta a ninguna aportación que ya hayas enviado.'
		);
		if (!confirmed) return;
		clearDraft();
		form = emptyOpenVoiceForm();
		pendingAutoSubmit = false;
		restoredFromDraft = false;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		showValidation = true;
		if (!contentValid || submitState === 'submitting') return;

		if (!authState.session) {
			pendingAutoSubmit = true;
			// Escritura inmediata, no con el debounce habitual: la pestaña va a
			// navegar fuera de la SPA (a /login) justo después.
			flushDraftSave();
			goto(
				`/login?redirect=${encodeURIComponent(safeRedirect(page.url.pathname, '/pulso/escucha/voz-abierta'))}`
			);
			return;
		}
		await submit();
	}

	async function submit() {
		if (!contentValid || submitState === 'submitting') return;
		submitState = 'submitting';
		submitError = null;
		try {
			const contribution = await submitOpenVoiceContribution({
				content: form.content,
				scope: {
					type: form.scopeType,
					value:
						form.scopeType === 'nacional' || form.scopeType === 'multiple'
							? undefined
							: form.scopeValue
				},
				privacyNoticeVersion: LEGAL_VERSIONS.privacy
			});
			// El borrador solo se borra tras la confirmación real del servidor:
			// nunca se asume el éxito de forma optimista.
			clearDraft();
			justSubmitted = contribution;
			submitState = 'idle';
			showValidation = false;
			await refreshMine();
		} catch (err) {
			submitState = 'error';
			submitError = err instanceof Error ? err.message : 'No se ha podido guardar tu aportación.';
		}
	}

	function startAnother() {
		justSubmitted = null;
		form = emptyOpenVoiceForm();
		submitState = 'idle';
		submitError = null;
		showValidation = false;
	}

	async function withdraw(id: string) {
		const confirmed = confirm('¿Retirar esta aportación? No podrás deshacer esta acción.');
		if (!confirmed) return;
		try {
			await withdrawOpenVoiceContribution(id);
			await refreshMine();
			if (justSubmitted?.id === id) justSubmitted = null;
		} catch (err) {
			alert(err instanceof Error ? err.message : 'No se ha podido retirar tu aportación.');
		}
	}

	function preview(content: string, max = 160): string {
		const trimmed = content.trim();
		return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
	}

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
	}

	function scopeLabel(scope: OpenVoiceContribution['scope']): string {
		if (scope.type === 'nacional' || scope.type === 'multiple')
			return openVoiceScopeTypeLabels[scope.type];
		return scope.value ?? openVoiceScopeTypeLabels[scope.type];
	}

	function autoResize(node: HTMLTextAreaElement) {
		function resize() {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		}
		resize();
		node.addEventListener('input', resize);
		return {
			destroy() {
				node.removeEventListener('input', resize);
			}
		};
	}
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
	{#if justSubmitted}
		<div aria-live="polite">
			<div
				class="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
			>
				<CheckCircle2 class="size-4 shrink-0 text-brand-700" />
				<p class="font-display text-sm font-semibold text-brand-800">Gracias por contarlo</p>
			</div>
			<p class="mt-3 text-sm text-ink-600">
				Tu aportación ha quedado registrada. La analizaremos junto a otras voces para detectar
				problemas comunes y preparar futuras propuestas. Tu texto no se publicará de forma
				individual.
			</p>

			<ol class="mt-4 flex flex-wrap gap-1.5" aria-label="Progreso de tu aportación">
				{#each PROGRESS_STAGES as stage, i (stage.id)}
					<li
						class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium {stage.id ===
						'recibida'
							? 'border-brand-600 bg-brand-50 text-brand-800'
							: 'border-dashed border-ink-200 text-ink-400'}"
					>
						{#if stage.id === 'recibida'}<Check class="size-3.5" />{:else}<span
								class="flex size-3.5 items-center justify-center text-[10px]">{i + 1}</span
							>{/if}
						{stage.label}
					</li>
				{/each}
			</ol>

			<div class="mt-4 rounded-xl border border-ink-100 p-3">
				<p class="text-xs font-semibold text-ink-700">Tu aportación</p>
				<p class="mt-1 text-xs text-ink-400">
					{formatDate(justSubmitted.createdAt)} · {scopeLabel(justSubmitted.scope)}
				</p>
				<p class="mt-1.5 text-sm whitespace-pre-line text-ink-700">
					{preview(justSubmitted.content, 400)}
				</p>
			</div>

			<div class="mt-4 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => {
						expandedId = justSubmitted?.id ?? null;
						document.getElementById('tus-aportaciones')?.scrollIntoView({ behavior: 'smooth' });
					}}
					class="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
				>
					Ver mi aportación
				</button>
				<button
					type="button"
					onclick={startAnother}
					class="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
				>
					Enviar otra
				</button>
			</div>
		</div>
	{:else}
		<form onsubmit={onSubmit} novalidate>
			{#if submitError}
				<div
					class="mb-4 flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
					role="alert"
				>
					<AlertCircle class="mt-0.5 size-4 shrink-0" />
					{submitError}
				</div>
			{/if}

			<button
				type="button"
				onclick={() => (showOrientation = !showOrientation)}
				aria-expanded={showOrientation}
				aria-controls="orientation-questions"
				class="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-ink-200 px-3.5 py-2.5 text-left text-sm font-medium text-ink-600 hover:bg-ink-50"
			>
				<span class="flex items-center gap-1.5"
					><Info class="size-3.5 shrink-0" /> Si te ayuda, puedes orientarte con estas preguntas</span
				>
				{#if showOrientation}<ChevronUp class="size-4 shrink-0" />{:else}<ChevronDown
						class="size-4 shrink-0"
					/>{/if}
			</button>
			{#if showOrientation}
				<ul id="orientation-questions" class="mt-2 flex flex-col gap-1 pl-4 text-sm text-ink-500">
					{#each ORIENTATION_QUESTIONS as q (q)}
						<li class="list-disc">{q}</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-4">
				<label for="voz-abierta-content" class="mb-1 block text-sm font-medium text-ink-700">
					Cuéntanos qué está pasando
				</label>
				<textarea
					id="voz-abierta-content"
					bind:value={form.content}
					use:autoResize
					rows="8"
					placeholder="Escribe con libertad. Puedes contarnos qué ocurre, desde cuándo, a quién afecta, dónde sucede y qué crees que debería cambiar."
					aria-invalid={showValidation && !contentValid}
					aria-describedby="voz-abierta-content-error voz-abierta-privacy-notice"
					class="w-full resize-none rounded-xl text-sm leading-relaxed focus:ring-brand-500 {showValidation &&
					!contentValid
						? 'border-critical-400 focus:border-critical-500'
						: 'border-ink-200 focus:border-brand-500'}"></textarea>
				{#if showValidation && !contentValid}
					<p id="voz-abierta-content-error" class="text-critical-600 mt-1 text-xs" role="alert">
						Escribe al menos {OPEN_VOICE_CONTENT_MIN_LENGTH} caracteres para que tu aportación sea significativa.
					</p>
				{/if}
			</div>

			{#if !storageAvailable}
				<p class="mt-2 flex items-start gap-1.5 text-xs text-warning-700">
					<Info class="mt-0.5 size-3.5 shrink-0" /> Este navegador no permite guardar tu progreso localmente:
					si recargas la página o sales antes de enviar, tendrás que volver a escribir tu aportación.
				</p>
			{/if}
			{#if restoredFromDraft}
				<div class="mt-2 flex flex-wrap items-center justify-between gap-2">
					<p class="flex items-center gap-1.5 text-xs text-ink-400">
						<Undo2 class="size-3.5 shrink-0" /> Hemos recuperado tu borrador guardado en este dispositivo.
					</p>
					<button
						type="button"
						onclick={discardDraft}
						class="text-xs font-medium text-ink-400 underline hover:text-ink-700"
					>
						Descartar borrador y empezar de nuevo
					</button>
				</div>
			{/if}

			<div class="mt-5">
				<p class="mb-1 block text-sm font-medium text-ink-700">¿Dónde ocurre?</p>
				<TerritoryPicker
					bind:scopeType={form.scopeType}
					bind:scopeValue={form.scopeValue}
					idPrefix="voz-abierta-scope"
					availableTypes={OPEN_VOICE_SCOPE_TYPES}
					labels={openVoiceScopeTypeLabels}
				/>
			</div>

			<div
				id="voz-abierta-privacy-notice"
				class="mt-4 flex items-start gap-2 rounded-2xl border border-ink-100 bg-ink-50 p-3.5 text-xs text-ink-500"
			>
				<ShieldAlert class="mt-0.5 size-3.5 shrink-0" />
				<p>
					No incluyas datos personales tuyos o de terceros ni identifiques a personas concretas.
					Convoca no es un canal de emergencias ni de denuncias urgentes. Consulta la
					<a href="/legal/privacidad" class="font-medium text-ink-700 underline hover:text-ink-900"
						>Política de privacidad</a
					>.
				</p>
			</div>

			<button
				type="submit"
				disabled={submitState === 'submitting'}
				class="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
			>
				{#if submitState === 'submitting'}<Loader2 class="size-3.5 animate-spin" />{/if}
				{#if !authState.session}
					Continuar e iniciar sesión <LogIn class="size-3.5" />
				{:else}
					Enviar mi aportación
				{/if}
			</button>
		</form>
	{/if}
</div>

{#if authState.session && (myContributions.length > 0 || loadingMine)}
	<div id="tus-aportaciones" class="mt-6 rounded-2xl border border-ink-100 bg-white p-4 sm:p-6">
		<h2 class="font-display text-base font-semibold text-ink-900">Tus aportaciones</h2>
		{#if loadingMine}
			<p class="mt-2 text-sm text-ink-400">Cargando…</p>
		{:else}
			<ul class="mt-3 flex flex-col gap-2.5">
				{#each myContributions as contribution (contribution.id)}
					{@const expanded = expandedId === contribution.id}
					<li class="rounded-xl border border-ink-100 p-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<p class="text-xs text-ink-400">
								{formatDate(contribution.createdAt)} · {scopeLabel(contribution.scope)}
							</p>
							<span
								class="rounded-full border border-ink-200 px-2 py-0.5 text-xs font-medium text-ink-600"
							>
								{openVoiceStatusLabels[contribution.status]}
							</span>
						</div>
						<p class="mt-1.5 text-sm whitespace-pre-line text-ink-700">
							{expanded ? contribution.content : preview(contribution.content)}
						</p>
						<div class="mt-2 flex flex-wrap gap-3">
							<button
								type="button"
								onclick={() => (expandedId = expanded ? null : contribution.id)}
								class="text-xs font-medium text-brand-700 hover:underline"
							>
								{expanded ? 'Ver menos' : 'Ver aportación completa'}
							</button>
							<button
								type="button"
								onclick={() => withdraw(contribution.id)}
								class="text-critical-600 text-xs font-medium hover:underline"
							>
								Retirar
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
