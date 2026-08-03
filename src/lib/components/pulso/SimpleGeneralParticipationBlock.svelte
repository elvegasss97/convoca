<script lang="ts">
	import { page } from '$app/state';
	import { LogIn, Loader2, ThumbsUp } from '@lucide/svelte';
	import type {
		GeneralParticipationResponse,
		GeneralParticipationResults,
		GeneralPosition,
		ParticipationRound,
		ParticipationSummary
	} from '$lib/types';
	import { simpleGeneralPositionLabels } from '$lib/labels';
	import { setGeneralParticipationResponse } from '$lib/services/participationService';
	import { authState } from '$lib/auth/session.svelte';
	import ContentTypeTag from './ContentTypeTag.svelte';

	interface Props {
		round?: ParticipationRound;
		myGeneralResponse?: GeneralParticipationResponse;
		generalResults?: GeneralParticipationResults;
		summary?: ParticipationSummary;
	}

	let { round, myGeneralResponse, generalResults, summary }: Props = $props();

	const GENERAL_POSITIONS: GeneralPosition[] = ['favor', 'en_contra', 'mas_info'];

	let generalPosition = $state<GeneralPosition | undefined>(myGeneralResponse?.generalPosition);

	type SaveState = 'idle' | 'saving' | 'saved' | 'updated' | 'error';
	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);
	let showResults = $state(Boolean(myGeneralResponse));

	async function save() {
		if (!round || !generalPosition) return;
		const wasFirst = !myGeneralResponse;
		saveState = 'saving';
		saveError = null;
		try {
			await setGeneralParticipationResponse(round.id, { generalPosition });
			saveState = wasFirst ? 'saved' : 'updated';
			showResults = true;
		} catch (err) {
			saveState = 'error';
			saveError = err instanceof Error ? err.message : 'No se ha podido guardar tu valoración.';
		}
	}

	function resultPercentage(count: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((count / total) * 100);
	}
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
		<ThumbsUp class="size-4 text-brand-700" /> Tu valoración general del plan
	</h2>

	{#if !authState.session}
		<p class="mt-2 text-sm text-ink-600">
			Puedes leer toda la propuesta sin registrarte. Inicia sesión únicamente si quieres participar.
		</p>
		<a
			href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
			class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
		>
			<LogIn class="size-3.5" /> Iniciar sesión o crear cuenta
		</a>
	{:else if !round || round.status !== 'open'}
		<p class="mt-2 text-sm text-ink-500">
			La participación sobre este plan no está abierta todavía.
		</p>
	{:else}
		<p class="mt-1 text-sm text-ink-700">¿Cuál es tu posición sobre este plan en su conjunto?</p>
		<div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
			{#each GENERAL_POSITIONS as pos (pos)}
				<button
					type="button"
					onclick={() => (generalPosition = pos)}
					aria-pressed={generalPosition === pos}
					class="rounded-xl border px-3 py-2.5 text-sm font-medium {generalPosition === pos
						? 'border-brand-600 bg-brand-50 text-brand-800'
						: 'border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50'}"
				>
					{simpleGeneralPositionLabels[pos]}
				</button>
			{/each}
		</div>

		<button
			type="button"
			onclick={save}
			disabled={saveState === 'saving' || !generalPosition}
			class="mt-3 flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
		>
			{#if saveState === 'saving'}<Loader2 class="size-3.5 animate-spin" />{/if}
			{saveState === 'saving'
				? 'Guardando…'
				: myGeneralResponse
					? 'Actualizar valoración'
					: 'Guardar valoración'}
		</button>
		{#if saveState === 'saved'}
			<p class="mt-1.5 text-xs font-medium text-brand-700">Valoración guardada.</p>
		{:else if saveState === 'updated'}
			<p class="mt-1.5 text-xs font-medium text-brand-700">Valoración actualizada.</p>
		{:else if saveState === 'error'}
			<p class="text-critical-600 mt-1.5 text-xs" role="alert">
				{saveError ?? 'Error al guardar.'}
			</p>
		{/if}

		{#if !showResults}
			<button
				type="button"
				onclick={() => (showResults = true)}
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
								<span class="w-56 shrink-0 text-ink-700">{simpleGeneralPositionLabels[pos]}</span>
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
						{summary.totalGeneralResponses === 1 ? 'persona ha valorado' : 'personas han valorado'} el
						conjunto del plan
						{#if summary.lastUpdatedAt}
							· última actualización {new Date(summary.lastUpdatedAt).toLocaleDateString('es-ES')}
						{/if}
					</p>
				{:else}
					<p class="text-xs text-ink-400">Todavía sin respuestas.</p>
				{/if}
				<p class="mt-2 text-xs text-ink-400">
					Estos resultados reflejan a las personas que han participado en Convoca. No constituyen
					una encuesta representativa de la población española.
				</p>
			</div>
		{/if}
	{/if}
</div>
