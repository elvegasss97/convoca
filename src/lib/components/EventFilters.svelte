<script lang="ts">
	import { Search, SlidersHorizontal, X, ShieldCheck } from '@lucide/svelte';
	import type {
		DateFilter,
		DistanceFilter,
		EventCategory,
		EventFiltersState,
		EventTheme
	} from '$lib/types';
	import { categoryLabels, themeLabels } from '$lib/labels';
	import { DEFAULT_FILTERS } from '$lib/types';

	interface Props {
		filters: EventFiltersState;
		resultsCount: number;
	}

	let { filters = $bindable(), resultsCount }: Props = $props();

	let sheetOpen = $state(false);

	const dateOptions: { value: DateFilter; label: string }[] = [
		{ value: 'any', label: 'Cualquier fecha' },
		{ value: 'today', label: 'Hoy' },
		{ value: 'this_weekend', label: 'Este fin de semana' },
		{ value: 'next_7_days', label: 'Próximos 7 días' },
		{ value: 'next_30_days', label: 'Próximos 30 días' }
	];

	const distanceOptions: { value: DistanceFilter; label: string }[] = [
		{ value: null, label: 'Cualquier distancia' },
		{ value: 1, label: 'Menos de 1 km' },
		{ value: 5, label: 'Menos de 5 km' },
		{ value: 10, label: 'Menos de 10 km' },
		{ value: 25, label: 'Menos de 25 km' },
		{ value: 50, label: 'Menos de 50 km' }
	];

	const categories = Object.entries(categoryLabels) as [EventCategory, string][];
	const themes = Object.entries(themeLabels) as [EventTheme, string][];

	function toggleCategory(cat: EventCategory) {
		filters.categories = filters.categories.includes(cat)
			? filters.categories.filter((c) => c !== cat)
			: [...filters.categories, cat];
	}

	function toggleTheme(theme: EventTheme) {
		filters.themes = filters.themes.includes(theme)
			? filters.themes.filter((t) => t !== theme)
			: [...filters.themes, theme];
	}

	function resetFilters() {
		filters = { ...DEFAULT_FILTERS, query: filters.query };
	}

	const activeCount = $derived(
		(filters.date !== 'any' ? 1 : 0) +
			(filters.distanceKm ? 1 : 0) +
			filters.categories.length +
			filters.themes.length +
			(filters.verifiedOnly ? 1 : 0)
	);
</script>

<div class="space-y-2.5">
	<div class="flex gap-2">
		<div class="relative flex-1">
			<Search
				class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400"
			/>
			<input
				type="search"
				bind:value={filters.query}
				placeholder="Buscar por título o ciudad…"
				class="w-full rounded-full border-ink-200 bg-white py-2.5 pr-3 pl-10 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
			/>
		</div>
		<button
			type="button"
			onclick={() => (sheetOpen = true)}
			class="relative flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-medium text-ink-700 shadow-sm hover:bg-ink-50"
		>
			<SlidersHorizontal class="size-4" />
			Filtros
			{#if activeCount > 0}
				<span
					class="absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full bg-accent-500 text-[10px] font-bold text-white"
				>
					{activeCount}
				</span>
			{/if}
		</button>
	</div>

	<div class="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
		<button
			type="button"
			onclick={() => (filters.date = filters.date === 'today' ? 'any' : 'today')}
			class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.date ===
			'today'
				? 'border-brand-700 bg-brand-700 text-white'
				: 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}"
		>
			Hoy
		</button>
		<button
			type="button"
			onclick={() => (filters.date = filters.date === 'this_weekend' ? 'any' : 'this_weekend')}
			class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.date ===
			'this_weekend'
				? 'border-brand-700 bg-brand-700 text-white'
				: 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}"
		>
			Este finde
		</button>
		<button
			type="button"
			onclick={() => (filters.verifiedOnly = !filters.verifiedOnly)}
			class="flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.verifiedOnly
				? 'border-brand-700 bg-brand-700 text-white'
				: 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}"
		>
			<ShieldCheck class="size-3.5" /> Verificadas
		</button>
		{#each themes.slice(0, 6) as [value, label] (value)}
			<button
				type="button"
				onclick={() => toggleTheme(value)}
				class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.themes.includes(
					value
				)
					? 'border-brand-700 bg-brand-700 text-white'
					: 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}"
			>
				{label}
			</button>
		{/each}
	</div>

	<p class="text-xs text-ink-400">
		{resultsCount} convocatoria{resultsCount === 1 ? '' : 's'} encontrada{resultsCount === 1
			? ''
			: 's'}
	</p>
</div>

{#if sheetOpen}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm sm:items-center"
	>
		<button class="absolute inset-0" aria-label="Cerrar filtros" onclick={() => (sheetOpen = false)}
		></button>
		<div
			class="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-card-hover sm:rounded-3xl"
		>
			<div class="flex items-center justify-between border-b border-ink-100 px-5 py-4">
				<h2 class="font-display text-lg font-semibold text-ink-900">Filtros</h2>
				<button
					onclick={() => (sheetOpen = false)}
					class="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"
					aria-label="Cerrar"
				>
					<X class="size-5" />
				</button>
			</div>

			<div class="flex-1 space-y-6 overflow-y-auto px-5 py-4">
				<fieldset>
					<legend class="mb-2 text-sm font-semibold text-ink-800">Fecha</legend>
					<div class="flex flex-wrap gap-1.5">
						{#each dateOptions as opt (opt.value)}
							<button
								type="button"
								onclick={() => (filters.date = opt.value)}
								class="rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.date ===
								opt.value
									? 'border-brand-700 bg-brand-700 text-white'
									: 'border-ink-200 text-ink-600 hover:bg-ink-50'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</fieldset>

				<fieldset>
					<legend class="mb-2 text-sm font-semibold text-ink-800">Distancia desde tu ciudad</legend>
					<div class="flex flex-wrap gap-1.5">
						{#each distanceOptions as opt (opt.label)}
							<button
								type="button"
								onclick={() => (filters.distanceKm = opt.value)}
								class="rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.distanceKm ===
								opt.value
									? 'border-brand-700 bg-brand-700 text-white'
									: 'border-ink-200 text-ink-600 hover:bg-ink-50'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</fieldset>

				<fieldset>
					<legend class="mb-2 text-sm font-semibold text-ink-800">Tipo de acción</legend>
					<div class="flex flex-wrap gap-1.5">
						{#each categories as [value, label] (value)}
							<button
								type="button"
								onclick={() => toggleCategory(value)}
								class="rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.categories.includes(
									value
								)
									? 'border-brand-700 bg-brand-700 text-white'
									: 'border-ink-200 text-ink-600 hover:bg-ink-50'}"
							>
								{label}
							</button>
						{/each}
					</div>
				</fieldset>

				<fieldset>
					<legend class="mb-2 text-sm font-semibold text-ink-800">Temática</legend>
					<div class="flex flex-wrap gap-1.5">
						{#each themes as [value, label] (value)}
							<button
								type="button"
								onclick={() => toggleTheme(value)}
								class="rounded-full border px-3 py-1.5 text-xs font-medium transition {filters.themes.includes(
									value
								)
									? 'border-brand-700 bg-brand-700 text-white'
									: 'border-ink-200 text-ink-600 hover:bg-ink-50'}"
							>
								{label}
							</button>
						{/each}
					</div>
				</fieldset>

				<label class="flex items-center gap-2.5 text-sm font-medium text-ink-800">
					<input
						type="checkbox"
						bind:checked={filters.verifiedOnly}
						class="size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
					/>
					Mostrar solo convocatorias con algún nivel de verificación
				</label>
			</div>

			<div class="flex items-center gap-2 border-t border-ink-100 px-5 py-4">
				<button
					type="button"
					onclick={resetFilters}
					class="flex-1 rounded-full border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
				>
					Limpiar
				</button>
				<button
					type="button"
					onclick={() => (sheetOpen = false)}
					class="flex-1 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
				>
					Ver {resultsCount} resultado{resultsCount === 1 ? '' : 's'}
				</button>
			</div>
		</div>
	</div>
{/if}
