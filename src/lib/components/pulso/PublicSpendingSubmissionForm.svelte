<script lang="ts">
	import { page } from '$app/state';
	import {
		AlertCircle,
		ArrowRight,
		CircleCheck,
		FileSearch,
		Link2,
		LogIn,
		MessageSquareText,
		SearchCheck,
		ShieldCheck
	} from '@lucide/svelte';
	import { authState } from '$lib/auth/session.svelte';
	import {
		isValidPublicSourceUrl,
		submitPublicSpendingSubmission
	} from '$lib/services/publicSpendingService';

	let title = $state('');
	let details = $state('');
	let amountText = $state('');
	let managingOrganization = $state('');
	let territory = $state('');
	let sourceUrl1 = $state('');
	let sourceUrl2 = $state('');
	let sourceUrl3 = $state('');
	let publicInfoConfirmed = $state(false);

	let showErrors = $state(false);
	let submitting = $state(false);
	let submitted = $state(false);
	let submitError = $state<string | null>(null);

	const providedSources = $derived(
		[sourceUrl1, sourceUrl2, sourceUrl3].map((value) => value.trim()).filter(Boolean)
	);
	const sourcesValid = $derived(
		providedSources.length >= 1 && providedSources.every(isValidPublicSourceUrl)
	);
	const formValid = $derived(
		title.trim().length >= 5 && details.trim().length >= 20 && sourcesValid && publicInfoConfirmed
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		showErrors = true;
		if (!formValid || submitting) return;
		submitting = true;
		submitError = null;
		try {
			await submitPublicSpendingSubmission({
				title,
				details,
				amountText,
				managingOrganization,
				territory,
				sourceUrls: providedSources
			});
			submitted = true;
		} catch (error) {
			submitError =
				error instanceof Error
					? error.message
					: 'No se ha podido enviar la pista. Inténtalo de nuevo.';
		} finally {
			submitting = false;
		}
	}

	function reset() {
		title = '';
		details = '';
		amountText = '';
		managingOrganization = '';
		territory = '';
		sourceUrl1 = '';
		sourceUrl2 = '';
		sourceUrl3 = '';
		publicInfoConfirmed = false;
		showErrors = false;
		submitted = false;
		submitError = null;
	}
</script>

<div class="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
	<div
		class="submission-heading relative isolate overflow-hidden bg-brand-950 px-5 py-7 text-white sm:px-8"
	>
		<div class="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"></div>
		<div class="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="max-w-3xl">
				<p
					class="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-300 uppercase"
				>
					<MessageSquareText class="size-4" /> Auditoría ciudadana
				</p>
				<h2 class="mt-2 font-display text-2xl font-semibold sm:text-3xl">
					¿Tienes dudas sobre alguna partida?
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-brand-100 sm:text-base">
					Pásanos la información que tengas. Revisaremos las fuentes, seguiremos el expediente y, si
					hay base documental, lo convertiremos en una investigación verificable.
				</p>
			</div>
			<div class="hidden grid-cols-3 gap-1.5 sm:grid">
				<span class="process-step"><Link2 class="size-4" /> Pista</span>
				<span class="process-step"><SearchCheck class="size-4" /> Auditoría</span>
				<span class="process-step"><FileSearch class="size-4" /> Ficha</span>
			</div>
		</div>
	</div>

	{#if !authState.session}
		<div class="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
			<div>
				<h3 class="font-display text-lg font-semibold text-ink-900">Tu pista queda privada</h3>
				<p class="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
					Necesitamos una cuenta para evitar abuso y poder conservar el estado de la investigación.
					La aportación no aparece públicamente ni se atribuye a tu perfil.
				</p>
			</div>
			<a
				href={`/login?redirect=${encodeURIComponent(`${page.url.pathname}#aporta`)}`}
				class="inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
			>
				<LogIn class="size-4" /> Iniciar sesión o crear cuenta
			</a>
		</div>
	{:else if submitted}
		<div class="flex flex-col items-center px-5 py-10 text-center sm:px-8">
			<span
				class="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700"
			>
				<CircleCheck class="size-7" />
			</span>
			<h3 class="mt-4 font-display text-xl font-semibold text-ink-900">Pista recibida</h3>
			<p class="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
				Entrará en triaje editorial. Que se investigue no presupone que exista irregularidad:
				primero comprobaremos el documento, el estado del dinero y el contexto completo.
			</p>
			<button
				type="button"
				onclick={reset}
				class="mt-5 inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
			>
				Enviar otra pista <ArrowRight class="size-3.5" />
			</button>
		</div>
	{:else}
		<form onsubmit={submit} class="grid gap-7 p-5 sm:p-8 lg:grid-cols-[1fr_0.72fr]" novalidate>
			<div class="space-y-4">
				{#if submitError}
					<div
						class="flex items-start gap-2 rounded-2xl border border-critical-300 bg-critical-50 p-3.5 text-sm text-critical-700"
						role="alert"
					>
						<AlertCircle class="mt-0.5 size-4 shrink-0" />
						{submitError}
					</div>
				{/if}

				<div>
					<label for="spending-title" class="field-label">¿Qué partida te genera dudas?</label>
					<input
						id="spending-title"
						bind:value={title}
						maxlength="160"
						placeholder="P. ej. Contrato de obras, subvención o programa público"
						aria-invalid={showErrors && title.trim().length < 5}
						class="field-control"
					/>
					{#if showErrors && title.trim().length < 5}
						<p class="field-error">Escribe un título de al menos 5 caracteres.</p>
					{/if}
				</div>

				<div>
					<label for="spending-details" class="field-label">Qué quieres que comprobemos</label>
					<textarea
						id="spending-details"
						bind:value={details}
						rows="6"
						maxlength="3000"
						placeholder="Cuéntanos qué cifra has visto, qué no encaja o qué parte del recorrido quieres localizar."
						aria-invalid={showErrors && details.trim().length < 20}
						class="field-control"></textarea>
					<div class="mt-1 flex justify-between gap-3 text-xs">
						{#if showErrors && details.trim().length < 20}
							<p class="field-error mt-0">Escribe al menos 20 caracteres.</p>
						{:else}
							<span></span>
						{/if}
						<span class="text-ink-400">{details.length}/3000</span>
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="spending-amount" class="field-label">
							Importe <span class="field-optional">(opcional)</span>
						</label>
						<input
							id="spending-amount"
							bind:value={amountText}
							maxlength="120"
							placeholder="P. ej. 2,4 M€ o desconocido"
							class="field-control"
						/>
					</div>
					<div>
						<label for="spending-territory" class="field-label">
							Territorio <span class="field-optional">(opcional)</span>
						</label>
						<input
							id="spending-territory"
							bind:value={territory}
							maxlength="160"
							placeholder="Municipio, comunidad o España"
							class="field-control"
						/>
					</div>
				</div>

				<div>
					<label for="spending-manager" class="field-label">
						Organismo o entidad <span class="field-optional">(opcional)</span>
					</label>
					<input
						id="spending-manager"
						bind:value={managingOrganization}
						maxlength="200"
						placeholder="Ayuntamiento, ministerio, empresa adjudicataria…"
						class="field-control"
					/>
				</div>
			</div>

			<aside class="rounded-3xl border border-ink-200 bg-ink-50 p-4 sm:p-5">
				<p
					class="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-700 uppercase"
				>
					<Link2 class="size-4" /> Fuentes para empezar
				</p>
				<p class="mt-2 text-xs leading-relaxed text-ink-500">
					Añade al menos un enlace público: BOE, portal de contratación, resolución, presupuesto,
					acta o página institucional. Una publicación en redes puede servir como pista adicional.
				</p>

				<div class="mt-4 space-y-3">
					<div>
						<label for="spending-source-1" class="field-label">Fuente 1</label>
						<input
							id="spending-source-1"
							type="url"
							bind:value={sourceUrl1}
							maxlength="1500"
							placeholder="https://…"
							aria-invalid={showErrors &&
								(!sourceUrl1.trim() || !isValidPublicSourceUrl(sourceUrl1))}
							class="field-control bg-white"
						/>
					</div>
					<div>
						<label for="spending-source-2" class="field-label">
							Fuente 2 <span class="field-optional">(opcional)</span>
						</label>
						<input
							id="spending-source-2"
							type="url"
							bind:value={sourceUrl2}
							maxlength="1500"
							placeholder="https://…"
							class="field-control bg-white"
						/>
					</div>
					<div>
						<label for="spending-source-3" class="field-label">
							Fuente 3 <span class="field-optional">(opcional)</span>
						</label>
						<input
							id="spending-source-3"
							type="url"
							bind:value={sourceUrl3}
							maxlength="1500"
							placeholder="https://…"
							class="field-control bg-white"
						/>
					</div>
					{#if showErrors && !sourcesValid}
						<p class="field-error">
							Añade al menos una URL http(s) válida y revisa las opcionales.
						</p>
					{/if}
				</div>

				<label
					class="mt-5 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs leading-relaxed {showErrors &&
					!publicInfoConfirmed
						? 'border-critical-300 bg-critical-50'
						: 'border-brand-100 bg-white'}"
				>
					<input
						type="checkbox"
						bind:checked={publicInfoConfirmed}
						class="mt-0.5 size-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
					/>
					<span class="text-ink-600">
						Confirmo que he compartido información pública y no he incluido domicilios, teléfonos,
						documentos de identidad ni otros datos personales innecesarios.
					</span>
				</label>

				<div class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
					<ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />
					<p>
						No se publica automáticamente. El equipo separará hechos, preguntas e hipótesis antes de
						investigar.
					</p>
				</div>

				<button
					type="submit"
					disabled={submitting}
					class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
				>
					{submitting ? 'Enviando…' : 'Enviar para investigar'}
					{#if !submitting}<ArrowRight class="size-4" />{/if}
				</button>
			</aside>
		</form>
	{/if}
</div>

<style>
	.submission-heading::after {
		position: absolute;
		right: -5rem;
		bottom: -8rem;
		z-index: -10;
		width: 18rem;
		height: 18rem;
		border-radius: 9999px;
		background: rgb(62 183 162 / 0.24);
		filter: blur(45px);
		content: '';
	}

	.process-step {
		display: flex;
		min-width: 4.5rem;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgb(255 255 255 / 0.12);
		border-radius: 1rem;
		background: rgb(255 255 255 / 0.08);
		padding: 0.65rem 0.55rem;
		font-size: 0.65rem;
		font-weight: 650;
		color: var(--color-brand-100);
	}

	.field-label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--color-ink-700);
	}

	.field-optional {
		font-weight: 400;
		color: var(--color-ink-400);
	}

	.field-control {
		width: 100%;
		border-color: var(--color-ink-200);
		border-radius: 0.75rem;
		font-size: 0.84rem;
	}

	.field-control:focus {
		border-color: var(--color-brand-500);
		--tw-ring-color: var(--color-brand-500);
	}

	.field-control[aria-invalid='true'] {
		border-color: var(--color-critical-400);
	}

	.field-error {
		margin-top: 0.3rem;
		font-size: 0.7rem;
		color: var(--color-critical-600);
	}
</style>
