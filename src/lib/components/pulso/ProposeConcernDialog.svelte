<script lang="ts">
	import { page } from '$app/state';
	import { Megaphone, X, CircleCheck, AlertCircle, LogIn } from '@lucide/svelte';
	import type { ConcernCategory, ConcernScopeType } from '$lib/types';
	import { concernCategoryLabels } from '$lib/labels';
	import { submitConcernProposal } from '$lib/services/concernsService';
	import { authState } from '$lib/auth/session.svelte';
	import TerritoryPicker from './TerritoryPicker.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();

	const categories = Object.entries(concernCategoryLabels) as [ConcernCategory, string][];

	let title = $state('');
	let proposedQuestion = $state('');
	let category = $state<ConcernCategory>('vivienda');
	let description = $state('');
	let reason = $state('');
	let scopeType = $state<ConcernScopeType>('nacional');
	let scopeValue = $state<string | undefined>(undefined);
	let respectfulConfirmed = $state(false);

	let submitting = $state(false);
	let submitted = $state(false);
	let submitError = $state<string | null>(null);
	let showErrors = $state(false);

	const formValid = $derived(
		title.trim().length >= 5 &&
			proposedQuestion.trim().length >= 10 &&
			reason.trim().length >= 10 &&
			respectfulConfirmed
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		showErrors = true;
		if (!formValid || submitting) return;
		submitting = true;
		submitError = null;
		try {
			await submitConcernProposal({
				title: title.trim(),
				proposedQuestion: proposedQuestion.trim(),
				category,
				description: description.trim(),
				scope: { type: scopeType, value: scopeType === 'nacional' ? undefined : scopeValue },
				reason: reason.trim()
			});
			submitted = true;
		} catch (err) {
			submitError =
				err instanceof Error
					? err.message
					: 'No se ha podido enviar tu propuesta. Inténtalo de nuevo.';
		} finally {
			submitting = false;
		}
	}

	function close() {
		open = false;
		onClose();
		setTimeout(() => {
			submitted = false;
			submitError = null;
			showErrors = false;
			title = '';
			proposedQuestion = '';
			description = '';
			reason = '';
			scopeType = 'nacional';
			scopeValue = undefined;
			respectfulConfirmed = false;
		}, 200);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={close}></button>
		<div
			class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
					<Megaphone class="size-5 text-brand-700" /> Proponer una preocupación
				</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>

			{#if !authState.session}
				<div class="mt-6 flex flex-col items-center gap-3 py-4 text-center">
					<p class="text-sm text-ink-600">
						Necesitas una cuenta para proponer una preocupación. Es gratis y puedes crearla en un
						minuto.
					</p>
					<a
						href={`/login?redirect=${encodeURIComponent(page.url.pathname)}`}
						class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
					>
						<LogIn class="size-4" /> Iniciar sesión o crear cuenta
					</a>
				</div>
			{:else if submitted}
				<div class="mt-6 flex flex-col items-center gap-2 py-4 text-center">
					<CircleCheck class="size-10 text-brand-600" />
					<p class="font-semibold text-ink-800">Propuesta enviada</p>
					<p class="text-sm text-ink-500">
						Tu propuesta se ha enviado a revisión. Convoca comprobará que sea clara, neutral y que
						no duplique otra preocupación existente.
					</p>
					<button
						onclick={close}
						class="mt-3 rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
					>
						Cerrar
					</button>
				</div>
			{:else}
				<form class="mt-4 space-y-4" onsubmit={submit} novalidate>
					{#if submitError}
						<div
							class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
							role="alert"
						>
							<AlertCircle class="mt-0.5 size-4 shrink-0" />
							{submitError}
						</div>
					{/if}

					<div>
						<label for="proposal-title" class="mb-1 block text-sm font-medium text-ink-700">
							Título o problema
						</label>
						<input
							id="proposal-title"
							bind:value={title}
							maxlength="120"
							placeholder="P. ej. Precio del alquiler en zonas turísticas"
							aria-invalid={showErrors && title.trim().length < 5}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
							title.trim().length < 5
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
						/>
						{#if showErrors && title.trim().length < 5}
							<p class="text-critical-600 mt-1 text-xs">Escribe al menos 5 caracteres.</p>
						{/if}
					</div>

					<div>
						<label for="proposal-question" class="mb-1 block text-sm font-medium text-ink-700">
							Pregunta propuesta
						</label>
						<textarea
							id="proposal-question"
							bind:value={proposedQuestion}
							rows="2"
							maxlength="200"
							placeholder="P. ej. ¿Cuánto te preocupa el precio del alquiler en tu zona?"
							aria-invalid={showErrors && proposedQuestion.trim().length < 10}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
							proposedQuestion.trim().length < 10
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"></textarea>
						{#if showErrors && proposedQuestion.trim().length < 10}
							<p class="text-critical-600 mt-1 text-xs">Escribe al menos 10 caracteres.</p>
						{/if}
					</div>

					<div>
						<label for="proposal-category" class="mb-1 block text-sm font-medium text-ink-700">
							Categoría
						</label>
						<select
							id="proposal-category"
							bind:value={category}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each categories as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>

					<div>
						<p class="mb-1 block text-sm font-medium text-ink-700">Ámbito territorial</p>
						<TerritoryPicker bind:scopeType bind:scopeValue idPrefix="proposal-scope" />
					</div>

					<div>
						<label for="proposal-description" class="mb-1 block text-sm font-medium text-ink-700">
							Descripción <span class="font-normal text-ink-400">(opcional)</span>
						</label>
						<textarea
							id="proposal-description"
							bind:value={description}
							rows="2"
							maxlength="500"
							placeholder="Contexto breve y neutral sobre el problema."
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						></textarea>
					</div>

					<div>
						<label for="proposal-reason" class="mb-1 block text-sm font-medium text-ink-700">
							¿Por qué debería medirse?
						</label>
						<textarea
							id="proposal-reason"
							bind:value={reason}
							rows="2"
							maxlength="500"
							placeholder="Explica brevemente por qué es relevante medir esta preocupación."
							aria-invalid={showErrors && reason.trim().length < 10}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
							reason.trim().length < 10
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"></textarea>
						{#if showErrors && reason.trim().length < 10}
							<p class="text-critical-600 mt-1 text-xs">Escribe al menos 10 caracteres.</p>
						{/if}
					</div>

					<label
						class="flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-medium text-brand-900 {showErrors &&
						!respectfulConfirmed
							? 'border-critical-400 bg-critical-50'
							: 'border-brand-100 bg-brand-50'}"
					>
						<input
							type="checkbox"
							bind:checked={respectfulConfirmed}
							class="mt-0.5 size-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
						/>
						<span>
							Confirmo que la pregunta propuesta está formulada de manera respetuosa y neutral, sin
							dirigir la respuesta.
						</span>
					</label>
					{#if showErrors && !respectfulConfirmed}
						<p class="text-critical-600 -mt-2 text-xs">Debes confirmar esta declaración.</p>
					{/if}

					<button
						type="submit"
						disabled={submitting}
						class="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
					>
						{submitting ? 'Enviando…' : 'Enviar propuesta'}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
