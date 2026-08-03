<script lang="ts">
	import { Plus, Vote } from '@lucide/svelte';
	import type { NextBlockVoteRound, NextBlockVoteRoundStatus } from '$lib/types';
	import { nextBlockVoteRoundStatusLabels } from '$lib/labels';
	import {
		createNextBlockVoteRound,
		setNextBlockVoteRoundStatus
	} from '$lib/services/nextBlockVoteService';

	interface Props {
		rounds: NextBlockVoteRound[];
		moderatorId: string;
	}

	let { rounds = $bindable(), moderatorId }: Props = $props();

	const latestRound = $derived(rounds[0]);

	let newVersionLabel = $state('');
	let newOpensAt = $state('');
	let newClosesAt = $state('');
	let creating = $state(false);
	let error = $state<string | null>(null);

	async function createRound() {
		if (!newVersionLabel.trim()) {
			error = 'Indica una etiqueta de versión (p. ej. "2026-1").';
			return;
		}
		creating = true;
		error = null;
		try {
			const created = await createNextBlockVoteRound(
				{
					versionLabel: newVersionLabel,
					// `datetime-local` no lleva huso horario propio: el navegador lo
					// interpreta en la hora local de quien administra, y `Date`
					// lo convierte a un instante UTC real — correcto sea cual sea
					// el huso horario de esa persona.
					opensAt: newOpensAt ? new Date(newOpensAt).toISOString() : undefined,
					closesAt: newClosesAt ? new Date(newClosesAt).toISOString() : undefined
				},
				moderatorId
			);
			rounds = [created, ...rounds];
			newVersionLabel = '';
			newOpensAt = '';
			newClosesAt = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se ha podido crear la ronda.';
		} finally {
			creating = false;
		}
	}

	async function changeStatus(round: NextBlockVoteRound, status: NextBlockVoteRoundStatus) {
		error = null;
		try {
			const updated = await setNextBlockVoteRoundStatus(round.id, status);
			rounds = rounds.map((r) => (r.id === updated.id ? updated : r));
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se ha podido cambiar el estado.';
		}
	}
</script>

<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
		<Vote class="size-4 text-accent-700" /> Tú eliges el próximo bloque
	</h2>
	<p class="mt-1 text-xs text-ink-500">
		Crear una ronda no la abre al público (se muestra como "Próximamente"). Solo al ponerla en
		estado "Abierta" empieza a admitir votos. Cerrarla es definitivo: no se puede reabrir desde aquí
		— crea una ronda nueva para una futura votación.
	</p>

	{#if error}
		<p class="text-critical-600 mt-2 text-sm font-medium" role="alert">{error}</p>
	{/if}

	<ul class="mt-2 flex flex-col gap-2">
		{#each rounds as round (round.id)}
			<li class="rounded-xl border border-ink-100 p-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="text-sm font-medium text-ink-900">
						Versión {round.versionLabel} —
						<span
							class={round.status === 'open'
								? 'text-accent-700'
								: round.status === 'closed'
									? 'text-ink-400'
									: 'text-warning-700'}>{nextBlockVoteRoundStatusLabels[round.status]}</span
						>
					</span>
					<div class="flex flex-wrap gap-1.5">
						{#if round.status === 'scheduled'}
							<button
								type="button"
								onclick={() => changeStatus(round, 'open')}
								class="rounded-full bg-accent-600 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-700"
							>
								Abrir ahora
							</button>
						{/if}
						{#if round.status === 'open'}
							<button
								type="button"
								onclick={() => changeStatus(round, 'closed')}
								class="text-critical-600 rounded-full border border-critical-300 px-3 py-1 text-xs font-semibold hover:bg-critical-50"
							>
								Cerrar
							</button>
						{/if}
					</div>
				</div>
				{#if round.opensAt}
					<p class="mt-1 text-xs text-ink-400">
						Abre: {new Date(round.opensAt).toLocaleString('es-ES')}
					</p>
				{/if}
				{#if round.closesAt}
					<p class="text-xs text-ink-400">
						Cierra: {new Date(round.closesAt).toLocaleString('es-ES')}
					</p>
				{/if}
			</li>
		{:else}
			<li class="text-sm text-ink-400">Todavía no hay ninguna ronda de esta votación.</li>
		{/each}
	</ul>

	{#if !latestRound || latestRound.status === 'closed'}
		<div class="mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-ink-200 p-3">
			<input
				bind:value={newVersionLabel}
				placeholder="Etiqueta de versión (p. ej. 2026-1)"
				class="rounded-xl border-ink-200 text-sm focus:border-accent-500 focus:ring-accent-500"
			/>
			<div class="flex flex-col gap-2 sm:flex-row">
				<label class="flex-1 text-xs text-ink-500">
					Abre (opcional)
					<input
						type="datetime-local"
						bind:value={newOpensAt}
						class="mt-0.5 w-full rounded-xl border-ink-200 text-sm focus:border-accent-500 focus:ring-accent-500"
					/>
				</label>
				<label class="flex-1 text-xs text-ink-500">
					Cierra (opcional)
					<input
						type="datetime-local"
						bind:value={newClosesAt}
						class="mt-0.5 w-full rounded-xl border-ink-200 text-sm focus:border-accent-500 focus:ring-accent-500"
					/>
				</label>
			</div>
			<button
				type="button"
				onclick={createRound}
				disabled={creating}
				class="flex w-fit items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
			>
				<Plus class="size-3.5" />
				{creating ? 'Creando…' : 'Crear ronda'}
			</button>
		</div>
	{/if}
</section>
