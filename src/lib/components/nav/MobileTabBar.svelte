<script lang="ts">
	import { page } from '$app/state';
	import {
		Compass,
		Map,
		Activity,
		PlusCircle,
		LayoutDashboard,
		ShieldCheck,
		LogIn,
		Sparkles
	} from '@lucide/svelte';
	import { authState } from '$lib/auth/session.svelte';

	const search = $derived(page.url.search);

	const createHref = $derived(
		authState.session ? '/crear' : `/login?redirect=${encodeURIComponent('/crear')}`
	);

	/** Cuarto hueco, según la sesión: acceder, panel del organizador o moderación. */
	const fourthItem = $derived.by(() => {
		const role = authState.session?.user.role;
		if (role === 'organizer') {
			return {
				href: '/organizador',
				label: 'Panel',
				icon: LayoutDashboard,
				match: (p: string) => p.startsWith('/organizador')
			};
		}
		if (role === 'moderator' || role === 'admin') {
			return {
				href: '/moderacion',
				label: 'Moderar',
				icon: ShieldCheck,
				match: (p: string) => p.startsWith('/moderacion')
			};
		}
		return {
			href: '/login',
			label: 'Acceder',
			icon: LogIn,
			match: (p: string) => p.startsWith('/login') || p.startsWith('/registro')
		};
	});

	const items = $derived([
		{
			href: '/',
			label: 'Proyecto',
			icon: Sparkles,
			match: (p: string) => p === '/',
			accent: false
		},
		{
			href: '/descubrir',
			label: 'Descubrir',
			icon: Compass,
			match: (p: string, s: string) => p.startsWith('/descubrir') && !s.includes('vista=mapa'),
			accent: false
		},
		{
			href: '/descubrir?vista=mapa',
			label: 'Mapa',
			icon: Map,
			match: (p: string, s: string) => p.startsWith('/descubrir') && s.includes('vista=mapa'),
			accent: false
		},
		{
			href: '/pulso',
			label: 'Pulso',
			icon: Activity,
			match: (p: string) => p.startsWith('/pulso'),
			accent: false
		},
		{
			href: createHref,
			label: 'Crear',
			icon: PlusCircle,
			match: (p: string) => p.startsWith('/crear'),
			accent: true
		},
		{ ...fourthItem, accent: false }
	]);
</script>

<nav
	class="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden"
	aria-label="Navegación principal"
>
	<div class="mx-auto flex max-w-lg items-stretch justify-between px-2">
		{#each items as item (item.label)}
			{@const active = item.match(page.url.pathname, search)}
			<a
				href={item.href}
				class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition"
				aria-current={active ? 'page' : undefined}
			>
				{#if item.accent}
					<span
						class="-mt-4 mb-0.5 grid size-11 place-items-center rounded-full bg-accent-500 text-white shadow-card"
					>
						<item.icon class="size-5.5" strokeWidth={2.25} />
					</span>
				{:else}
					<item.icon
						class="size-5"
						strokeWidth={2.25}
						color={active ? 'var(--color-brand-700)' : 'var(--color-ink-400)'}
					/>
				{/if}
				<span class={active ? 'text-brand-700' : item.accent ? 'text-accent-600' : 'text-ink-500'}
					>{item.label}</span
				>
			</a>
		{/each}
	</div>
</nav>
