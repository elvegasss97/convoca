<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Mail,
		Loader2,
		CircleCheck,
		Info,
		ArrowLeft,
		KeyRound,
		Eye,
		EyeOff
	} from '@lucide/svelte';
	import { authService } from '$lib/auth/authService';
	import { supabase } from '$lib/supabase/client';
	import { ENABLE_PASSWORD_AUTH } from '$lib/config/env';

	let email = $state('');
	let submitting = $state(false);
	let sent = $state(false);

	/**
	 * Cuando la persona vuelve del enlace de recuperación que envía Supabase,
	 * `detectSessionInUrl` (activo en `$lib/supabase/client.ts`) ya ha
	 * intercambiado el token de la URL por una sesión temporal y dispara el
	 * evento `PASSWORD_RECOVERY`. En ese momento cambiamos a "elegir nueva
	 * contraseña" en vez de mostrar el formulario de solicitud.
	 */
	let recoveryMode = $state(false);
	let newPassword = $state('');
	let showPassword = $state(false);
	let confirming = $state(false);
	let confirmError = $state<string | null>(null);
	let confirmed = $state(false);

	$effect(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === 'PASSWORD_RECOVERY') recoveryMode = true;
		});
		return () => subscription.unsubscribe();
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || !email.trim()) return;
		submitting = true;
		try {
			await authService.resetPasswordForEmail(email.trim());
			sent = true;
		} finally {
			submitting = false;
		}
	}

	async function confirmNewPassword(e: SubmitEvent) {
		e.preventDefault();
		if (confirming || newPassword.length < 8) return;
		confirming = true;
		confirmError = null;
		try {
			const { error } = await supabase.auth.updateUser({ password: newPassword });
			if (error) throw error;
			confirmed = true;
		} catch {
			confirmError = 'No se ha podido actualizar la contraseña. Solicita un nuevo enlace.';
		} finally {
			confirming = false;
		}
	}
</script>

<svelte:head>
	<title>Recuperar cuenta — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	{#if !recoveryMode}
		<a
			href="/login"
			class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
		>
			<ArrowLeft class="size-4" /> Volver a iniciar sesión
		</a>
	{/if}

	<h1 class="font-display text-2xl font-semibold text-ink-900">Recuperar cuenta</h1>

	{#if recoveryMode}
		<p class="mt-1 text-sm text-ink-500">Elige una nueva contraseña para tu cuenta.</p>
		<div class="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
			{#if confirmed}
				<div class="flex flex-col items-center gap-2 py-4 text-center">
					<CircleCheck class="size-10 text-brand-600" />
					<p class="font-semibold text-ink-800">Contraseña actualizada</p>
					<p class="text-sm text-ink-600">Ya puedes iniciar sesión con tu nueva contraseña.</p>
					<button
						onclick={() => goto('/login')}
						class="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
					>
						Ir a iniciar sesión
					</button>
				</div>
			{:else}
				<form class="space-y-4" onsubmit={confirmNewPassword}>
					{#if confirmError}
						<div
							class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
							role="alert"
						>
							{confirmError}
						</div>
					{/if}
					<div>
						<label for="new-password" class="mb-1 block text-sm font-medium text-ink-700">
							Nueva contraseña
						</label>
						<div class="relative">
							<input
								id="new-password"
								type={showPassword ? 'text' : 'password'}
								autocomplete="new-password"
								bind:value={newPassword}
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
						<p class="mt-1 text-xs text-ink-400">Mínimo 8 caracteres.</p>
					</div>
					<button
						type="submit"
						disabled={confirming || newPassword.length < 8}
						class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{#if confirming}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<KeyRound class="size-4" />
						{/if}
						{confirming ? 'Guardando…' : 'Guardar nueva contraseña'}
					</button>
				</form>
			{/if}
		</div>
	{:else if !ENABLE_PASSWORD_AUTH}
		<div
			class="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-ink-100 bg-white p-6 text-center"
		>
			<Info class="size-8 text-ink-400" />
			<p class="font-semibold text-ink-800">No disponible durante la beta</p>
			<p class="text-sm text-ink-600">
				Convoca usa "Continuar con Google" mientras dure la beta, así que no hay contraseña que
				recuperar.
			</p>
			<a
				href="/login"
				class="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Ir a iniciar sesión
			</a>
		</div>
	{:else}
		<p class="mt-1 text-sm text-ink-500">
			Escribe el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
		</p>

		<div class="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
			{#if sent}
				<div class="flex flex-col items-center gap-2 py-4 text-center">
					<CircleCheck class="size-10 text-brand-600" />
					<p class="font-semibold text-ink-800">Solicitud registrada</p>
					<p class="text-sm text-ink-600">
						Si <strong>{email}</strong> corresponde a una cuenta de Convoca, recibirás un correo con un
						enlace para restablecer tu contraseña.
					</p>
					<a
						href="/login"
						class="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
					>
						Volver a iniciar sesión
					</a>
				</div>
			{:else}
				<form class="space-y-4" onsubmit={submit}>
					<div>
						<label for="email" class="mb-1 block text-sm font-medium text-ink-700"
							>Correo electrónico</label
						>
						<input
							id="email"
							type="email"
							required
							bind:value={email}
							placeholder="tucorreo@ejemplo.org"
							class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
						/>
					</div>
					<div
						class="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3.5 text-xs text-brand-800"
					>
						<Info class="mt-0.5 size-4 shrink-0" />
						Por seguridad, este mensaje aparece exista o no una cuenta con ese correo.
					</div>
					<button
						type="submit"
						disabled={submitting}
						class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{#if submitting}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<Mail class="size-4" />
						{/if}
						{submitting ? 'Enviando…' : 'Enviar instrucciones'}
					</button>
				</form>
			{/if}
		</div>
	{/if}
</div>
