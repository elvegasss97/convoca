<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { Menu, Radar, Users, X as XIcon } from '@lucide/svelte';
	import { supabase } from '$lib/supabase/client';

	export interface OperationsNavItem {
		key: string;
		label: string;
		icon: Component;
		badge?: number;
		badgeTone?: 'warning' | 'critical';
	}

	export interface OperationsNavGroup {
		label: string;
		items: OperationsNavItem[];
	}

	let {
		groups,
		activeKey = $bindable()
	}: {
		groups: OperationsNavGroup[];
		activeKey: string;
	} = $props();

	let mobileOpen = $state(false);
	let triggerEl = $state<HTMLButtonElement | undefined>(undefined);
	let closeButtonEl = $state<HTMLButtonElement | undefined>(undefined);
	let registeredUsers = $state<number | null>(null);
	let registeredUsersLoaded = $state(false);

	onMount(async () => {
		const { count, error } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true });

		if (!error) registeredUsers = count ?? 0;
		registeredUsersLoaded = true;
	});

	function select(key: string) {
		activeKey = key;
		mobileOpen = false;
	}

	function closeDrawer() {
		mobileOpen = false;
		triggerEl?.focus();
	}

	function handleDrawerKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeDrawer();
	}

	$effect(() => {
		if (mobileOpen) closeButtonEl?.focus();
	});

	const activeLabel = $derived.by(() => {
		for (const group of groups) {
			const item = group.items.find((i) => i.key === activeKey);
			if (item) return item.label;
		}
		return '';
	});

	function badgeClasses(tone: OperationsNavItem['badgeTone']): string {
		return tone === 'critical'
			? 'bg-critical-100 text-critical-700'
			: 'bg-warning-100 text-warning-700';
	}
</script>

{#snippet navList(items: OperationsNavItem[], onSelect: (key: string) => void)}
	<div class="mt-1 space-y-0.5">
		{#each items as item (item.key)}
			<button
				type="button"
				onclick={() => onSelect(item.key)}
				aria-current={activeKey === item.key ? 'page' : undefined}
				class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition {activeKey ===
				item.key
					? 'bg-brand-50 text-brand-800'
					: 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}"
			>
				<item.icon class="size-4 shrink-0" />
				<span class="min-w-0 flex-1 leading-tight">{item.label}</span>
				{#if item.badge}
					<span
						class="shrink-0 rounded-full {badgeClasses(item.badgeTone)} px-1.5 text-xs font-bold"
						>{item.badge}</span
					>
				{/if}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet registeredUsersCard()}
	<div class="rounded-2xl border border-ink-100 bg-white p-4">
		<div class="flex items-center gap-2 text-ink-500">
			<Users class="size-4 text-brand-700" />
			<p class="text-xs font-medium">Usuarios registrados</p>
		</div>
		{#if !registeredUsersLoaded}
			<p class="mt-1 font-display text-2xl font-semibold text-ink-300">—</p>
		{:else if registeredUsers === null}
			<p class="mt-1 text-sm text-ink-400">Sin datos</p>
		{:else}
			<p class="mt-1 font-display text-2xl font-semibold text-ink-900">{registeredUsers}</p>
		{/if}
	</div>
{/snippet}

{#snippet radarLink()}
	<a
		href="/moderacion/radar"
		class="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
	>
		<Radar class="size-4 shrink-0" />
		<span class="min-w-0 flex-1 leading-tight">Radar municipal</span>
	</a>
{/snippet}

<nav aria-label="Secciones del Centro de Operaciones" class="hidden w-60 shrink-0 lg:block">
	<div class="sticky top-4 space-y-5">
		{@render registeredUsersCard()}
		{#each groups as group (group.label)}
			<div>
				<p class="px-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">{group.label}</p>
				{@render navList(group.items, select)}
			</div>
		{/each}
		<div>
			<p class="px-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">Territorio</p>
			{@render radarLink()}
		</div>
	</div>
</nav>

<div class="space-y-3 lg:hidden">
	{@render registeredUsersCard()}
	<button
		bind:this={triggerEl}
		type="button"
		onclick={() => (mobileOpen = true)}
		aria-haspopup="dialog"
		aria-expanded={mobileOpen}
		aria-controls="operations-nav-drawer"
		class="flex w-full items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm font-semibold text-ink-900"
	>
		<span class="flex min-w-0 items-center gap-2">
			<Menu class="size-4 shrink-0" />
			<span class="leading-tight">{activeLabel}</span>
		</span>
		<span class="shrink-0 text-xs font-medium text-brand-700">Cambiar sección</span>
	</button>
</div>

{#if mobileOpen}
	<div class="fixed inset-0 z-50 lg:hidden">
		<button class="absolute inset-0 bg-ink-950/40" aria-label="Cerrar menú" onclick={closeDrawer}
		></button>
		<div
			id="operations-nav-drawer"
			role="dialog"
			aria-modal="true"
			aria-label="Secciones del Centro de Operaciones"
			onkeydown={handleDrawerKeydown}
			tabindex="-1"
			class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-card-hover"
		>
			<div class="flex items-center justify-between">
				<h2 class="font-display text-base font-semibold text-ink-900">Secciones</h2>
				<button
					bind:this={closeButtonEl}
					type="button"
					onclick={closeDrawer}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar menú"
				>
					<XIcon class="size-5" />
				</button>
			</div>
			<div class="mt-3 space-y-5">
				{#each groups as group (group.label)}
					<div>
						<p class="px-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
							{group.label}
						</p>
						{@render navList(group.items, select)}
					</div>
				{/each}
				<div>
					<p class="px-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">Territorio</p>
					{@render radarLink()}
				</div>
			</div>
		</div>
	</div>
{/if}
