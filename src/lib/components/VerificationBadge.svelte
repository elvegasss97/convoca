<script lang="ts">
	import { ShieldCheck, ShieldEllipsis, Shield } from '@lucide/svelte';
	import type { VerificationLevel } from '$lib/types';
	import { verificationLevelLabels } from '$lib/labels';

	interface Props {
		level: VerificationLevel;
		size?: 'sm' | 'md';
	}

	let { level, size = 'sm' }: Props = $props();

	const styles: Record<VerificationLevel, { classes: string; icon: typeof ShieldCheck }> = {
		none: { classes: 'bg-ink-100 text-ink-500', icon: Shield },
		identity_verified: { classes: 'bg-brand-50 text-brand-700', icon: ShieldEllipsis },
		organization_verified: { classes: 'bg-brand-100 text-brand-800', icon: ShieldCheck },
		documentation_reviewed: { classes: 'bg-brand-700 text-white', icon: ShieldCheck }
	};

	const style = $derived(styles[level]);
	const padding = $derived(size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm');
</script>

<span class="inline-flex items-center gap-1 rounded-full font-medium {style.classes} {padding}">
	<style.icon class={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.5} />
	{verificationLevelLabels[level]}
</span>
