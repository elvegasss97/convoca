<script lang="ts">
	import { MessageCircle, Send, Link as LinkIcon, X, Flag } from '@lucide/svelte';
	import type { CommunicationChannel } from '$lib/types';
	import { channelTypeLabels } from '$lib/labels';
	import ChannelReportDialog from '$lib/components/ChannelReportDialog.svelte';

	interface Props {
		channels: CommunicationChannel[];
	}

	let { channels }: Props = $props();

	const platformIcons = { whatsapp: MessageCircle, telegram: Send, other: LinkIcon } as const;

	const buttonLabel = {
		whatsapp: 'Unirme por WhatsApp',
		telegram: 'Abrir Telegram',
		other: 'Abrir canal oficial'
	} as const;

	const noticeText = {
		whatsapp:
			'Al entrar en un grupo de WhatsApp, tu nombre y número podrían ser visibles para otros participantes. Este espacio es externo a Convoca y está gestionado por la organización.',
		telegram: 'Este grupo o canal es externo a Convoca y está gestionado por la organización.',
		other: 'Este enlace es externo a Convoca y está gestionado por la organización.'
	} as const;

	let pendingChannel = $state<CommunicationChannel | null>(null);
	let reportTarget = $state<CommunicationChannel | null>(null);
	let reportOpen = $state(false);

	function openNotice(channel: CommunicationChannel) {
		pendingChannel = channel;
	}

	function closeNotice() {
		pendingChannel = null;
	}

	function openReport(channel: CommunicationChannel) {
		reportTarget = channel;
		reportOpen = true;
		pendingChannel = null;
	}
</script>

{#if channels.length > 0}
	<div class="rounded-2xl border border-ink-100 bg-white p-4">
		<h2 class="font-display text-base font-semibold text-ink-900">
			Coordínate con la organización
		</h2>
		<p class="mt-1 text-xs text-ink-500">
			Enlaces externos gestionados por quien organiza. Convoca no participa en estos grupos ni
			registra quién los abre.
		</p>
		<div class="mt-3 flex flex-col gap-2">
			{#each channels as channel (channel.id)}
				{@const Icon = platformIcons[channel.platform]}
				<button
					type="button"
					onclick={() => openNotice(channel)}
					class="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3.5 py-2.5 text-left text-sm font-medium text-ink-800 transition hover:border-brand-300 hover:bg-brand-50"
				>
					<Icon class="size-4 shrink-0 text-brand-700" />
					<span class="flex-1">
						{buttonLabel[channel.platform]}
						{#if channel.label}
							<span class="block text-xs font-normal text-ink-500">{channel.label}</span>
						{:else}
							<span class="block text-xs font-normal text-ink-500"
								>{channelTypeLabels[channel.channelType]}</span
							>
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

{#if pendingChannel}
	{@const channel = pendingChannel}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={closeNotice}></button>
		<div
			class="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h3 class="font-display text-base font-semibold text-ink-900">Vas a salir de Convoca</h3>
				<button
					onclick={closeNotice}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>
			<p class="mt-3 text-sm text-ink-600">{noticeText[channel.platform]}</p>
			<div class="mt-5 flex flex-col gap-2">
				<a
					href={channel.url}
					target="_blank"
					rel="noopener noreferrer nofollow"
					onclick={closeNotice}
					class="rounded-full bg-brand-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
				>
					Continuar
				</a>
				<button
					type="button"
					onclick={closeNotice}
					class="rounded-full border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={() => openReport(channel)}
					class="text-critical-600 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium hover:text-critical-700"
				>
					<Flag class="size-3.5" /> Reportar enlace
				</button>
			</div>
		</div>
	</div>
{/if}

{#if reportTarget}
	<ChannelReportDialog
		channelId={reportTarget.id}
		bind:open={reportOpen}
		onClose={() => (reportTarget = null)}
	/>
{/if}
