<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from '@lucide/svelte';
	import { authService } from '$lib/auth/authService';
	import { AuthError } from '$lib/auth/types';
	import { ENABLE_GOOGLE_AUTH, ENABLE_PASSWORD_AUTH } from '$lib/config/env';
	import { safeRedirect } from '$lib/utils/safeRedirect';
	import GoogleSignInButton from '$lib/components/auth/GoogleSignInButton.svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let rememberSession = $state(true);
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const redirectTo = $derived(safeRedirect(page.url.searchParams.get('redirect'), '/organizador'));
	// La escucha ciudadana y "Tú eliges el próximo bloque" son los únicos
	// flujos, hoy, que traen aquí a alguien que no busca gestionar
	// convocatorias: el texto de acceso debe reflejar por qué llega, no
	// asumir que todo el mundo es organizador.
	const isListeningContext = $derived(redirectTo.startsWith('/pulso/escucha/'));
	const isNextBlockVoteContext = $derived(redirectTo === '/pulso/proximo-bloque');

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
</script>

<Seo
	title="Iniciar sesión"
	description={isNextBlockVoteContext
		? 'Accede para confirmar tu elección en la votación de Pulso ciudadano.'
		: isListeningContext
			? 'Accede para guardar tu participación en la escucha ciudadana de Convoca.'
			: 'Accede a tu cuenta de organizador en Convoca para publicar y gestionar tus convocatorias.'}
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	{#if isNextBlockVoteContext}
		<h1 class="font-display text-2xl font-semibold text-ink-900">
			Accede para confirmar tu elección
		</h1>
		<p class="mt-1 text-sm text-ink-500">
			Utilizamos una cuenta para evitar votos duplicados y permitirte cambiar tu elección más
			adelante.
		</p>
	{:else if isListeningContext}
		<h1 class="font-display text-2xl font-semibold text-ink-900">
			Accede para guardar tu participación
		</h1>
		<p class="mt-1 text-sm text-ink-500">
			Necesitamos identificar una cuenta para evitar respuestas duplicadas y permitirte modificar tu
			participación más adelante.
		</p>
	{:else}
		<h1 class="font-display text-2xl font-semibold text-ink-900">Iniciar sesión</h1>
		<p class="mt-1 text-sm text-ink-500">
			Accede a tu cuenta de organizador para crear y gestionar convocatorias.
		</p>
	{/if}

	<div class="mt-6 space-y-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
		{#if ENABLE_GOOGLE_AUTH}
			<GoogleSignInButton
				{redirectTo}
				helperText={isNextBlockVoteContext
					? 'Después de acceder volverás aquí con tu selección.'
					: isListeningContext
						? 'Después de acceder volverás a la escucha con tus respuestas.'
						: undefined}
			/>
		{/if}

		{#if ENABLE_GOOGLE_AUTH && ENABLE_PASSWORD_AUTH}
			<div class="flex items-center gap-3 text-xs font-medium text-ink-400">
				<span class="h-px flex-1 bg-ink-100"></span>
				o
				<span class="h-px flex-1 bg-ink-100"></span>
			</div>
		{/if}

		{#if ENABLE_PASSWORD_AUTH}
			<form class="space-y-4" onsubmit={submit}>
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
					<label for="password" class="mb-1 block text-sm font-medium text-ink-700"
						>Contraseña</label
					>
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
						class="font-semibold text-brand-700 hover:underline"
						>{isListeningContext || isNextBlockVoteContext
							? 'Crear cuenta'
							: 'Crea una convocatoria'}</a
					>
				</p>
			</form>
		{/if}
	</div>
</div>
