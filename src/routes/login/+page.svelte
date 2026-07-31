<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Info } from '@lucide/svelte';
	import { authService } from '$lib/auth/authService';
	import { AuthError } from '$lib/auth/types';
	import { ENABLE_DEV_TOOLS } from '$lib/config/env';
	import type { DemoAccountSeed } from 'convoca:demo-accounts';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let rememberSession = $state(true);
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const redirectTo = $derived(page.url.searchParams.get('redirect') || '/organizador');

	// Import dinámico y condicionado: si ENABLE_DEV_TOOLS es `false` en el
	// build (siempre lo es en producción), esta rama se elimina entera y ni
	// el email ni la contraseña de demostración llegan al bundle.
	let demoAccounts = $state<DemoAccountSeed[]>([]);
	let demoPassword = $state('');
	if (ENABLE_DEV_TOOLS) {
		import('convoca:demo-accounts').then((mod) => {
			demoAccounts = mod.DEMO_ACCOUNTS;
			demoPassword = mod.DEMO_PASSWORD;
		});
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		errorMessage = null;
		submitting = true;
		try {
			await authService.signInWithPassword({ email, password, rememberSession });
			await goto(redirectTo);
		} catch (err) {
			errorMessage = err instanceof AuthError ? err.message : 'No se ha podido iniciar sesión.';
		} finally {
			submitting = false;
		}
	}

	function fillDemo(demoEmail: string) {
		email = demoEmail;
		password = demoPassword;
	}
</script>

<svelte:head>
	<title>Iniciar sesión — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<h1 class="font-display text-2xl font-semibold text-ink-900">Iniciar sesión</h1>
	<p class="mt-1 text-sm text-ink-500">
		Accede a tu cuenta de organizador para crear y gestionar convocatorias.
	</p>

	<form
		class="mt-6 space-y-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
		onsubmit={submit}
	>
		{#if errorMessage}
			<div
				class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
				role="alert"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
				{errorMessage}
			</div>
		{/if}

		<div>
			<label for="email" class="mb-1 block text-sm font-medium text-ink-700"
				>Correo electrónico</label
			>
			<input
				id="email"
				type="email"
				autocomplete="email"
				bind:value={email}
				required
				placeholder="tucorreo@ejemplo.org"
				class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			/>
		</div>

		<div>
			<label for="password" class="mb-1 block text-sm font-medium text-ink-700">Contraseña</label>
			<div class="relative">
				<input
					id="password"
					type={showPassword ? 'text' : 'password'}
					autocomplete="current-password"
					bind:value={password}
					required
					placeholder="••••••••"
					class="w-full rounded-xl border-ink-200 pr-11 text-sm focus:border-brand-500 focus:ring-brand-500"
				/>
				<button
					type="button"
					onclick={() => (showPassword = !showPassword)}
					class="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 hover:text-ink-700"
					aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
				>
					{#if showPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
				</button>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<label class="flex items-center gap-2 text-sm text-ink-600">
				<input
					type="checkbox"
					bind:checked={rememberSession}
					class="size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
				/>
				Recordar sesión
			</label>
			<a href="/recuperar-cuenta" class="text-sm font-medium text-brand-700 hover:underline">
				¿Olvidaste tu contraseña?
			</a>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{#if submitting}
				<Loader2 class="size-4 animate-spin" />
			{:else}
				<LogIn class="size-4" />
			{/if}
			{submitting ? 'Entrando…' : 'Iniciar sesión'}
		</button>

		<p class="text-center text-sm text-ink-500">
			¿Todavía no tienes cuenta?
			<a
				href={`/registro?redirect=${encodeURIComponent(redirectTo)}`}
				class="font-semibold text-brand-700 hover:underline">Crea una convocatoria</a
			>
		</p>
	</form>

	{#if ENABLE_DEV_TOOLS && demoAccounts.length > 0}
		<div
			class="text-warning-800 mt-6 rounded-2xl border border-warning-300 bg-warning-50 p-4 text-xs"
		>
			<p class="flex items-center gap-1.5 font-semibold">
				<Info class="size-3.5" /> Cuentas de demostración (solo en desarrollo)
			</p>
			<ul class="mt-2 space-y-1.5">
				{#each demoAccounts as demo (demo.email)}
					<li class="flex items-center justify-between gap-2">
						<span>{demo.label}: <code class="rounded bg-white/60 px-1">{demo.email}</code></span>
						<button
							type="button"
							onclick={() => fillDemo(demo.email)}
							class="text-warning-800 shrink-0 rounded-full bg-white px-2.5 py-1 font-semibold shadow-sm hover:bg-warning-100"
						>
							Usar
						</button>
					</li>
				{/each}
			</ul>
			<p class="mt-2">
				Contraseña para todas: <code class="rounded bg-white/60 px-1">{demoPassword}</code>
			</p>
		</div>
	{/if}
</div>
