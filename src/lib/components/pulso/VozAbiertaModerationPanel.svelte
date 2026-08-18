<script lang="ts">
	import { Check, Flag, X as XIcon } from '@lucide/svelte';
	import type { OpenVoiceModerationItem } from '$lib/types';
	import { openVoiceScopeTypeLabels } from '$lib/labels';
	import { setOpenVoiceModerationStatus } from '$lib/services/openVoiceService';

	/**
	 * Cola de moderación de Voz abierta (Centro de Operaciones, Fase 1).
	 * Deliberadamente sin identidad de quien envió cada aportación — ver
	 * `OpenVoiceModerationItem` en `$lib/types`. Solo permite cambiar
	 * `moderationStatus`: ni el contenido, ni el ámbito, ni la retirada en
	 * nombre de la cuenta son posibles desde aquí (bloqueado además por
	 * `enforce_open_voice_contribution_update`, 0047, aunque este
	 * componente ni lo intenta). Cada cambio queda auditado
	 * automáticamente por el trigger de 0050 — este componente no escribe
	 * auditoría por su cuenta.
	 */
	let { items = $bindable() }: { items: OpenVoiceModerationItem[] } = $props();

	let busyId = $state<string | null>(null);

	function scopeLabel(scope: OpenVoiceModerationItem['scope']): string {
		if (scope.type === 'nacional' || scope.type === 'multiple')
			return openVoiceScopeTypeLabels[scope.type];
		return scope.value ?? openVoiceScopeTypeLabels[scope.type];
	}

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(iso)
		);
	}

	async function moderate(id: string, status: 'approved' | 'flagged' | 'rejected') {
		busyId = id;
		try {
			await setOpenVoiceModerationStatus(id, status);
			items = items.filter((item) => item.id !== id);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'No se ha podido actualizar el estado.');
		} finally {
			busyId = null;
		}
	}
</script>

<div>
	<h3 class="font-display text-sm font-semibold text-ink-900">
		Voz abierta — pendientes de revisión
	</h3>
	{#if items.length === 0}
		<p class="py-10 text-center text-sm text-ink-400">
			No hay aportaciones pendientes de revisión.
		</p>
	{:else}
		<div class="mt-3 space-y-2.5">
			{#each items as item (item.id)}
				<div class="rounded-2xl border border-ink-100 bg-white p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
							{scopeLabel(item.scope)}
						</span>
						<span class="text-xs text-ink-400">{formatDate(item.createdAt)}</span>
					</div>
					<p class="mt-2 text-sm whitespace-pre-wrap text-ink-800">{item.content}</p>
					<div class="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
						<button
							type="button"
							disabled={busyId === item.id}
							onclick={() => moderate(item.id, 'approved')}
							class="flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
						>
							<Check class="size-3.5" /> Aprobar
						</button>
						<button
							type="button"
							disabled={busyId === item.id}
							onclick={() => moderate(item.id, 'flagged')}
							class="flex items-center gap-1.5 rounded-full border border-warning-300 px-3 py-1.5 text-xs font-semibold text-warning-700 hover:bg-warning-50 disabled:opacity-50"
						>
							<Flag class="size-3.5" /> Marcar
						</button>
						<button
							type="button"
							disabled={busyId === item.id}
							onclick={() => moderate(item.id, 'rejected')}
							class="border-critical-200 text-critical-600 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-critical-50 disabled:opacity-50"
						>
							<XIcon class="size-3.5" /> Rechazar
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
