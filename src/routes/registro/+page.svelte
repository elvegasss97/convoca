<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import { Eye, EyeOff, UserPlus, Loader2, AlertCircle, MailCheck, Send } from '@lucide/svelte';
	import type { OrganizerKind } from '$lib/types';
	import { organizerKindLabels } from '$lib/labels';
	import { authService } from '$lib/auth/authService';
	import { AuthError } from '$lib/auth/types';
	import { ENABLE_GOOGLE_AUTH, ENABLE_PASSWORD_AUTH } from '$lib/config/env';
	import { maskEmail } from '$lib/utils/maskEmail';
	import { safeRedirect } from '$lib/utils/safeRedirect';
	import FieldError from '$lib/components/FieldError.svelte';
	import GoogleSignInButton from '$lib/components/auth/GoogleSignInButton.svelte';

	const redirectTo = $derived(safeRedirect(page.url.searchParams.get('redirect'), '/organizador'));

	const organizerKinds = Object.entries(organizerKindLabels) as [OrganizerKind, string][];

	let displayName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let organizerKind = $state<OrganizerKind>('persona');
	let organizationName = $state('');
	let acceptedTerms = $state(false);
	let acceptedPrivacy = $state(false);
	let acceptedPeacefulUse = $state(false);
	let showPassword = $state(false);

	let submitting = $state(false);
	let showErrors = $state(false);
	let submitError = $state<string | null>(null);
	let accountExists = $state(false);
	let emailServerError = $state<string | null>(null);
	let passwordServerError = $state<string | null>(null);
	let confirmationSent = $state(false);
	/** Se congela al enviar: si el usuario reabriera el formulario, no debe cambiar bajo la pantalla de confirmación. */
	let confirmedEmail = $state('');

	let resending = $state(false);
	let resendMessage = $state<string | null>(null);
	let resendError = $state<string | null>(null);
	let resendCooldownUntil = $state(0);
	let now = $state(Date.now());
	$effect(() => {
		// Depende solo de resendCooldownUntil a propósito: leer `now` aquí
		// dentro haría que este efecto se reprogramara a sí mismo en cada
		// tick en vez de una única vez por cooldown.
		if (resendCooldownUntil <= Date.now()) return;
		const interval = setInterval(() => {
			now = Date.now();
			if (now >= resendCooldownUntil) clearInterval(interval);
		}, 1000);
		return () => clearInterval(interval);
	});
	const resendCooldownSeconds = $derived(
		Math.max(0, Math.ceil((resendCooldownUntil - now) / 1000))
	);

	const requiresOrganizationName = $derived(organizerKind !== 'persona');

	const displayNameValid = $derived(displayName.trim().length >= 3);
	const emailValid = $derived(email.trim().includes('@'));
	const passwordValid = $derived(password.length >= 8);
	const confirmPasswordValid = $derived(confirmPassword === password && password.length > 0);
	const organizationNameValid = $derived(
		!requiresOrganizationName || organizationName.trim().length > 0
	);
	const termsValid = $derived(acceptedTerms && acceptedPrivacy && acceptedPeacefulUse);

	const formValid = $derived(
		displayNameValid &&
			emailValid &&
			passwordValid &&
			confirmPasswordValid &&
			organizationNameValid &&
			termsValid
	);

	/** Primer campo inválido, en el mismo orden en que aparecen en el formulario. */
	function firstErrorFieldId(): string | null {
		if (!displayNameValid) return 'display-name';
		if (requiresOrganizationName && !organizationNameValid) return 'organization-name';
		if (!emailValid) return 'email';
		if (!passwordValid) return 'password';
		if (!confirmPasswordValid) return 'confirm-password';
		if (!acceptedTerms) return 'terms-checkbox';
		if (!acceptedPrivacy) return 'privacy-checkbox';
		if (!acceptedPeacefulUse) return 'peaceful-checkbox';
		return null;
	}

	function scrollToId(id: string) {
		requestAnimationFrame(() => {
			const el = document.getElementById(id);
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			if (el instanceof HTMLElement && typeof el.focus === 'function') {
				el.focus({ preventScroll: true });
			}
		});
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		if (!formValid) {
			showErrors = true;
			// Sin esto, si la persona ya ha bajado hasta el botón "Crear cuenta",
			// el error queda fuera de pantalla y parece que el formulario no
			// hace nada al pulsar — justo lo que se reportó.
			const id = firstErrorFieldId();
			if (id) scrollToId(id);
			return;
		}
		submitError = null;
		emailServerError = null;
		passwordServerError = null;
		accountExists = false;
		submitting = true;
		try {
			const session = await authService.signUp({
				email,
				password,
				displayName,
				organizerKind,
				organizationName: requiresOrganizationName ? organizationName : undefined,
				acceptedTerms,
				acceptedPrivacy,
				acceptedPeacefulUse
			});
			if (session) {
				await goto(redirectTo);
			} else {
				// Sin sesión activa: el proyecto exige confirmar el correo antes de
				// poder iniciar sesión. Nunca se intenta un signInWithPassword
				// automático aquí — mostrar el error de login ("correo o
				// contraseña incorrectos") en este punto sería exactamente el bug
				// reportado.
				confirmedEmail = email.trim();
				confirmationSent = true;
			}
		} catch (err) {
			if (err instanceof AuthError && err.field === 'email') {
				emailServerError = err.message;
				scrollToId('email');
			} else if (err instanceof AuthError && err.field === 'password') {
				passwordServerError = err.message;
				scrollToId('password');
			} else {
				submitError = err instanceof AuthError ? err.message : 'No se ha podido crear la cuenta.';
				accountExists = /ya existe una cuenta/i.test(submitError);
				scrollToId('submit-error-banner');
			}
		} finally {
			submitting = false;
		}
	}

	async function resendConfirmation() {
		if (resending || resendCooldownSeconds > 0) return;
		resending = true;
		resendMessage = null;
		resendError = null;
		try {
			await authService.resendSignUpConfirmation(confirmedEmail);
			resendMessage = 'Correo reenviado. Revisa también la carpeta de spam.';
			resendCooldownUntil = Date.now() + 60_000;
		} catch (err) {
			resendError = err instanceof AuthError ? err.message : 'No se ha podido reenviar el correo.';
		} finally {
			resending = false;
		}
	}
</script>

<Seo
	title="Crear cuenta de organizador"
	description="Crea tu cuenta gratuita de organizador en Convoca para publicar convocatorias ciudadanas y gestionarlas desde un único panel."
	noindex
/>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<h1 class="font-display text-2xl font-semibold text-ink-900">Crear cuenta de organizador</h1>

	{#if confirmationSent}
		<div
			class="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-brand-100 bg-brand-50 p-6 text-center"
		>
			<MailCheck class="size-10 text-brand-600" />
			<p class="font-semibold text-ink-800">Cuenta creada. Revisa tu correo para confirmarla.</p>
			<p class="text-sm text-ink-600">
				Hemos enviado un enlace de confirmación a <strong>{maskEmail(confirmedEmail)}</strong>.
				Ábrelo para activar tu cuenta y poder iniciar sesión.
			</p>

			{#if resendMessage}
				<p class="text-sm font-medium text-brand-700">{resendMessage}</p>
			{/if}
			{#if resendError}
				<p class="text-critical-600 text-sm font-medium">{resendError}</p>
			{/if}

			<button
				type="button"
				onclick={resendConfirmation}
				disabled={resending || resendCooldownSeconds > 0}
				class="mt-1 flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if resending}
					<Loader2 class="size-4 animate-spin" />
				{:else}
					<Send class="size-4" />
				{/if}
				{resendCooldownSeconds > 0
					? `Reenviar en ${resendCooldownSeconds}s`
					: 'Reenviar correo de confirmación'}
			</button>

			<a
				href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
				class="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Ir a iniciar sesión
			</a>
		</div>
	{:else if !ENABLE_PASSWORD_AUTH}
		<!-- Beta: Google es el único método público de alta. El formulario de
		     correo/contraseña sigue existiendo más abajo (rama ENABLE_PASSWORD_AUTH),
		     solo queda oculto tras la variable de entorno, no eliminado. -->
		<p class="mt-1 text-sm text-ink-500">
			Necesitas una cuenta para crear y gestionar tus convocatorias. Para descubrir eventos y
			confirmar asistencia no hace falta registrarse.
		</p>
		<div class="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
			<GoogleSignInButton {redirectTo} label="Crear cuenta con Google" />
		</div>
		<p class="mt-4 text-xs text-ink-400">
			No te pedimos DNI, dirección ni teléfono para crear la cuenta. Cualquier documentación de
			verificación adicional siempre será voluntaria y se gestionará por separado.
		</p>
	{:else}
		<p class="mt-1 text-sm text-ink-500">
			Necesitas una cuenta para crear y gestionar tus convocatorias. Para descubrir eventos y
			confirmar asistencia no hace falta registrarse.
		</p>

		<div class="mt-6 space-y-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
			{#if ENABLE_GOOGLE_AUTH}
				<GoogleSignInButton {redirectTo} label="Crear cuenta con Google" />
				<div class="flex items-center gap-3 text-xs font-medium text-ink-400">
					<span class="h-px flex-1 bg-ink-100"></span>
					o
					<span class="h-px flex-1 bg-ink-100"></span>
				</div>
			{/if}
			<form class="space-y-4" onsubmit={submit}>
				{#if submitError}
					<div
						id="submit-error-banner"
						tabindex="-1"
						class="flex flex-col gap-1.5 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
						role="alert"
					>
						<span class="flex items-start gap-2">
							<AlertCircle class="mt-0.5 size-4 shrink-0" />
							{submitError}
						</span>
						{#if accountExists}
							<span class="pl-6 text-xs">
								<a
									href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
									class="font-semibold underline">Iniciar sesión</a
								>
								·
								<a href="/recuperar-cuenta" class="font-semibold underline">Recuperar contraseña</a>
							</span>
						{/if}
					</div>
				{/if}

				<div>
					<label for="display-name" class="mb-1 block text-sm font-medium text-ink-700">
						Nombre público del organizador
					</label>
					<input
						id="display-name"
						bind:value={displayName}
						placeholder="Ej. Asociación Vecinal de tu barrio"
						aria-invalid={showErrors && !displayNameValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors && !displayNameValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					{#if showErrors && !displayNameValid}
						<FieldError message="Indica un nombre público de al menos 3 caracteres." />
					{/if}
				</div>

				<fieldset>
					<legend class="mb-1.5 text-sm font-medium text-ink-700">Tipo de organizador</legend>
					<div class="grid grid-cols-2 gap-2">
						{#each organizerKinds as [value, label] (value)}
							<button
								type="button"
								onclick={() => (organizerKind = value)}
								class="rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition {organizerKind ===
								value
									? 'border-brand-700 bg-brand-50 text-brand-800'
									: 'border-ink-100 text-ink-600 hover:border-brand-200'}"
							>
								{label}
							</button>
						{/each}
					</div>
				</fieldset>

				{#if requiresOrganizationName}
					<div>
						<label for="organization-name" class="mb-1 block text-sm font-medium text-ink-700">
							Nombre de la organización
						</label>
						<input
							id="organization-name"
							bind:value={organizationName}
							placeholder="Nombre legal o habitual de la organización"
							aria-invalid={showErrors && !organizationNameValid}
							class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
							!organizationNameValid
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
						/>
						{#if showErrors && !organizationNameValid}
							<FieldError message="Indica el nombre de la organización." />
						{/if}
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
						oninput={() => (emailServerError = null)}
						aria-invalid={(showErrors && !emailValid) || Boolean(emailServerError)}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {(showErrors && !emailValid) ||
						emailServerError
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					{#if emailServerError}
						<FieldError message={emailServerError} />
					{:else if showErrors && !emailValid}
						<FieldError message="Introduce un correo electrónico válido." />
					{/if}
				</div>

				<div>
					<label for="password" class="mb-1 block text-sm font-medium text-ink-700"
						>Contraseña</label
					>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="new-password"
							bind:value={password}
							oninput={() => (passwordServerError = null)}
							aria-invalid={(showErrors && !passwordValid) || Boolean(passwordServerError)}
							class="w-full rounded-xl pr-11 text-sm focus:ring-brand-500 {(showErrors &&
								!passwordValid) ||
							passwordServerError
								? 'border-critical-400 focus:border-critical-500'
								: 'border-ink-200 focus:border-brand-500'}"
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
					{#if passwordServerError}
						<FieldError message={passwordServerError} />
					{:else if showErrors && !passwordValid}
						<FieldError message="La contraseña debe tener al menos 8 caracteres." />
					{:else}
						<p class="mt-1 text-xs text-ink-400">Mínimo 8 caracteres.</p>
					{/if}
				</div>

				<div>
					<label for="confirm-password" class="mb-1 block text-sm font-medium text-ink-700">
						Confirma la contraseña
					</label>
					<input
						id="confirm-password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						bind:value={confirmPassword}
						aria-invalid={showErrors && !confirmPasswordValid}
						class="w-full rounded-xl text-sm focus:ring-brand-500 {showErrors &&
						!confirmPasswordValid
							? 'border-critical-400 focus:border-critical-500'
							: 'border-ink-200 focus:border-brand-500'}"
					/>
					{#if showErrors && !confirmPasswordValid}
						<FieldError message="Las contraseñas no coinciden." />
					{/if}
				</div>

				<label class="flex items-start gap-2.5 text-sm text-ink-700">
					<input
						id="terms-checkbox"
						type="checkbox"
						bind:checked={acceptedTerms}
						class="mt-0.5 size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
					/>
					Acepto las
					<a
						href="/legal/terminos"
						target="_blank"
						rel="noopener noreferrer"
						onclick={(e) => e.stopPropagation()}
						class="underline hover:text-brand-700">condiciones de uso</a
					> de Convoca.
				</label>

				<label class="flex items-start gap-2.5 text-sm text-ink-700">
					<input
						id="privacy-checkbox"
						type="checkbox"
						bind:checked={acceptedPrivacy}
						class="mt-0.5 size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
					/>
					He leído y acepto la
					<a
						href="/legal/privacidad"
						target="_blank"
						rel="noopener noreferrer"
						onclick={(e) => e.stopPropagation()}
						class="underline hover:text-brand-700">política de privacidad</a
					> de Convoca.
				</label>

				<label
					class="flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-medium text-brand-900 {showErrors &&
					!acceptedPeacefulUse
						? 'border-critical-400 bg-critical-50'
						: 'border-brand-100 bg-brand-50'}"
				>
					<input
						id="peaceful-checkbox"
						type="checkbox"
						bind:checked={acceptedPeacefulUse}
						class="mt-0.5 size-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
					/>
					Declaro que utilizaré Convoca únicamente para difundir acciones legales y pacíficas, conforme
					a la
					<a
						href="/legal/uso-pacifico"
						target="_blank"
						rel="noopener noreferrer"
						onclick={(e) => e.stopPropagation()}
						class="underline hover:text-brand-800">declaración de uso pacífico</a
					>.
				</label>
				{#if showErrors && !termsValid}
					<FieldError message="Debes aceptar las tres declaraciones para crear la cuenta." />
				{/if}

				<button
					type="submit"
					disabled={submitting}
					class="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{#if submitting}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<UserPlus class="size-4" />
					{/if}
					{submitting ? 'Creando cuenta…' : 'Crear cuenta'}
				</button>

				<p class="text-center text-sm text-ink-500">
					¿Ya tienes cuenta?
					<a
						href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
						class="font-semibold text-brand-700 hover:underline">Inicia sesión</a
					>
				</p>
			</form>
		</div>

		<p class="mt-4 text-xs text-ink-400">
			No te pedimos DNI, dirección ni teléfono para crear la cuenta. Cualquier documentación de
			verificación adicional siempre será voluntaria y se gestionará por separado.
		</p>
	{/if}
</div>
