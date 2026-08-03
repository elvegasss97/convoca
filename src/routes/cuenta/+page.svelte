<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import {
		LogOut,
		Trash2,
		ShieldAlert,
		ShieldCheck,
		Save,
		Loader2,
		AlertCircle,
		CircleCheck
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import { userRoleLabels, organizerKindLabels } from '$lib/labels';
	import { authService } from '$lib/auth/authService';
	import { formatEventDate } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	let displayName = $state(data.organizer?.displayName ?? '');
	let organizationName = $state(data.privateProfile?.legalOrganizationName ?? '');

	let savingProfile = $state(false);
	let saveMessage = $state<string | null>(null);
	let saveError = $state<string | null>(null);

	let signingOut = $state(false);

	let deleteOpen = $state(false);
	let deleting = $state(false);

	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		if (savingProfile) return;
		savingProfile = true;
		saveMessage = null;
		saveError = null;
		try {
			await authService.updateDisplayName(displayName, organizationName);
			saveMessage = 'Datos actualizados.';
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'No se han podido guardar los cambios.';
		} finally {
			savingProfile = false;
		}
	}

	async function signOut() {
		signingOut = true;
		await authService.signOut();
		await goto('/descubrir');
	}

	async function confirmDelete() {
		deleting = true;
		try {
			await authService.deleteAccount();
			await goto('/descubrir');
		} finally {
			deleting = false;
			deleteOpen = false;
		}
	}
</script>

<Seo
	title="Mi cuenta"
	description="Gestiona los datos de tu cuenta de organizador en Convoca."
	noindex
/>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
	<h1 class="font-display text-2xl font-semibold text-ink-900">Mi cuenta</h1>
	<p class="mt-1 text-sm text-ink-500">Consulta y edita los datos de tu cuenta de organizador.</p>

	<section class="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
		<h2 class="font-display text-lg font-semibold text-ink-900">Datos de la cuenta</h2>
		<dl class="mt-3 space-y-2 text-sm">
			<div class="flex justify-between gap-3">
				<dt class="text-ink-500">Correo electrónico</dt>
				<dd class="font-medium text-ink-800">{data.session.user.email}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt class="text-ink-500">Tipo de cuenta</dt>
				<dd class="font-medium text-ink-800">{userRoleLabels[data.session.user.role]}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt class="text-ink-500">Cuenta creada</dt>
				<dd class="font-medium text-ink-800">{formatEventDate(data.session.user.createdAt)}</dd>
			</div>
		</dl>

		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="mb-1.5 text-sm font-medium text-ink-700">Estado de verificación</p>
			{#if data.session.user.emailVerified}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800"
				>
					<ShieldCheck class="size-3.5" /> Correo verificado
				</span>
			{:else}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600"
				>
					<ShieldAlert class="size-3.5" /> Cuenta sin verificar
				</span>
				<p class="mt-1.5 text-xs text-ink-400">
					La verificación de correo (y, más adelante, de identidad y organización) se activará al
					conectar Supabase Auth. No inventamos una verificación que todavía no existe.
				</p>
			{/if}
		</div>
	</section>

	{#if data.organizer}
		<section class="mt-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
			<h2 class="font-display text-lg font-semibold text-ink-900">Perfil público de organizador</h2>
			<p class="mt-1 text-xs text-ink-400">
				Estos datos son visibles para cualquier persona en tus convocatorias. El nombre de la
				organización (si lo indicas) es privado y solo tú lo ves aquí.
			</p>

			<form class="mt-3 space-y-3" onsubmit={saveProfile}>
				{#if saveError}
					<div
						class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3 text-sm text-critical-700"
					>
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						{saveError}
					</div>
				{/if}
				{#if saveMessage}
					<div
						class="flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800"
					>
						<CircleCheck class="mt-0.5 size-4 shrink-0" />
						{saveMessage}
					</div>
				{/if}

				<div>
					<label for="display-name" class="mb-1 block text-sm font-medium text-ink-700">
						Nombre público
					</label>
					<input
						id="display-name"
						bind:value={displayName}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="organization-name" class="mb-1 block text-sm font-medium text-ink-700">
						Nombre de la organización <span class="font-normal text-ink-400"
							>(privado, opcional)</span
						>
					</label>
					<input
						id="organization-name"
						bind:value={organizationName}
						class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
					/>
				</div>
				<p class="text-xs text-ink-400">
					Tipo de organizador: {organizerKindLabels[data.organizer.kind]} (no se puede cambiar en esta
					fase).
				</p>

				<button
					type="submit"
					disabled={savingProfile}
					class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-70"
				>
					{#if savingProfile}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<Save class="size-4" />
					{/if}
					Guardar cambios
				</button>
			</form>
		</section>
	{/if}

	<section class="mt-4 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
		<h2 class="font-display text-lg font-semibold text-ink-900">Privacidad y seguridad</h2>
		<ul class="mt-2 space-y-1.5 text-sm text-ink-600">
			<li>
				Esta es una autenticación de prototipo: la sesión y la cuenta se guardan solo en este
				navegador (localStorage), no en un servidor.
			</li>
			<li>Tu contraseña nunca se guarda en texto plano ni aparece en los registros de la app.</li>
			<li>
				La documentación de verificación nunca se guarda en localStorage: solo vive en memoria
				durante esta sesión.
			</li>
			<li>Nadie más puede ver ni administrar las convocatorias creadas por tu cuenta.</li>
		</ul>
	</section>

	<section class="mt-4 flex flex-col gap-2 sm:flex-row">
		<button
			type="button"
			onclick={signOut}
			disabled={signingOut}
			class="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-70"
		>
			<LogOut class="size-4" />
			Cerrar sesión
		</button>
		<button
			type="button"
			onclick={() => (deleteOpen = true)}
			class="text-critical-600 flex flex-1 items-center justify-center gap-1.5 rounded-full border border-critical-300 px-5 py-2.5 text-sm font-semibold hover:bg-critical-50"
		>
			<Trash2 class="size-4" />
			Eliminar cuenta
		</button>
	</section>
</div>

{#if deleteOpen}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar" onclick={() => (deleteOpen = false)}
		></button>
		<div
			class="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-card-hover sm:rounded-3xl"
		>
			<h2 class="font-display text-lg font-semibold text-ink-900">¿Eliminar tu cuenta?</h2>
			<p class="mt-2 text-sm text-ink-600">
				Se borrarán tu cuenta y tu perfil público de organizador de este navegador. Las
				convocatorias que hayas creado dejarán de estar asociadas a tu cuenta. Esta acción no afecta
				a ninguna otra cuenta ni a sus convocatorias.
			</p>
			<div class="mt-4 flex gap-2">
				<button
					type="button"
					onclick={() => (deleteOpen = false)}
					class="flex-1 rounded-full border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
				>
					Cancelar
				</button>
				<button
					type="button"
					onclick={confirmDelete}
					disabled={deleting}
					class="flex-1 rounded-full bg-critical-500 py-2.5 text-sm font-semibold text-white hover:bg-critical-700 disabled:opacity-70"
				>
					{deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
				</button>
			</div>
		</div>
	</div>
{/if}
