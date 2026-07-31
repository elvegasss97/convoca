<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		Info,
		CalendarDays,
		MapPin,
		Route as RouteIcon,
		ShieldCheck,
		Send,
		Loader2,
		AlertCircle
	} from '@lucide/svelte';
	import type { EventCategory, EventTheme, PriorCommunicationStatus } from '$lib/types';
	import { categoryLabels, themeLabels, themeLabel, priorCommunicationLabels } from '$lib/labels';
	import { mockCities } from '$lib/data/cities';
	import { createEvent } from '$lib/services/eventsService';
	import { getOrganizer } from '$lib/services/organizersService';
	import { authState } from '$lib/auth/session.svelte';
	import { getMyOrganizerPrivateProfile, hasCompletedLegalAcceptance } from '$lib/auth/authService';
	import { formatEventDate, formatDuration } from '$lib/utils/date';
	import CategoryGlyph from '$lib/components/CategoryGlyph.svelte';
	import MeetingPointPicker from '$lib/components/MeetingPointPicker.svelte';
	import FieldError from '$lib/components/FieldError.svelte';

	const steps = [
		{ key: 'tipo', title: 'Tipo de acción' },
		{ key: 'contenido', title: 'Título y descripción' },
		{ key: 'tematica', title: 'Temática' },
		{ key: 'fecha', title: 'Fecha y hora' },
		{ key: 'lugar', title: 'Punto de encuentro' },
		{ key: 'recorrido', title: 'Recorrido opcional' },
		{ key: 'normas', title: 'Normas y declaración' },
		{ key: 'comunicacion', title: 'Comunicación previa' },
		{ key: 'preview', title: 'Vista previa' }
	] as const;

	const categories = Object.entries(categoryLabels) as [EventCategory, string][];
	const themes = Object.entries(themeLabels) as [EventTheme, string][];
	const priorOptions = Object.entries(priorCommunicationLabels) as [
		PriorCommunicationStatus,
		string
	][];

	// El borrador se guarda en localStorage para que, si hay que enviar a la
	// persona a /login a mitad de formulario, lo recupere íntegro al volver
	// (ver `submit()` más abajo y las pruebas de "conservar el borrador").
	const DRAFT_KEY = 'convoca:crear:draft:v1';

	function defaultFormFactory() {
		return {
			category: 'concentracion' as EventCategory,
			title: '',
			description: '',
			objective: '',
			themes: [] as EventTheme[],
			customTheme: '',
			startDate: '',
			startTime: '18:00',
			durationMinutes: 60,
			cityName: mockCities[0].name,
			province: mockCities[0].province,
			meetingPoint: { ...mockCities[0].point },
			meetingLabel: '',
			meetingAddress: '',
			hasRoute: false,
			routeDescription: '',
			rulesText: 'Concentración pacífica y respetuosa.\nSe ruega no dejar residuos en el lugar.',
			peacefulDeclaration: false,
			priorCommunication: 'not_required' as PriorCommunicationStatus
		};
	}
	type DraftForm = ReturnType<typeof defaultFormFactory>;

	function loadDraft(): { form: DraftForm; stepIndex: number } | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as { form: DraftForm; stepIndex: number };
			return { form: { ...defaultFormFactory(), ...parsed.form }, stepIndex: parsed.stepIndex };
		} catch {
			return null;
		}
	}

	function clearDraft(): void {
		if (!browser) return;
		localStorage.removeItem(DRAFT_KEY);
	}

	const restoredDraft = loadDraft();

	let stepIndex = $state(Math.min(restoredDraft?.stepIndex ?? 0, steps.length - 1));
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let showErrors = $state(false);
	let done = $state<{ slug: string } | null>(null);

	let form = $state(restoredDraft?.form ?? defaultFormFactory());

	// Guarda el borrador en cada cambio (mientras no se haya enviado ya).
	$effect(() => {
		if (!browser || done) return;
		const snapshot = { form: $state.snapshot(form), stepIndex };
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
		} catch {
			// localStorage no disponible: el borrador solo vive en memoria para esta sesión.
		}
	});

	let myOrganizerName = $state('');
	$effect(() => {
		const organizerId = authState.session?.user.organizerId;
		if (!organizerId) {
			myOrganizerName = '';
			return;
		}
		getOrganizer(organizerId).then((org) => {
			myOrganizerName = org?.displayName ?? '';
		});
	});

	const rulesList = $derived(
		form.rulesText
			.split('\n')
			.map((r) => r.trim())
			.filter(Boolean)
	);
	const startAtPreview = $derived(
		form.startDate ? `${form.startDate}T${form.startTime}:00.000Z` : ''
	);

	function toggleTheme(theme: EventTheme) {
		form.themes = form.themes.includes(theme)
			? form.themes.filter((t) => t !== theme)
			: [...form.themes, theme];
	}

	// Validez por campo, expuesta individualmente para poder mostrar el error
	// junto al campo concreto y hacer scroll hasta el primero que falle.
	const titleValid = $derived(form.title.trim().length >= 8);
	const descriptionValid = $derived(form.description.trim().length >= 20);
	const themesValid = $derived(form.themes.length > 0);
	const customThemeValid = $derived(
		!form.themes.includes('otro') || form.customTheme.trim().length > 0
	);
	const dateValid = $derived(Boolean(form.startDate));
	const timeValid = $derived(Boolean(form.startTime));
	const meetingLabelValid = $derived(form.meetingLabel.trim().length > 0);
	const meetingAddressValid = $derived(form.meetingAddress.trim().length > 0);
	const cityValid = $derived(form.cityName.trim().length > 0);
	const rulesValid = $derived(rulesList.length > 0);
	const peacefulValid = $derived(form.peacefulDeclaration);

	const stepValid = $derived.by(() => {
		switch (steps[stepIndex].key) {
			case 'contenido':
				return titleValid && descriptionValid;
			case 'tematica':
				return themesValid && customThemeValid;
			case 'fecha':
				return dateValid && timeValid;
			case 'lugar':
				return meetingLabelValid && meetingAddressValid && cityValid;
			case 'normas':
				return rulesValid && peacefulValid;
			default:
				return true;
		}
	});

	/** Id del elemento al que hay que hacer scroll/foco cuando el paso actual falla. */
	function firstErrorTargetId(): string | null {
		switch (steps[stepIndex].key) {
			case 'contenido':
				if (!titleValid) return 'title';
				if (!descriptionValid) return 'description';
				return null;
			case 'tematica':
				if (!themesValid) return 'tematica-group';
				if (!customThemeValid) return 'custom-theme';
				return null;
			case 'fecha':
				if (!dateValid) return 'date';
				if (!timeValid) return 'time';
				return null;
			case 'lugar':
				if (!meetingLabelValid) return 'meeting-label';
				if (!meetingAddressValid) return 'meeting-address';
				if (!cityValid) return 'city-input';
				return null;
			case 'normas':
				if (!rulesValid) return 'rules';
				if (!peacefulValid) return 'peaceful-declaration';
				return null;
			default:
				return null;
		}
	}

	function scrollToFirstError() {
		const id = firstErrorTargetId();
		if (!id) return;
		requestAnimationFrame(() => {
			const el = document.getElementById(id);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			if (el instanceof HTMLElement && typeof el.focus === 'function') {
				el.focus({ preventScroll: true });
			}
		});
	}

	function next() {
		if (!stepValid) {
			showErrors = true;
			scrollToFirstError();
			return;
		}
		showErrors = false;
		stepIndex = Math.min(stepIndex + 1, steps.length - 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function back() {
		showErrors = false;
		stepIndex = Math.max(stepIndex - 1, 0);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function submit() {
		// Guard síncrono: aunque el botón se deshabilita mientras `submitting`
		// es true, esto evita crear duplicados si dos eventos de pulsación
		// (p. ej. un doble toque en móvil) llegan antes de que el DOM refleje
		// el atributo disabled.
		if (submitting) return;

		const session = authState.session;
		if (!session) {
			// El borrador ya se guarda continuamente (ver el $effect de arriba);
			// al volver de /login a esta misma página se restaura solo.
			await goto('/login?redirect=/crear');
			return;
		}
		if (!session.user.organizerId) {
			submitError = 'Esta cuenta no tiene un perfil de organizador vinculado.';
			return;
		}

		const profile = await getMyOrganizerPrivateProfile(session.user.id);
		if (!hasCompletedLegalAcceptance(profile)) {
			// El borrador ya está guardado en localStorage (ver el $effect de
			// arriba): al volver de /aceptar-condiciones a /crear se restaura solo,
			// igual que con el redirect de /login de más arriba.
			await goto('/aceptar-condiciones?redirect=/crear');
			return;
		}

		submitting = true;
		submitError = null;
		try {
			const created = await createEvent({
				title: form.title.trim(),
				description: form.description.trim(),
				objective: form.objective.trim() || 'Sin objetivo adicional especificado.',
				category: form.category,
				themes: form.themes,
				customThemeLabel: form.themes.includes('otro') ? form.customTheme.trim() : undefined,
				startAt: startAtPreview,
				durationMinutes: form.durationMinutes,
				meetingPoint: {
					point: form.meetingPoint,
					label: form.meetingLabel.trim(),
					address: form.meetingAddress.trim(),
					city: form.cityName,
					province: form.province.trim() || form.cityName.trim()
				},
				route: form.hasRoute
					? {
							points: [
								form.meetingPoint,
								{ lat: form.meetingPoint.lat + 0.01, lng: form.meetingPoint.lng + 0.01 }
							],
							description: form.routeDescription.trim() || undefined
						}
					: undefined,
				organizerId: session.user.organizerId,
				createdByUserId: session.user.id,
				priorCommunication: form.priorCommunication,
				rules: rulesList,
				peacefulDeclaration: form.peacefulDeclaration
			});
			clearDraft();
			done = { slug: created.slug };
		} catch (err) {
			console.error('No se pudo crear la convocatoria', err);
			submitError =
				'No se ha podido enviar la convocatoria. Tus datos siguen aquí: revisa la conexión e inténtalo de nuevo.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Crear convocatoria — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 pt-4 pb-24 sm:px-6 md:pb-10">
	{#if done}
		<div
			class="flex flex-col items-center gap-3 rounded-3xl border border-brand-100 bg-brand-50 px-6 py-14 text-center"
		>
			<span class="grid size-14 place-items-center rounded-full bg-brand-700 text-white">
				<Check class="size-7" strokeWidth={2.5} />
			</span>
			<h1 class="font-display text-xl font-semibold text-ink-900">
				Convocatoria enviada a revisión
			</h1>
			<p class="max-w-sm text-sm text-ink-600">
				Hemos recibido tu convocatoria. Nuestro equipo de moderación la revisará antes de
				publicarla. Puedes seguir su estado desde tu panel de organizador.
			</p>
			<div class="mt-2 flex gap-2">
				<a
					href="/organizador"
					class="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
				>
					Ir a mi panel
				</a>
				<a
					href="/"
					class="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
				>
					Volver a inicio
				</a>
			</div>
		</div>
	{:else}
		<a
			href="/"
			class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
		>
			<ArrowLeft class="size-4" /> Cancelar
		</a>

		<h1 class="font-display text-2xl font-semibold text-ink-900">Crear convocatoria</h1>
		<p class="mt-1 text-sm text-ink-500">
			Paso {stepIndex + 1} de {steps.length} · {steps[stepIndex].title}
		</p>

		<div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
			<div
				class="h-full rounded-full bg-brand-600 transition-all"
				style={`width: ${((stepIndex + 1) / steps.length) * 100}%`}
			></div>
		</div>

		{#if !authState.session}
			<div
				class="mt-4 flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-xs text-brand-800"
			>
				<Info class="mt-0.5 size-3.5 shrink-0" />
				Puedes rellenar el formulario sin cuenta. Al final te pediremos iniciar sesión o registrarte para
				publicar la convocatoria — no perderás lo que hayas escrito.
			</div>
		{/if}

		<form
			class="mt-6 space-y-5 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
			onsubmit={(e) => e.preventDefault()}
		>
			{#if steps[stepIndex].key === 'tipo'}
				<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
					{#each categories as [value, label] (value)}
						<button
							type="button"
							onclick={() => (form.category = value)}
							class="flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 text-center text-sm font-medium transition {form.category ===
							value
								? 'border-brand-700 bg-brand-50 text-brand-800'
								: 'border-ink-100 text-ink-600 hover:border-brand-200'}"
						>
							<CategoryGlyph category={value} class="size-6" />
							{label}
						</button>
					{/each}
				</div>
			{:else if steps[stepIndex].key === 'contenido'}
				<div>
					<label for="title" class="mb-1 block text-sm font-medium text-ink-700">Título</label>
					<input
						id="title"
						bind:value={form.title}
						maxlength="90"
						placeholder="Ej. Concentración vecinal por la limpieza del barrio"
						aria-invalid={showErrors && !titleValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !titleValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					<p class="mt-1 text-xs text-ink-400">{form.title.length}/90</p>
					{#if showErrors && !titleValid}
						<FieldError message="El título debe tener al menos 8 caracteres." />
					{/if}
				</div>
				<div>
					<label for="description" class="mb-1 block text-sm font-medium text-ink-700"
						>Descripción</label
					>
					<textarea
						id="description"
						bind:value={form.description}
						rows="4"
						maxlength="800"
						placeholder="Explica qué va a ocurrir, por qué y qué se espera de las personas asistentes."
						aria-invalid={showErrors && !descriptionValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !descriptionValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"></textarea>
					{#if showErrors && !descriptionValid}
						<FieldError message="La descripción debe tener al menos 20 caracteres." />
					{/if}
				</div>
				<div>
					<label for="objective" class="mb-1 block text-sm font-medium text-ink-700">
						Objetivo <span class="font-normal text-ink-400">(opcional)</span>
					</label>
					<input
						id="objective"
						bind:value={form.objective}
						placeholder="Ej. Conseguir una reunión con el ayuntamiento"
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
			{:else if steps[stepIndex].key === 'tematica'}
				<p class="text-sm text-ink-500">
					Elige una o varias temáticas que describan tu convocatoria.
				</p>
				<div
					id="tematica-group"
					tabindex="-1"
					class="flex flex-wrap gap-2 rounded-2xl {showErrors && !themesValid
						? 'outline-critical-400 outline outline-2 outline-offset-4'
						: ''}"
				>
					{#each themes as [value, label] (value)}
						<button
							type="button"
							onclick={() => toggleTheme(value)}
							class="rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition {form.themes.includes(
								value
							)
								? 'border-brand-700 bg-brand-700 text-white'
								: 'border-ink-200 text-ink-600 hover:border-brand-300'}"
						>
							{label}
						</button>
					{/each}
				</div>
				{#if showErrors && !themesValid}
					<FieldError message="Selecciona al menos una temática." />
				{/if}
				{#if form.themes.includes('otro')}
					<div>
						<label for="custom-theme" class="mb-1 block text-sm font-medium text-ink-700">
							Especifica la temática
						</label>
						<input
							id="custom-theme"
							bind:value={form.customTheme}
							maxlength="60"
							placeholder="Ej. Protección animal"
							aria-invalid={showErrors && !customThemeValid}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !customThemeValid
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
						/>
						{#if showErrors && !customThemeValid}
							<FieldError message="Describe brevemente la temática." />
						{/if}
					</div>
				{/if}
			{:else if steps[stepIndex].key === 'fecha'}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="date" class="mb-1 block text-sm font-medium text-ink-700">Fecha</label>
						<input
							id="date"
							type="date"
							bind:value={form.startDate}
							aria-invalid={showErrors && !dateValid}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !dateValid
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
						/>
						{#if showErrors && !dateValid}
							<FieldError message="Indica la fecha." />
						{/if}
					</div>
					<div>
						<label for="time" class="mb-1 block text-sm font-medium text-ink-700">Hora</label>
						<input
							id="time"
							type="time"
							bind:value={form.startTime}
							aria-invalid={showErrors && !timeValid}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !timeValid
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
						/>
						{#if showErrors && !timeValid}
							<FieldError message="Indica la hora." />
						{/if}
					</div>
				</div>
				<div>
					<label for="duration" class="mb-1 block text-sm font-medium text-ink-700">
						Duración estimada: {formatDuration(form.durationMinutes)}
					</label>
					<input
						id="duration"
						type="range"
						min="15"
						max="360"
						step="15"
						bind:value={form.durationMinutes}
						class="w-full accent-brand-700"
					/>
				</div>
			{:else if steps[stepIndex].key === 'lugar'}
				<div>
					<label for="meeting-label" class="mb-1 block text-sm font-medium text-ink-700"
						>Nombre del punto de encuentro</label
					>
					<input
						id="meeting-label"
						bind:value={form.meetingLabel}
						placeholder="Ej. Plaza Mayor"
						aria-invalid={showErrors && !meetingLabelValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !meetingLabelValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					{#if showErrors && !meetingLabelValid}
						<FieldError message="Indica el nombre del punto de encuentro." />
					{/if}
				</div>
				<div>
					<label for="meeting-address" class="mb-1 block text-sm font-medium text-ink-700"
						>Dirección</label
					>
					<input
						id="meeting-address"
						bind:value={form.meetingAddress}
						placeholder="Ej. Plaza Mayor, s/n"
						aria-invalid={showErrors && !meetingAddressValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
						!meetingAddressValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					{#if showErrors && !meetingAddressValid}
						<FieldError message="Indica la dirección." />
					{/if}
				</div>
				<MeetingPointPicker
					bind:point={form.meetingPoint}
					bind:cityName={form.cityName}
					bind:province={form.province}
					address={form.meetingAddress}
					cityInvalid={showErrors && !cityValid}
				/>
			{:else if steps[stepIndex].key === 'recorrido'}
				<label class="flex items-center gap-2.5 text-sm font-medium text-ink-800">
					<input
						type="checkbox"
						bind:checked={form.hasRoute}
						class="size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
					/>
					Esta convocatoria incluye un recorrido
				</label>
				{#if form.hasRoute}
					<div>
						<label for="route-description" class="mb-1 block text-sm font-medium text-ink-700"
							>Describe el recorrido</label
						>
						<textarea
							id="route-description"
							bind:value={form.routeDescription}
							rows="3"
							placeholder="Ej. Desde la Plaza Mayor hasta el Ayuntamiento por la calle principal."
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						></textarea>
					</div>
				{:else}
					<p class="flex items-start gap-2 text-sm text-ink-400">
						<RouteIcon class="mt-0.5 size-4 shrink-0" />
						Si tu convocatoria es estática, puedes dejar este paso sin marcar.
					</p>
				{/if}
			{:else if steps[stepIndex].key === 'normas'}
				<div>
					<label for="rules" class="mb-1 block text-sm font-medium text-ink-700"
						>Normas de la convocatoria (una por línea)</label
					>
					<textarea
						id="rules"
						bind:value={form.rulesText}
						rows="4"
						aria-invalid={showErrors && !rulesValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !rulesValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"></textarea>
					{#if showErrors && !rulesValid}
						<FieldError message="Añade al menos una norma." />
					{/if}
				</div>
				<label
					class="flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-medium text-brand-900 {showErrors &&
					!peacefulValid
						? 'border-critical-400 bg-critical-50'
						: 'border-brand-100 bg-brand-50'}"
				>
					<input
						id="peaceful-declaration"
						type="checkbox"
						bind:checked={form.peacefulDeclaration}
						class="mt-0.5 size-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
					/>
					<span>
						Declaro que esta convocatoria tiene carácter pacífico y legal, y que no incita a la
						violencia ni al odio.
					</span>
				</label>
				{#if showErrors && !peacefulValid}
					<FieldError
						message="Debes confirmar la declaración de carácter pacífico para continuar."
					/>
				{/if}
			{:else if steps[stepIndex].key === 'comunicacion'}
				<p class="text-sm text-ink-500">
					Indica en qué punto se encuentra la comunicación previa a la autoridad competente, si
					aplica.
				</p>
				<div class="space-y-2">
					{#each priorOptions as [value, label] (value)}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-sm font-medium transition {form.priorCommunication ===
							value
								? 'border-brand-700 bg-brand-50 text-brand-800'
								: 'border-ink-100 text-ink-600'}"
						>
							<input type="radio" class="sr-only" bind:group={form.priorCommunication} {value} />
							{label}
						</label>
					{/each}
				</div>
				<div
					class="flex items-start gap-2 rounded-2xl border border-warning-300 bg-warning-50 p-3.5 text-xs text-warning-700"
				>
					<Info class="mt-0.5 size-4 shrink-0" />
					Convoca no sustituye los trámites administrativos que, en su caso, correspondan ante el ayuntamiento,
					delegación de gobierno u otra autoridad competente. Esta plataforma solo ayuda a difundir la
					convocatoria.
				</div>
			{:else if steps[stepIndex].key === 'preview'}
				<div class="space-y-4">
					<div class="overflow-hidden rounded-2xl border border-ink-100">
						<div class="bg-dot-grid flex items-center gap-2 bg-brand-800 px-4 py-3 text-white">
							<CategoryGlyph category={form.category} class="size-6" />
							<span class="text-sm font-medium">{categoryLabels[form.category]}</span>
						</div>
						<div class="space-y-2 p-4">
							<h3 class="font-display text-lg font-semibold text-ink-900">
								{form.title || 'Título de la convocatoria'}
							</h3>
							<p class="text-sm text-ink-600">{form.description || 'Descripción pendiente.'}</p>
							<div class="flex flex-wrap gap-1.5 pt-1">
								{#each form.themes as theme (theme)}
									<span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
										>{themeLabel(theme, form.customTheme)}</span
									>
								{/each}
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="flex items-start gap-2 rounded-2xl border border-ink-100 p-3.5 text-sm">
							<CalendarDays class="mt-0.5 size-4 shrink-0 text-brand-600" />
							<span>
								{form.startDate ? formatEventDate(startAtPreview) : 'Sin fecha'} · {form.startTime} ·
								{formatDuration(form.durationMinutes)}
							</span>
						</div>
						<div class="flex items-start gap-2 rounded-2xl border border-ink-100 p-3.5 text-sm">
							<MapPin class="mt-0.5 size-4 shrink-0 text-brand-600" />
							<span>{form.meetingLabel || 'Punto de encuentro pendiente'}, {form.cityName}</span>
						</div>
						<div class="flex items-start gap-2 rounded-2xl border border-ink-100 p-3.5 text-sm">
							<ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />
							<span
								>Publicada por {myOrganizerName ||
									authState.session?.user.email ||
									'tu cuenta'}</span
							>
						</div>
						<div class="flex items-start gap-2 rounded-2xl border border-ink-100 p-3.5 text-sm">
							<Info class="mt-0.5 size-4 shrink-0 text-brand-600" />
							<span>{priorCommunicationLabels[form.priorCommunication]}</span>
						</div>
					</div>

					<p class="text-xs text-ink-400">
						Tu convocatoria se enviará al equipo de moderación antes de publicarse. Recibirás el
						estado en tu panel de organizador.
					</p>
				</div>
			{/if}
		</form>

		{#if submitError}
			<div
				class="mt-4 flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				{submitError}
			</div>
		{/if}

		<div class="mt-4 flex items-center gap-2">
			{#if stepIndex > 0}
				<button
					type="button"
					onclick={back}
					disabled={submitting}
					class="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<ArrowLeft class="size-4" /> Atrás
				</button>
			{/if}
			{#if steps[stepIndex].key !== 'preview'}
				<button
					type="button"
					onclick={next}
					class="ml-auto flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
				>
					Siguiente <ArrowRight class="size-4" />
				</button>
			{:else}
				<button
					type="button"
					onclick={submit}
					disabled={submitting}
					aria-busy={submitting}
					class="ml-auto flex items-center gap-1.5 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-80"
				>
					{#if submitting}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<Send class="size-4" />
					{/if}
					{submitting ? 'Enviando…' : 'Enviar a revisión'}
				</button>
			{/if}
		</div>
	{/if}
</div>
