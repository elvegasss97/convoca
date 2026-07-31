<script lang="ts">
	import { page } from '$app/state';
	import { Compass, PlusCircle, LayoutDashboard } from '@lucide/svelte';
	import { authState } from '$lib/auth/session.svelte';
	import LocationPicker from './LocationPicker.svelte';
	import UserMenu from './UserMenu.svelte';

	const links = $derived(
		[
			{ href: '/', label: 'Descubrir', icon: Compass },
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
		<a href="/" class="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
			<span class="grid size-8 place-items-center rounded-xl bg-brand-700 text-white">
				<svg
					viewBox="0 0 24 24"
					class="size-4.5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				>
					<circle cx="12" cy="9" r="2.5" />
					<path d="M12 21c4-4.5 7-8.2 7-12A7 7 0 0 0 5 9c0 3.8 3 7.5 7 12Z" />
				</svg>
			</span>
			Convoca
		</a>

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

		<div class="ml-auto flex items-center gap-2">
			<LocationPicker />
			<a
				href={createHref}
				class="hidden items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 sm:flex"
			>
				<PlusCircle class="size-4" strokeWidth={2.25} />
				Crear convocatoria
			</a>
			<UserMenu />
		</div>
	</div>
</header>
