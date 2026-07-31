<script lang="ts">
	import { Share2, X, Copy, Check, MessageCircle, Mail } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		title: string;
		url: string;
	}

	let { open = $bindable(), onClose, title, url }: Props = $props();

	let copied = $state(false);

	function close() {
		open = false;
		onClose();
		copied = false;
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			// El portapapeles puede no estar disponible; se ignora en el prototipo.
		}
	}

	async function nativeShare() {
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				close();
			} catch {
				// Compartir cancelado por la persona usuaria.
			}
		}
	}

	const whatsappUrl = $derived(`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`);
	const mailUrl = $derived(
		`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
	);
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={close}></button>
		<div
			class="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
					<Share2 class="size-5 text-brand-700" /> Compartir
				</h2>
				<button
					onclick={close}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>

			<div
				class="mt-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2"
			>
				<span class="flex-1 truncate text-sm text-ink-600">{url}</span>
				<button
					onclick={copyLink}
					class="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
				>
					{#if copied}
						<Check class="size-3.5" /> Copiado
					{:else}
						<Copy class="size-3.5" /> Copiar
					{/if}
				</button>
			</div>

			<div class="mt-4 grid grid-cols-3 gap-2">
				<button
					onclick={nativeShare}
					class="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 py-3 text-xs font-medium text-ink-600 hover:bg-ink-50"
				>
					<Share2 class="size-5 text-brand-700" />
					Más opciones
				</button>
				<a
					href={whatsappUrl}
					target="_blank"
					rel="noopener"
					class="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 py-3 text-xs font-medium text-ink-600 hover:bg-ink-50"
				>
					<MessageCircle class="size-5 text-brand-700" />
					WhatsApp
				</a>
				<a
					href={mailUrl}
					class="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 py-3 text-xs font-medium text-ink-600 hover:bg-ink-50"
				>
					<Mail class="size-5 text-brand-700" />
					Correo
				</a>
			</div>

			<p class="mt-4 text-xs text-ink-400">
				Compartir esta convocatoria no revela tu asistencia ni tu identidad.
			</p>
		</div>
	</div>
{/if}
