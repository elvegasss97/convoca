<script lang="ts">
	import { ShieldCheck, ShieldEllipsis, Shield, Info } from '@lucide/svelte';
	import type { VerificationLevel } from '$lib/types';
	import { verificationLevelLabels } from '$lib/labels';

	interface Props {
		level: VerificationLevel;
		size?: 'sm' | 'md';
		/**
		 * false dentro de contextos ya interactivos (p. ej. una `EventCard`
		 * envuelta en `<a>`): un `<button>` anidado en un `<a>` es HTML
		 * inválido y confunde a lectores de pantalla. En esos casos se
		 * renderiza como distintivo estático sin panel de explicación — la
		 * explicación completa sigue disponible en la ficha de la
		 * convocatoria, donde el distintivo no está anidado en ningún enlace.
		 */
		interactive?: boolean;
	}

	let { level, size = 'sm', interactive = true }: Props = $props();

	const styles: Record<VerificationLevel, { classes: string; icon: typeof ShieldCheck }> = {
		none: { classes: 'bg-ink-100 text-ink-500', icon: Shield },
		identity_verified: { classes: 'bg-brand-50 text-brand-700', icon: ShieldEllipsis },
		organization_verified: { classes: 'bg-brand-100 text-brand-800', icon: ShieldCheck },
		documentation_reviewed: { classes: 'bg-brand-700 text-white', icon: ShieldCheck }
	};

	/**
	 * Explicaciones honestas: describen exactamente qué se ha comprobado y
	 * quién aporta cada dato, sin dar a entender que Convoca certifica la
	 * veracidad del contenido de la convocatoria en sí.
	 */
	const explanations: Record<VerificationLevel, string> = {
		none: 'Nadie ha verificado todavía a la persona u organización que ha publicado esta convocatoria. La información la aporta directamente quien organiza, bajo su responsabilidad.',
		identity_verified:
			'Convoca ha comprobado la identidad de la persona que creó esta convocatoria, pero no su vínculo con ninguna organización.',
		organization_verified:
			'Convoca ha comprobado tanto la identidad de quien organiza como su vínculo con la organización que dice representar.',
		documentation_reviewed:
			'Convoca ha revisado la documentación aportada por quien organiza (identidad, organización y, si aplica, comunicación previa a la autoridad competente).'
	};

	const style = $derived(styles[level]);
	const padding = $derived(size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm');

	let open = $state(false);
	const panelId = `verification-explain-${Math.random().toString(36).slice(2, 8)}`;
</script>

{#if interactive}
	<span class="relative inline-block">
		<button
			type="button"
			onclick={(event) => {
				event.stopPropagation();
				open = !open;
			}}
			aria-expanded={open}
			aria-controls={panelId}
			class="inline-flex items-center gap-1 rounded-full font-medium {style.classes} {padding} cursor-pointer transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 focus-visible:outline-none"
		>
			<style.icon class={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.5} />
			{verificationLevelLabels[level]}
			<Info class={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={2.5} aria-hidden="true" />
		</button>
		{#if open}
			<div
				id={panelId}
				role="note"
				class="absolute top-full left-0 z-20 mt-1.5 w-64 rounded-xl border border-ink-200 bg-white p-3 text-xs leading-relaxed text-ink-700 shadow-card"
			>
				{explanations[level]}
			</div>
		{/if}
	</span>
{:else}
	<span class="inline-flex items-center gap-1 rounded-full font-medium {style.classes} {padding}">
		<style.icon class={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.5} />
		{verificationLevelLabels[level]}
	</span>
{/if}
