<script lang="ts">
	import { Flag, X, CircleCheck, AlertCircle } from '@lucide/svelte';
	import type { ChannelReportReason } from '$lib/types';
	import { channelReportReasonLabels } from '$lib/labels';
	import { reportChannel } from '$lib/services/channelsService';

	interface Props {
		channelId: string;
		open: boolean;
		onClose: () => void;
	}

	let { channelId, open = $bindable(), onClose }: Props = $props();

	const reasons = Object.entries(channelReportReasonLabels) as [ChannelReportReason, string][];

	let reason = $state<ChannelReportReason>('enlace_roto');
	let details = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let submitError = $state<string | null>(null);

	async function submit(e: Event) {
		e.preventDefault();
		submitting = true;
		submitError = null;
		try {
			await reportChannel(channelId, reason, details.trim() || undefined);
			submitted = true;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'No se ha podido enviar el reporte.';
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
			details = '';
			reason = 'enlace_roto';
		}, 200);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={close}></button>
		<div
			class="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
					<Flag class="size-5 text-critical-500" /> Reportar canal
				</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>

			{#if submitted}
				<div class="mt-6 flex flex-col items-center gap-2 py-4 text-center">
					<CircleCheck class="size-10 text-brand-600" />
					<p class="font-semibold text-ink-800">Gracias por avisarnos</p>
					<p class="text-sm text-ink-500">
						El equipo de moderación revisará este canal. Puede ocultarlo sin afectar al resto de la
						convocatoria.
					</p>
					<button
						onclick={close}
						class="mt-3 rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
					>
						Cerrar
					</button>
				</div>
			{:else}
				<form class="mt-4 space-y-4" onsubmit={submit}>
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
						<label for="channel-report-reason" class="mb-1 block text-sm font-medium text-ink-700"
							>Motivo</label
						>
						<select
							id="channel-report-reason"
							bind:value={reason}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each reasons as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="channel-report-details" class="mb-1 block text-sm font-medium text-ink-700">
							Detalles <span class="font-normal text-ink-400">(opcional)</span>
						</label>
						<textarea
							id="channel-report-details"
							bind:value={details}
							rows="3"
							maxlength="500"
							placeholder="Cuéntanos qué has visto..."
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						></textarea>
					</div>
					<button
						type="submit"
						disabled={submitting}
						class="w-full rounded-full bg-critical-500 py-2.5 text-sm font-semibold text-white transition hover:bg-critical-700 disabled:opacity-60"
					>
						{submitting ? 'Enviando…' : 'Enviar reporte'}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
