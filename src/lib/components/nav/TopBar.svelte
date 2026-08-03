<script lang="ts">
	import { page } from '$app/state';
	import { Compass, PlusCircle, LayoutDashboard, Activity, Sparkles } from '@lucide/svelte';
	import { authState } from '$lib/auth/session.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import LocationPicker from './LocationPicker.svelte';
	import UserMenu from './UserMenu.svelte';

	interface Props {
		/** En páginas de referencia (p. ej. /legal/*) esconde lo que no pinta ahí: selector de ciudad y CTA de crear. */
		minimal?: boolean;
	}

	let { minimal = false }: Props = $props();

	const links = $derived(
		[
			{ href: '/', label: 'El proyecto', icon: Sparkles },
			{ href: '/descubrir', label: 'Descubrir', icon: Compass },
			{ href: '/pulso', label: 'Pulso ciudadano', icon: Activity },
			authState.session?.user.role === 'organizer'
				? { href: '/organizador', label: 'Panel del organizador', icon: LayoutDashboard }
				: null
		].filter((l): l is { href: string; label: string; icon: typeof Compass } => l !== null)
	);

	const createHref = $derived(
		authState.session ? '/crear' : `/login?redirect=${encodeURIComponent('/crear')}`
	);

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<header class="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/90 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
		<a href="/" class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
			<BrandMark class="size-8" />
			<span>
				<span class="text-[#FF7101]">C</span><span class="text-[#016548]">onvo</span><span
					class="text-[#FF7101]">c</span
				><span class="text-[#016548]">a</span>
			</span>
		</a>

		{#if !minimal}
			<nav class="ml-4 hidden items-center gap-1 md:flex">
				{#each links as link (link.href)}
					<a
						href={link.href}
						class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition {isActive(
							link.href
						)
							? 'bg-brand-100 text-brand-800'
							: 'text-ink-600 hover:bg-ink-100'}"
					>
						<link.icon class="size-4" strokeWidth={2.25} />
						{link.label}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="ml-auto flex items-center gap-2">
			{#if !minimal}
				<LocationPicker />
				<a
					href={createHref}
					class="hidden items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 sm:flex"
				>
					<PlusCircle class="size-4" strokeWidth={2.25} />
					Crear convocatoria
				</a>
			{/if}
			<UserMenu />
		</div>
	</div>
</header>
