<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		LayoutDashboard,
		PlusCircle,
		UserRound,
		LogOut,
		ShieldCheck,
		ChevronDown
	} from '@lucide/svelte';
	import { authState } from '$lib/auth/session.svelte';
	import { authService } from '$lib/auth/authService';

	let open = $state(false);

	const initials = $derived((authState.session?.user.email ?? '??').slice(0, 2).toUpperCase());

	async function signOut() {
		open = false;
		await authService.signOut();
		await goto('/');
	}

	function close() {
		open = false;
	}
</script>

{#if authState.session}
	<div class="relative">
		<button
			type="button"
			onclick={() => (open = !open)}
			class="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pr-2.5 pl-1 shadow-sm hover:border-brand-300 hover:bg-brand-50"
			aria-haspopup="menu"
			aria-expanded={open}
		>
			<span
				class="grid size-7 place-items-center rounded-full bg-brand-700 text-xs font-semibold text-white"
			>
				{initials}
			</span>
			<span class="hidden max-w-32 truncate text-sm font-medium text-ink-700 sm:inline">
				{authState.session.user.email}
			</span>
			<ChevronDown class="size-3.5 text-ink-400" />
		</button>

		{#if open}
			<button class="fixed inset-0 z-30 cursor-default" aria-label="Cerrar menú" onclick={close}
			></button>
			<div
				role="menu"
				class="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-card-hover"
			>
				{#if authState.session.user.role === 'organizer'}
					<a
						href="/organizador"
						onclick={close}
						class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
					>
						<LayoutDashboard class="size-4 text-ink-400" /> Mi panel
					</a>
					<a
						href="/crear"
						onclick={close}
						class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
					>
						<PlusCircle class="size-4 text-ink-400" /> Crear convocatoria
					</a>
				{:else if authState.session.user.role === 'moderator' || authState.session.user.role === 'admin'}
					<a
						href="/moderacion"
						onclick={close}
						class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
					>
						<ShieldCheck class="size-4 text-ink-400" /> Panel de moderación
					</a>
				{/if}
				<a
					href="/cuenta"
					onclick={close}
					class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-brand-50"
				>
					<UserRound class="size-4 text-ink-400" /> Mi cuenta
				</a>
				<div class="my-1 border-t border-ink-100"></div>
				<button
					type="button"
					onclick={signOut}
					class="text-critical-600 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-critical-50"
				>
					<LogOut class="size-4" /> Cerrar sesión
				</button>
			</div>
		{/if}
	</div>
{:else}
	<a
		href="/login"
		class="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 shadow-sm hover:bg-ink-50"
	>
		Iniciar sesión
	</a>
{/if}
