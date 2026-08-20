<script lang="ts">
	import { CheckCircle2, ExternalLink, MapPin, Radar, X as XIcon } from '@lucide/svelte';
	import {
		reviewDetectedMunicipalIssue,
		type DetectedMunicipalIssueForModeration
	} from '$lib/services/municipalRadarModerationService';
	import type { MunicipalEvidenceLevel, MunicipalIssueCategory } from '$lib/types';

	let { items = $bindable() }: { items: DetectedMunicipalIssueForModeration[] } = $props();
	let busyId = $state<string | null>(null);

	const categoryLabels: Record<MunicipalIssueCategory, string> = {
		limpieza: 'Limpieza',
		movilidad: 'Movilidad',
		espacio_publico: 'Espacio público',
		vivienda: 'Vivienda',
		accesibilidad: 'Accesibilidad',
		seguridad: 'Seguridad',
		medioambiente: 'Medioambiente',
		servicios_publicos: 'Servicios públicos',
		equipamientos: 'Equipamientos',
		otro: 'Otro'
	};

	const evidenceLabels: Record<MunicipalEvidenceLevel, string> = {
		low: 'Evidencia baja',
		medium: 'Evidencia media',
		high: 'Evidencia alta'
	};

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(iso)
		);
	}

	async function review(item: DetectedMunicipalIssueForModeration, action: 'publish' | 'dismiss') {
		if (action === 'dismiss') {
			const confirmed = confirm(
				'¿Descartar este hallazgo? Seguirá conservado internamente con sus fuentes, pero no se publicará.'
			);
			if (!confirmed) return;
		}

		busyId = item.id;
		try {
			await reviewDetectedMunicipalIssue(item.id, action);
			items = items.filter((candidate) => candidate.id !== item.id);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'No se ha podido revisar el hallazgo.');
		} finally {
			busyId = null;
		}
	}
</script>

<div>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<Radar class="size-5 text-brand-700" />
				<h3 class="font-display text-base font-semibold text-ink-900">
					Radar municipal — por revisar
				</h3>
			</div>
			<p class="mt-1 max-w-3xl text-sm leading-relaxed text-ink-500">
				Nada de esta cola es público. Publicar exige revisión humana, una fuente y ubicación
				municipal canónica; la decisión queda auditada.
			</p>
		</div>
		<span class="rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700">
			{items.length} pendiente{items.length === 1 ? '' : 's'}
		</span>
	</div>

	{#if items.length === 0}
		<div
			class="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-10 text-center"
		>
			<p class="text-sm font-medium text-ink-600">No hay hallazgos pendientes de revisión.</p>
			<p class="mt-1 text-xs text-ink-400">
				El radar puede seguir recopilando sin publicar automáticamente.
			</p>
		</div>
	{:else}
		<div class="mt-4 space-y-4">
			{#each items as item (item.id)}
				<article class="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2 text-xs">
								<span class="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
									{categoryLabels[item.category]}
								</span>
								<span class="rounded-full bg-ink-100 px-2.5 py-1 font-medium text-ink-600">
									{evidenceLabels[item.evidenceLevel]}
								</span>
								<span class="text-ink-400">Detectado {formatDate(item.detectedAt)}</span>
							</div>
							<h4 class="mt-2 font-display text-lg font-semibold text-ink-900">{item.title}</h4>
							<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
								<span class="inline-flex items-center gap-1">
									<MapPin class="size-3.5" />
									{item.municipalityName}
								</span>
								{#if item.municipalityIneCode}
									<span>INE {item.municipalityIneCode}</span>
								{:else}
									<span class="text-critical-600 font-semibold">Sin código INE</span>
								{/if}
								{#if item.competenceLabel}<span>· {item.competenceLabel}</span>{/if}
							</div>
						</div>
					</div>

					<p class="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-700">
						{item.summary}
					</p>

					<div class="mt-4 grid gap-4 lg:grid-cols-2">
						<div class="rounded-xl bg-ink-50 p-3.5">
							<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
								Fuentes ({item.sources.length})
							</p>
							{#if item.sources.length === 0}
								<p class="text-critical-600 mt-2 text-sm">Sin fuente: no se puede publicar.</p>
							{:else}
								<ul class="mt-2 space-y-2">
									{#each item.sources as source (source.id)}
										<li>
											<a
												href={source.url}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-start gap-1.5 text-sm font-medium text-brand-700 hover:underline"
											>
												<span>{source.title}</span>
												<ExternalLink class="mt-0.5 size-3.5 shrink-0" />
											</a>
											{#if source.publisher}
												<p class="mt-0.5 text-xs text-ink-400">{source.publisher}</p>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>

						<div class="rounded-xl bg-ink-50 p-3.5">
							<p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
								Posibles vías
							</p>
							{#if item.suggestions.length === 0}
								<p class="mt-2 text-sm text-ink-400">Todavía no hay vías propuestas.</p>
							{:else}
								<ol class="mt-2 space-y-1.5 text-sm text-ink-700">
									{#each item.suggestions as suggestion (suggestion.id)}
										<li>{suggestion.position}. {suggestion.text}</li>
									{/each}
								</ol>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
						<button
							type="button"
							disabled={busyId === item.id ||
								item.sources.length === 0 ||
								!item.municipalityIneCode}
							onclick={() => review(item, 'publish')}
							class="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
						>
							<CheckCircle2 class="size-4" />
							{busyId === item.id ? 'Procesando…' : 'Verificar y publicar'}
						</button>
						<button
							type="button"
							disabled={busyId === item.id}
							onclick={() => review(item, 'dismiss')}
							class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
						>
							<XIcon class="size-4" /> Descartar
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
