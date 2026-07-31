<script lang="ts">
	import { authService } from '$lib/auth/authService';
	import { AuthError } from '$lib/auth/types';

	interface Props {
		/** Ruta interna de Convoca a la que volver tras /auth/callback. */
		redirectTo: string;
		label?: string;
	}
	let { redirectTo, label = 'Continuar con Google' }: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function start() {
		if (loading) return;
		loading = true;
		error = null;
		try {
			// Si esto resuelve sin lanzar, la pestaña ya está navegando a Google
			// (redirección de página completa): no hay nada más que hacer aquí.
			await authService.signInWithGoogle(redirectTo);
		} catch (err) {
			error = err instanceof AuthError ? err.message : 'No se ha podido iniciar sesión con Google.';
			loading = false;
		}
	}
</script>

<div>
	<button
		type="button"
		onclick={start}
		disabled={loading}
		class="flex w-full items-center justify-center gap-2.5 rounded-full border border-ink-200 bg-white py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-70"
	>
		<svg class="size-4.5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
			<path
				fill="#FFC107"
				d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
			/>
			<path
				fill="#FF3D00"
				d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
			/>
		</svg>
		{loading ? 'Redirigiendo a Google…' : label}
	</button>
	{#if error}
		<p class="text-critical-600 mt-2 text-sm font-medium" role="alert">{error}</p>
	{/if}
	<p class="mt-2 text-center text-xs text-ink-400">
		Usaremos tu cuenta únicamente para identificar tu panel de organizador. Convoca no accede a tu
		Gmail ni a otros servicios de Google.
	</p>
</div>
