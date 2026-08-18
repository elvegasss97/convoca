<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle, KeyRound } from '@lucide/svelte';
	import { changeStaffPassword, currentStaffAccessStep } from '$lib/auth/staffAuthService';
	import type { StaffAccessStep } from '$lib/auth/staffAccess';

	/**
	 * Paso obligatorio para cuentas creadas con contraseña temporal de un
	 * solo uso (vía la API administrativa de Supabase, nunca por
	 * invitación por correo). Tras guardar la nueva contraseña se vuelve a
	 * comprobar el estado real de la cuenta (`currentStaffAccessStep()`)
	 * en vez de asumir un destino fijo: normalmente será "enroll" (cuenta
	 * nueva, sin MFA todavía), pero si en el futuro se reutiliza este
	 * flujo para una cuenta que ya tuviera un factor configurado, debe ir
	 * a verificar/step-up, no a inscribir uno nuevo.
	 */

	const DESTINATION_BY_STEP: Record<StaffAccessStep, string> = {
		'change-password': '/acceso-interno/cambiar-contrasena',
		enroll: '/acceso-interno/configurar-mfa',
		verify: '/acceso-interno/verificar',
		proceed: '/moderacion'
	};

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const passwordsMatch = $derived(newPassword.length > 0 && newPassword === confirmPassword);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || newPassword.length < 8 || !passwordsMatch) return;
		errorMessage = null;
		submitting = true;
		try {
			await changeStaffPassword(newPassword);
			const step = await currentStaffAccessStep();
			const destination = step === 'not-staff' ? '/acceso-interno' : DESTINATION_BY_STEP[step];
			await goto(destination, { replaceState: true });
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'No se ha podido actualizar la contraseña.';
		} finally {
			submitting = false;
		}
	}
</script>

<Seo
	title="Establece tu contraseña"
	description="Establece tu contraseña definitiva para acceder al Centro de Operaciones."
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<div class="flex items-center gap-2">
		<ShieldCheck class="size-6 text-brand-700" />
		<h1 class="font-display text-2xl font-semibold text-ink-900">Establece tu contraseña</h1>
	</div>
	<p class="mt-1 text-sm text-ink-500">
		Tu cuenta se creó con una contraseña temporal de un solo uso. Antes de continuar, establece una
		definitiva.
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
			<label for="new-password" class="mb-1 block text-sm font-medium text-ink-700"
				>Nueva contraseña</label
			>
			<div class="relative">
				<input
					id="new-password"
					type={showPassword ? 'text' : 'password'}
					autocomplete="new-password"
					bind:value={newPassword}
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
			<p class="mt-1 text-xs text-ink-400">Mínimo 8 caracteres.</p>
		</div>

		<div>
			<label for="confirm-password" class="mb-1 block text-sm font-medium text-ink-700"
				>Repite la contraseña</label
			>
			<input
				id="confirm-password"
				type={showPassword ? 'text' : 'password'}
				autocomplete="new-password"
				bind:value={confirmPassword}
				required
				class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
			/>
			{#if confirmPassword.length > 0 && !passwordsMatch}
				<p class="text-critical-600 mt-1 text-xs">Las contraseñas no coinciden.</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={submitting || newPassword.length < 8 || !passwordsMatch}
			class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{#if submitting}
				<Loader2 class="size-4 animate-spin" />
			{:else}
				<KeyRound class="size-4" />
			{/if}
			{submitting ? 'Guardando…' : 'Guardar y continuar'}
		</button>
	</form>
</div>
