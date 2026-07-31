<script lang="ts">
	import { Globe, Mail } from '@lucide/svelte';
	import type { Organizer, VerificationLevel } from '$lib/types';
	import { organizerKindLabels } from '$lib/labels';
	import VerificationBadge from './VerificationBadge.svelte';

	interface Props {
		organizer: Organizer;
		verificationLevel: VerificationLevel;
	}

	let { organizer, verificationLevel }: Props = $props();

	const initials = $derived(
		organizer.displayName
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
	);
</script>

<div class="rounded-2xl border border-ink-100 bg-white p-4">
	<div class="flex items-start gap-3">
		<div
			class="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-base font-semibold text-brand-800"
		>
			{initials}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate font-display text-base font-semibold text-ink-900">
				{organizer.displayName}
			</p>
			<p class="text-xs text-ink-500">{organizerKindLabels[organizer.kind]}</p>
		</div>
		<VerificationBadge level={verificationLevel} />
	</div>

	{#if organizer.bio}
		<p class="mt-3 text-sm leading-relaxed text-ink-600">{organizer.bio}</p>
	{/if}

	<div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
		<span>{organizer.publishedEventsCount} convocatorias publicadas</span>
		{#if organizer.website}
			<a href={organizer.website} class="flex items-center gap-1 text-brand-700 hover:underline">
				<Globe class="size-3.5" /> Web
			</a>
		{/if}
		{#if organizer.contactEmail}
			<a
				href={`mailto:${organizer.contactEmail}`}
				class="flex items-center gap-1 text-brand-700 hover:underline"
			>
				<Mail class="size-3.5" /> Contacto
			</a>
		{/if}
	</div>

	<p class="mt-3 border-t border-ink-100 pt-2 text-[11px] text-ink-400">
		Estos son los datos públicos del organizador. La documentación de verificación es privada y solo
		la revisa el equipo de moderación.
	</p>
</div>
