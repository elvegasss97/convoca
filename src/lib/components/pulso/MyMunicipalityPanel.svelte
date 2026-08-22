<script lang="ts">
	import { onMount } from 'svelte';
	import { MapPin, Pencil, Radar, X } from '@lucide/svelte';
	import type { MunicipalIssue, MunicipalPetition } from '$lib/types';
	import {
		getMyMunicipality,
		setMyMunicipality,
		clearMyMunicipality,
		type MyMunicipality
	} from '$lib/utils/myMunicipality';
	import MunicipalitySearchCombobox from './MunicipalitySearchCombobox.svelte';

	interface Props {
		issues: MunicipalIssue[];
		petitions: MunicipalPetition[];
		onSelectIssue: (issue: MunicipalIssue) => void;
		onSelectPetition: (petition: MunicipalPetition) => void;
	}

	let { issues, petitions, onSelectIssue, onSelectPetition }: Props = $props();

	const issueStatusLabel: Record<MunicipalIssue['status'], string> = {
		detected: 'Detectado',
		verified: 'Verificado',
		in_action: 'En actuación',
		resolved: 'Resuelto'
	};

	let mine = $state<MyMunicipality | null>(null);
	let editing = $state(false);
	let pickerIneCode = $state<string | undefined>(undefined);
	let pickerName = $state<string | undefined>(undefined);

	onMount(() => {
		mine = getMyMunicipality();
	});

	function startEditing() {
		pickerIneCode = mine?.ineCode;
		pickerName = mine?.name;
		editing = true;
	}

	function cancelEditing() {
		editing = false;
	}

	function save() {
		if (!pickerIneCode || !pickerName) return;
		const next = { ineCode: pickerIneCode, name: pickerName };
		setMyMunicipality(next);
		mine = next;
		editing = false;
	}

	function stopFollowing() {
		clearMyMunicipality();
		mine = null;
		editing = false;
	}

	type Novelty =
		| { kind: 'issue'; date: string; issue: MunicipalIssue }
		| { kind: 'petition'; date: string; petition: MunicipalPetition };

	// Problemas y peticiones ya llegan ordenados por fecha desde el servicio
	// (ver municipalService.ts); aquí solo se filtran al municipio elegido y
	// se combinan en una sola lista cronológica, sin volver a pedir datos —
	// issues/petitions ya están cargados enteros para el mapa.
	const novelties = $derived.by((): Novelty[] => {
		if (!mine) return [];
		const myIssues: Novelty[] = issues
			.filter((issue) => issue.municipalityIneCode === mine!.ineCode)
			.map((issue) => ({ kind: 'issue', date: issue.publishedAt ?? issue.detectedAt, issue }));
		const myPetitions: Novelty[] = petitions
			.filter((petition) => petition.municipalityIneCode === mine!.ineCode)
			.map((petition) => ({ kind: 'petition', date: petition.publishedAt, petition }));
		return [...myIssues, ...myPetitions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
	});
</script>

<section class="mb-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
	{#if editing}
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-ink-900">
					{mine ? 'Cambiar tu municipio' : '¿Sigues algún municipio?'}
				</p>
				<p class="mt-0.5 text-xs text-ink-600">
					Se guarda solo en este dispositivo — sin cuenta ni avisos, solo para tener antes a la
					vista lo que pasa en tu pueblo o ciudad.
				</p>
				<div class="mt-2.5 max-w-sm">
					<MunicipalitySearchCombobox
						bind:ineCode={pickerIneCode}
						bind:name={pickerName}
						idPrefix="my-municipality"
					/>
				</div>
				<div class="mt-2.5 flex items-center gap-2">
					<button
						type="button"
						onclick={save}
						disabled={!pickerIneCode}
						class="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Guardar
					</button>
					<button
						type="button"
						onclick={cancelEditing}
						class="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-white/60"
					>
						Cancelar
					</button>
				</div>
			</div>
			<button
				type="button"
				onclick={cancelEditing}
				aria-label="Cerrar"
				class="shrink-0 rounded-full p-1 text-ink-400 hover:bg-white/60 hover:text-ink-700"
			>
				<X class="size-4" />
			</button>
		</div>
	{:else if !mine}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2 text-sm text-ink-700">
				<Radar class="size-4 shrink-0 text-brand-700" />
				<span>¿Sigues algún municipio? Guárdalo para ver antes sus novedades aquí.</span>
			</div>
			<button
				type="button"
				onclick={startEditing}
				class="shrink-0 rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800"
			>
				Elegir mi municipio
			</button>
		</div>
	{:else}
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex items-center gap-2">
				<MapPin class="size-4 shrink-0 text-brand-700" />
				<p class="text-sm font-semibold text-ink-900">Tu municipio: {mine.name}</p>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onclick={startEditing}
					aria-label="Cambiar de municipio"
					class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 hover:bg-white/60 hover:text-ink-800"
				>
					<Pencil class="size-3.5" /> Cambiar
				</button>
				<button
					type="button"
					onclick={stopFollowing}
					class="rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 hover:bg-white/60 hover:text-ink-800"
				>
					Dejar de seguir
				</button>
			</div>
		</div>

		{#if novelties.length > 0}
			<ul class="mt-3 flex flex-col gap-2">
				{#each novelties as novelty (novelty.kind === 'issue' ? novelty.issue.id : novelty.petition.id)}
					<li>
						{#if novelty.kind === 'issue'}
							<button
								type="button"
								onclick={() => onSelectIssue(novelty.issue)}
								class="flex w-full items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-left text-sm transition hover:bg-white"
							>
								<span class="truncate text-ink-800">{novelty.issue.title}</span>
								<span
									class="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500"
									>{issueStatusLabel[novelty.issue.status]}</span
								>
							</button>
						{:else}
							<button
								type="button"
								onclick={() => onSelectPetition(novelty.petition)}
								class="flex w-full items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-left text-sm transition hover:bg-white"
							>
								<span class="truncate text-ink-800">{novelty.petition.title}</span>
								<span
									class="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500"
									>{novelty.petition.supportCount} apoyos</span
								>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2.5 text-xs text-ink-500">
				Sin problemas ni peticiones publicados ahí todavía — en cuanto haya algo, aparecerá aquí.
			</p>
		{/if}
	{/if}
</section>
