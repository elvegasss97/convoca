<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		CheckCircle2,
		Check,
		Info,
		Loader2,
		LogIn,
		ArrowRight,
		Clock,
		Lock,
		ShieldAlert,
		Briefcase,
		GraduationCap,
		HeartHandshake,
		Coins,
		Globe
	} from '@lucide/svelte';
	import type {
		NextBlockVoteOptionCode,
		NextBlockVoteResultRow,
		NextBlockVoteRound
	} from '$lib/types';
	import {
		NEXT_BLOCK_VOTE_OPTIONS,
		nextBlockVoteOptionTitle
	} from '$lib/data/nextBlockVoteOptions';
	import {
		NEXT_BLOCK_VOTE_DRAFT_VERSION,
		isNextBlockVoteDraftExpired,
		isValidNextBlockVoteDraftPayload,
		type NextBlockVoteDraftPayload
	} from '$lib/utils/nextBlockVoteDraft';
	import { revealFlowStep } from '$lib/utils/flowNavigation';
	import { setNextBlockVote } from '$lib/services/nextBlockVoteService';
	import { authState } from '$lib/auth/session.svelte';

	interface Props {
		round?: NextBlockVoteRound;
		myVote?: NextBlockVoteOptionCode;
		total: number;
		results: NextBlockVoteResultRow[];
	}

	let { round, myVote, total, results }: Props = $props();

	const DRAFT_KEY = 'convoca:proximo-bloque:draft:v1';
	const FLOW_ANCHOR = '[data-next-block-vote-flow]';

	const OPTION_ICONS: Record<NextBlockVoteOptionCode, typeof Briefcase> = {
		empleo_salarios: Briefcase,
		educacion: GraduationCap,
		pensiones_cuidados: HeartHandshake,
		coste_vida: Coins,
		inmigracion_integracion_convivencia: Globe
	};

	type Phase = 'select' | 'preconfirm' | 'confirmed';

	function loadRawDraft(): NextBlockVoteDraftPayload | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!isValidNextBlockVoteDraftPayload(parsed)) {
				localStorage.removeItem(DRAFT_KEY);
				return null;
			}
			if (isNextBlockVoteDraftExpired(parsed)) {
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

	// Escritura inmediata (sin debounce: un único campo, coste despreciable),
	// para el momento en que no podemos permitirnos esperar: justo antes de
	// salir hacia /login.
	function flushDraftSave(optionCode: NextBlockVoteOptionCode) {
		if (!browser) return;
		try {
			const payload: NextBlockVoteDraftPayload = {
				version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
				optionCode,
				savedAt: Date.now()
			};
			localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
			storageAvailable = true;
		} catch {
			storageAvailable = false;
		}
	}

	// Resuelto una única vez, de forma síncrona, ANTES del primer render:
	// evita el salto visual de portada vacía → selección restaurada un
	// instante después (mismo motivo que en SanidadListeningFlow.svelte).
	function resolveInitialState(): {
		phase: Phase;
		selectedOption: NextBlockVoteOptionCode | undefined;
		restoredFromDraft: boolean;
	} {
		const draft = loadRawDraft();

		if (draft && myVote && draft.optionCode === myVote) {
			// Mismo contenido: no hay cambio real que confirmar, y el borrador
			// ya sobra una vez que el servidor tiene lo mismo.
			clearDraft();
			return { phase: 'confirmed', selectedOption: myVote, restoredFromDraft: false };
		}
		if (draft) {
			// Puede diferir del voto ya guardado (si existe): nunca se
			// sobrescribe en silencio — la pantalla previa a confirmar deja
			// claro cuál es el voto actual y cuál sería el cambio.
			return { phase: 'preconfirm', selectedOption: draft.optionCode, restoredFromDraft: true };
		}
		if (myVote) {
			return { phase: 'confirmed', selectedOption: myVote, restoredFromDraft: false };
		}
		return { phase: 'select', selectedOption: undefined, restoredFromDraft: false };
	}

	const initialState = resolveInitialState();

	let phase = $state<Phase>(initialState.phase);
	let selectedOption = $state<NextBlockVoteOptionCode | undefined>(initialState.selectedOption);
	let confirmedOption = $state<NextBlockVoteOptionCode | undefined>(myVote);
	let restoredFromDraft = $state(initialState.restoredFromDraft);
	let storageAvailable = $state(browser ? probeStorageAvailable() : false);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// El "cambio pendiente" es simplemente la diferencia entre el voto ya
	// confirmado y la opción seleccionada ahora: no hace falta estado propio.
	const pendingChangeFrom = $derived(
		confirmedOption && confirmedOption !== selectedOption ? confirmedOption : undefined
	);

	const isOpen = $derived(round?.status === 'open');

	// Persistencia local continua mientras no haya voto confirmado: sobrevive
	// a recargas y al ir y volver de iniciar sesión. No sustituye el guardado
	// real en el servidor, que solo ocurre al confirmar (autenticado).
	$effect(() => {
		const opt = selectedOption;
		const currentPhase = phase;
		if (!browser || !opt || currentPhase === 'confirmed') return;
		try {
			const payload: NextBlockVoteDraftPayload = {
				version: NEXT_BLOCK_VOTE_DRAFT_VERSION,
				optionCode: opt,
				savedAt: Date.now()
			};
			localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
			storageAvailable = true;
		} catch {
			storageAvailable = false;
		}
	});

	async function chooseOption(code: NextBlockVoteOptionCode) {
		selectedOption = code;
		phase = 'preconfirm';
		saveError = null;
		await revealFlowStep(FLOW_ANCHOR);
	}

	async function changeSelection() {
		phase = 'select';
		saveError = null;
		await revealFlowStep(FLOW_ANCHOR);
	}

	async function confirmVote() {
		if (!selectedOption || !round) return;
		if (!authState.session) {
			// Escritura inmediata: la pestaña va a navegar fuera de la SPA (a
			// /login) justo después.
			flushDraftSave(selectedOption);
			goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		saving = true;
		saveError = null;
		try {
			await setNextBlockVote(round.id, selectedOption);
			confirmedOption = selectedOption;
			phase = 'confirmed';
			clearDraft();
			await revealFlowStep(FLOW_ANCHOR);
		} catch (err) {
			// Si falla el envío, se conserva la selección: no se resetea ni
			// selectedOption ni phase.
			saveError = err instanceof Error ? err.message : 'No se ha podido guardar tu elección.';
		} finally {
			saving = false;
		}
	}

	// Si hay una sesión disponible y estábamos en la pantalla previa a
	// confirmar tras volver de /login, el botón ya dice "Confirmar mi
	// elección" — no se envía nada automáticamente, la persona decide.
	const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
		timeZone: 'Europe/Madrid',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function formatRoundDate(iso: string): string {
		return `${dateTimeFormatter.format(new Date(iso))} (hora peninsular)`;
	}

	// Ordenado de forma comprensible (de más a menos apoyada); el empate se
	// detecta comparando con el máximo, nunca inventando un desempate.
	const sortedResults = $derived([...results].sort((a, b) => b.voteCount - a.voteCount));
	const maxVoteCount = $derived(sortedResults[0]?.voteCount ?? 0);
	const topOptions = $derived(
		maxVoteCount > 0 ? sortedResults.filter((r) => r.voteCount === maxVoteCount) : []
	);
	const isTie = $derived(topOptions.length > 1);
	const resultsTotal = $derived(sortedResults.reduce((sum, r) => sum + r.voteCount, 0));

	function percentage(count: number): string {
		if (resultsTotal === 0) return '0%';
		return `${Math.round((count / resultsTotal) * 100)}%`;
	}
</script>

<div
	data-next-block-vote-flow
	class="scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-6"
>
	{#if !round}
		<p class="text-sm text-ink-500">Todavía no hay ninguna votación configurada.</p>
	{:else}
		<div class="flex flex-wrap items-center gap-2">
			<span
				class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold
					{round.status === 'open'
					? 'border-accent-300 bg-accent-50 text-accent-700'
					: round.status === 'closed'
						? 'border-ink-200 bg-ink-50 text-ink-500'
						: 'border-warning-300 bg-warning-50 text-warning-700'}"
			>
				{#if round.status === 'open'}
					<span class="size-1.5 rounded-full bg-accent-600"></span> Abierta
				{:else if round.status === 'closed'}
					<Lock class="size-3.5" /> Cerrada
				{:else}
					<Clock class="size-3.5" /> Próximamente
				{/if}
			</span>
			{#if round.status === 'scheduled' && round.opensAt}
				<span class="text-xs text-ink-500">Abre el {formatRoundDate(round.opensAt)}</span>
			{/if}
			{#if round.status === 'open' && round.closesAt}
				<span class="text-xs text-ink-500">Cierra el {formatRoundDate(round.closesAt)}</span>
			{/if}
		</div>

		<p class="mt-3 text-sm font-semibold text-ink-900">
			¿Qué problema debería abordar Convoca después?
		</p>

		{#if round.status === 'closed'}
			<!-- Resultados: solo aquí se muestran votos por opción, nunca antes. -->
			{#if confirmedOption}
				<p class="mt-2 text-xs text-ink-500">
					Tu elección fue: <span class="font-semibold text-ink-700"
						>{nextBlockVoteOptionTitle(confirmedOption)}</span
					>
				</p>
			{/if}
			{#if resultsTotal === 0 && total === 0}
				<p
					class="mt-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-3 text-sm text-ink-500"
				>
					Todavía no se ha registrado ningún voto en esta votación.
				</p>
			{:else if resultsTotal === 0}
				<!--
					total > 0 pero results vacío: hay votos reales (0043, get_next_block_vote_results),
					pero el desglose por opción está suprimido porque alguna opción tiene entre 1 y 4
					votos — no es "sin votos", es "sin datos suficientes para desglosar sin riesgo de
					reconstrucción por resta". No usar el mensaje de "ningún voto registrado" aquí:
					sería falso.
				-->
				<p
					class="mt-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-3 text-sm text-ink-500"
				>
					Aún no hay datos suficientes para mostrar el desglose por opción.
				</p>
			{:else}
				{#if isTie}
					<div
						class="mt-3 flex items-center gap-2 rounded-xl border border-warning-300 bg-warning-50 px-3.5 py-2.5"
					>
						<Info class="size-4 shrink-0 text-warning-700" />
						<p class="text-warning-800 text-sm font-medium">
							Empate entre {topOptions
								.map((o) => nextBlockVoteOptionTitle(o.optionCode))
								.join(' y ')}
						</p>
					</div>
				{/if}
				<ul class="mt-3 flex flex-col gap-2">
					{#each sortedResults as row (row.optionCode)}
						{@const Icon = OPTION_ICONS[row.optionCode]}
						<li
							class="rounded-xl border p-3 {topOptions.some((o) => o.optionCode === row.optionCode)
								? 'border-accent-300 bg-accent-50'
								: 'border-ink-100'}"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="flex items-center gap-2 text-sm font-medium text-ink-900">
									<Icon class="size-4 shrink-0 text-ink-500" />
									{nextBlockVoteOptionTitle(row.optionCode)}
									{#if topOptions.some((o) => o.optionCode === row.optionCode)}
										<span class="text-xs font-semibold text-accent-700">— más apoyada</span>
									{/if}
								</span>
								<span class="shrink-0 text-sm font-semibold text-ink-700"
									>{percentage(row.voteCount)}</span
								>
							</div>
							<div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
								<div
									class="h-full rounded-full bg-accent-500"
									style:width={percentage(row.voteCount)}
								></div>
							</div>
							<p class="mt-1 text-xs text-ink-400">
								{row.voteCount}
								{row.voteCount === 1 ? 'voto' : 'votos'}
							</p>
						</li>
					{/each}
				</ul>
				<p class="mt-3 text-xs text-ink-500">
					<strong class="font-semibold text-ink-700">{resultsTotal}</strong>
					{resultsTotal === 1 ? 'participación válida' : 'participaciones válidas'} en total.
				</p>
			{/if}
		{:else if round.status === 'scheduled'}
			<!-- Vista previa, sin interacción: la votación todavía no admite votos. -->
			<ul class="mt-3 flex flex-col gap-2">
				{#each NEXT_BLOCK_VOTE_OPTIONS as option (option.code)}
					{@const Icon = OPTION_ICONS[option.code]}
					<li class="flex items-start gap-3 rounded-xl border border-ink-100 p-3 opacity-70">
						<Icon class="mt-0.5 size-4.5 shrink-0 text-ink-400" />
						<div>
							<p class="text-sm font-medium text-ink-700">{option.title}</p>
							<p class="text-xs text-ink-500">{option.description}</p>
						</div>
					</li>
				{/each}
			</ul>
		{:else if phase === 'select'}
			{#if !storageAvailable}
				<p class="mt-2 flex items-start gap-1.5 text-xs text-warning-700">
					<Info class="mt-0.5 size-3.5 shrink-0" /> Este navegador no permite guardar tu selección localmente:
					si recargas la página o sales antes de confirmar, tendrás que volver a elegir.
				</p>
			{/if}
			<ul class="mt-3 flex flex-col gap-2.5">
				{#each NEXT_BLOCK_VOTE_OPTIONS as option (option.code)}
					{@const Icon = OPTION_ICONS[option.code]}
					{@const isCurrent = confirmedOption === option.code}
					<li>
						<button
							type="button"
							onclick={() => chooseOption(option.code)}
							aria-pressed={isCurrent}
							class="flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition hover:border-accent-300 hover:bg-accent-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600
								{isCurrent ? 'border-accent-300 bg-accent-50' : 'border-ink-100 bg-white'}"
						>
							<Icon class="mt-0.5 size-5 shrink-0 text-accent-700" />
							<div class="flex-1">
								<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
									{option.title}
									{#if isCurrent}
										<span
											class="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-800"
										>
											<Check class="size-3" /> Tu elección actual
										</span>
									{/if}
								</p>
								<p class="mt-0.5 text-xs leading-relaxed text-ink-500">{option.description}</p>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{:else if phase === 'preconfirm' && selectedOption}
			{@const Icon = OPTION_ICONS[selectedOption]}
			{#if restoredFromDraft}
				<p class="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
					<Info class="size-3.5 shrink-0" /> Hemos recuperado tu selección guardada en este dispositivo.
				</p>
			{/if}
			<div class="mt-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
				<div class="flex items-center gap-2.5">
					<Icon class="size-5 shrink-0 text-accent-700" />
					<p class="text-sm font-semibold text-ink-900">
						Has elegido: {nextBlockVoteOptionTitle(selectedOption)}
					</p>
				</div>
				{#if pendingChangeFrom}
					<p class="mt-2 text-xs text-ink-600">
						Tu voto guardado actualmente es <strong
							>{nextBlockVoteOptionTitle(pendingChangeFrom)}</strong
						>. Si confirmas, se actualizará a
						<strong>{nextBlockVoteOptionTitle(selectedOption)}</strong>.
					</p>
				{/if}
				<p class="mt-2 text-xs text-ink-600">
					Podrás cambiar tu elección mientras la votación permanezca abierta.
				</p>
			</div>

			{#if saveError}
				<p class="text-critical-600 mt-2 flex items-start gap-1.5 text-sm" role="alert">
					<ShieldAlert class="mt-0.5 size-4 shrink-0" />
					{saveError}
				</p>
			{/if}

			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={confirmVote}
					disabled={saving}
					class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{#if saving}
						<Loader2 class="size-4 animate-spin" />
					{:else if !authState.session}
						<LogIn class="size-4" />
					{/if}
					{authState.session
						? saving
							? 'Guardando…'
							: 'Confirmar mi elección'
						: 'Accede para confirmar tu elección'}
				</button>
				<button
					type="button"
					onclick={changeSelection}
					class="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
				>
					Elegir otra opción
				</button>
			</div>
		{:else if phase === 'confirmed' && confirmedOption}
			<div
				class="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5"
			>
				<CheckCircle2 class="size-4 shrink-0 text-brand-700" />
				<p class="text-sm font-medium text-brand-800">Tu elección ya forma parte de Convoca</p>
			</div>
			<p class="mt-2 text-sm text-ink-700">
				Has elegido que el próximo bloque sea: <strong
					>{nextBlockVoteOptionTitle(confirmedOption)}</strong
				>. Puedes modificar tu elección mientras la votación continúe abierta.
			</p>

			<div class="mt-4 flex flex-wrap gap-2">
				{#if isOpen}
					<button
						type="button"
						onclick={changeSelection}
						class="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
					>
						Modificar mi elección
					</button>
				{/if}
				<a
					href="/pulso"
					class="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
				>
					Volver a Pulso Ciudadano
				</a>
				<a
					href="/pulso/escucha/sanidad"
					class="flex items-center gap-1 rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
				>
					Participar en la escucha sobre sanidad <ArrowRight class="size-3.5" />
				</a>
			</div>
		{/if}

		{#if round.status === 'open'}
			<p class="mt-4 text-xs leading-relaxed text-ink-500">
				<strong class="font-semibold text-ink-700">{total}</strong>
				{total === 1 ? 'participación válida' : 'participaciones válidas'} hasta ahora. Los resultados
				se publicarán cuando finalice la votación para evitar que las primeras cifras condicionen las
				siguientes elecciones.
			</p>
		{/if}

		<p class="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-400">
			<ShieldAlert class="mt-0.5 size-3.5 shrink-0" /> Estos resultados reflejan una participación abierta
			en Convoca. No constituyen una muestra representativa de la población española ni una votación oficial.
		</p>
	{/if}
</div>
