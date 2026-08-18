<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { Eye, EyeOff, LogIn, Loader2, AlertCircle, ShieldCheck } from '@lucide/svelte';
	import { signInStaff } from '$lib/auth/staffAuthService';
	import type { StaffAccessStep } from '$lib/auth/staffAccess';

	/**
	 * Formulario de correo+contraseña exclusivo de personal autorizado. A
	 * propósito NO hay ningún enlace de "crear cuenta": esta pantalla nunca
	 * registra cuentas nuevas — las cuentas de staff se crean con
	 * contraseña temporal vía la API administrativa de Supabase (nunca por
	 * invitación por correo, para evitar depender de la configuración de
	 * redirección de Supabase), y cualquier ascenso posterior sigue siendo
	 * manual (SQL Editor), nunca desde aquí.
	 */

	const DESTINATION_BY_STEP: Record<StaffAccessStep, string> = {
		'change-password': '/acceso-interno/cambiar-contrasena',
		enroll: '/acceso-interno/configurar-mfa',
		verify: '/acceso-interno/verificar',
		proceed: '/moderacion'
	};

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		errorMessage = null;
		submitting = true;
		try {
			const step = await signInStaff(email, password);
			await goto(DESTINATION_BY_STEP[step], { replaceState: true });
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'No se ha podido iniciar sesión.';
		} finally {
			submitting = false;
		}
	}
</script>

<Seo
	title="Acceso interno"
	description="Acceso exclusivo para personal autorizado de Convoca."
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">Acceso interno</h1>
	</div>
	<p class="mt-1 text-sm text-ink-500">
		Pantalla exclusiva para personal autorizado de Convoca. Si buscas acceder como organizador o
		ciudadano, <a href="/login" class="font-medium text-brand-700 hover:underline"
			>inicia sesión aquí</a
		>.
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
			{submitting ? 'Entrando…' : 'Entrar'}
		</button>
	</form>
</div>
