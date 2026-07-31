<script lang="ts">
	import { Mail, Loader2, CircleCheck, Info, ArrowLeft } from '@lucide/svelte';
	import { authService } from '$lib/auth/authService';

	let email = $state('');
	let submitting = $state(false);
	let sent = $state(false);

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
</script>

<svelte:head>
	<title>Recuperar cuenta — Convoca</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-10 sm:px-6">
	<a
		href="/login"
		class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
	>
		<ArrowLeft class="size-4" /> Volver a iniciar sesión
	</a>

	<h1 class="font-display text-2xl font-semibold text-ink-900">Recuperar cuenta</h1>
	<p class="mt-1 text-sm text-ink-500">
		Escribe el correo de tu cuenta y te explicamos cómo sigue el proceso.
	</p>

	<div class="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
		{#if sent}
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<CircleCheck class="size-10 text-brand-600" />
				<p class="font-semibold text-ink-800">Solicitud registrada</p>
				<p class="text-sm text-ink-600">
					En esta fase de prototipo no se envía ningún correo real. Cuando Convoca se conecte a
					Supabase, recibirás en <strong>{email}</strong> un enlace para restablecer tu contraseña de
					forma segura.
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
					class="flex items-start gap-2 rounded-2xl border border-warning-300 bg-warning-50 p-3.5 text-xs text-warning-700"
				>
					<Info class="mt-0.5 size-4 shrink-0" />
					Esto es una simulación: en esta fase mock no se envía ningún correo real. El envío real se activará
					al conectar Supabase Auth.
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
</div>
