<script lang="ts" module>
	import type { ChannelPlatform, ChannelType } from '$lib/types';

	/**
	 * Entrada local (no persistida hasta guardar). `existingId` presente =
	 * mapea a un canal ya guardado en Supabase (para poder diferenciar
	 * altas/ediciones/bajas al guardar, ver `/crear` y `EditEventDialog`).
	 */
	export interface ChannelDraft {
		localId: string;
		existingId?: string;
		platform: ChannelPlatform;
		channelType: ChannelType;
		label: string;
		url: string;
	}

	export function emptyChannelDraft(): ChannelDraft {
		return {
			localId: crypto.randomUUID(),
			platform: 'whatsapp',
			channelType: 'group',
			label: '',
			url: ''
		};
	}
</script>

<script lang="ts">
	import { MessageCircle, Send, Link as LinkIcon, Plus, Trash2 } from '@lucide/svelte';
	import { channelPlatformLabels, channelTypeLabels } from '$lib/labels';
	import { validateChannelUrl } from '$lib/utils/channelUrl';

	interface Props {
		channels: ChannelDraft[];
	}

	let { channels = $bindable() }: Props = $props();

	const platforms = Object.entries(channelPlatformLabels) as [ChannelPlatform, string][];
	const channelTypes = Object.entries(channelTypeLabels) as [ChannelType, string][];

	const platformIcons: Record<ChannelPlatform, typeof MessageCircle> = {
		whatsapp: MessageCircle,
		telegram: Send,
		other: LinkIcon
	};

	function addChannel() {
		channels = [...channels, emptyChannelDraft()];
	}

	function removeChannel(localId: string) {
		channels = channels.filter((c) => c.localId !== localId);
	}

	function errorFor(draft: ChannelDraft): string | null {
		if (!draft.url.trim()) return null; // fila recién añadida, todavía sin rellenar
		const result = validateChannelUrl(draft.url, draft.platform);
		return result.valid ? null : (result.error ?? 'Enlace no válido.');
	}
</script>

<div class="flex flex-col gap-3">
	<div>
		<h3 class="font-display text-sm font-semibold text-ink-900">Canales de coordinación</h3>
		<p class="mt-0.5 text-xs text-ink-500">
			Opcional. Añade grupos o canales externos (WhatsApp, Telegram, u otro enlace oficial) para que
			quien asista pueda coordinarse. No es necesario para publicar la convocatoria.
		</p>
	</div>

	{#each channels as draft (draft.localId)}
		{@const Icon = platformIcons[draft.platform]}
		{@const error = errorFor(draft)}
		<div class="flex flex-col gap-2 rounded-2xl border border-ink-200 p-3.5">
			<div class="flex items-start gap-2">
				<span
					class="mt-1.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
				>
					<Icon class="size-4" />
				</span>
				<div class="grid flex-1 grid-cols-2 gap-2">
					<div>
						<label
							class="mb-1 block text-xs font-medium text-ink-600"
							for={`platform-${draft.localId}`}>Plataforma</label
						>
						<select
							id={`platform-${draft.localId}`}
							bind:value={draft.platform}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each platforms as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-ink-600" for={`type-${draft.localId}`}
							>Tipo</label
						>
						<select
							id={`type-${draft.localId}`}
							bind:value={draft.channelType}
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						>
							{#each channelTypes as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
				</div>
				<button
					type="button"
					onclick={() => removeChannel(draft.localId)}
					class="hover:text-critical-600 mt-1 shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-critical-50"
					aria-label="Eliminar canal"
				>
					<Trash2 class="size-4" />
				</button>
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-ink-600" for={`label-${draft.localId}`}>
					Nombre visible <span class="font-normal text-ink-400">(opcional)</span>
				</label>
				<input
					id={`label-${draft.localId}`}
					bind:value={draft.label}
					maxlength="80"
					placeholder="p. ej. Canal de avisos, Coordinación de voluntarios..."
					class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
			</div>
			<div>
				<label class="mb-1 block text-xs font-medium text-ink-600" for={`url-${draft.localId}`}
					>Enlace</label
				>
				<input
					id={`url-${draft.localId}`}
					bind:value={draft.url}
					type="url"
					placeholder="https://chat.whatsapp.com/..."
					aria-invalid={Boolean(error)}
					class="w-full rounded-xl text-sm focus:ring-brand-500 {error
						? 'border-critical-400 focus:border-critical-500'
						: 'border-ink-200 focus:border-brand-500'}"
				/>
				{#if error}
					<p class="text-critical-600 mt-1 text-xs">{error}</p>
				{/if}
			</div>
		</div>
	{/each}

	<button
		type="button"
		onclick={addChannel}
		class="flex items-center justify-center gap-1.5 rounded-full border border-dashed border-ink-300 py-2.5 text-sm font-medium text-ink-600 hover:border-brand-400 hover:text-brand-700"
	>
		<Plus class="size-4" /> Añadir canal
	</button>
</div>
