<script lang="ts">
	import { Loader2, MapPin, Search } from '@lucide/svelte';
	import {
		loadMunicipalitiesCatalog,
		municipalityById,
		searchMunicipalities,
		type Municipality
	} from '$lib/data/municipios';
	import { provinceByCode } from '$lib/data/provinceCodes';
	import { nextActiveIndex } from '$lib/utils/comboboxNav';

	interface Props {
		/** Código INE del municipio elegido (5 dígitos), o undefined si no hay selección. */
		ineCode: string | undefined;
		/** Nombre del municipio elegido — se mantiene en sync con `ineCode`. */
		name: string | undefined;
		idPrefix?: string;
	}

	let { ineCode = $bindable(), name = $bindable(), idPrefix = 'municipality' }: Props = $props();

	const inputId = `${idPrefix}-input`;
	const listboxId = `${idPrefix}-listbox`;
	function optionId(i: number) {
		return `${idPrefix}-option-${i}`;
	}

	function labelFor(m: Municipality): string {
		const province = provinceByCode[m.provinceCode]?.name ?? m.provinceCode;
		return `${m.name} — ${province}`;
	}

	let query = $state(name ?? '');
	let catalog = $state<Municipality[] | null>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let open = $state(false);
	let activeIndex = $state(-1);

	// Si el municipio llega desde fuera (p. ej. al restaurar un borrador),
	// refleja su nombre en el campo de texto sin abrir el desplegable.
	$effect(() => {
		if (!open) query = name ?? '';
	});

	const results = $derived(catalog ? searchMunicipalities(catalog, query, 50) : []);

	async function ensureCatalogLoaded() {
		if (catalog || loading) return;
		loading = true;
		loadError = null;
		try {
			catalog = await loadMunicipalitiesCatalog();
			// Si ya había un código seleccionado (borrador restaurado) pero el
			// nombre no llegó a guardarse por algún motivo, se recupera aquí.
			if (ineCode && !name) {
				const found = municipalityById(catalog, ineCode);
				if (found) name = found.name;
			}
		} catch {
			loadError = 'No se ha podido cargar el listado de municipios. Inténtalo de nuevo.';
		} finally {
			loading = false;
		}
	}

	function onFocus() {
		open = true;
		activeIndex = -1;
		ensureCatalogLoaded();
	}

	function onInput(value: string) {
		query = value;
		open = true;
		activeIndex = -1;
		// Escribir invalida la selección previa hasta que se confirme una
		// nueva (clic o Enter) — evita enviar un código que ya no corresponde
		// al texto visible.
		if (ineCode) {
			ineCode = undefined;
			name = undefined;
		}
	}

	function select(m: Municipality) {
		ineCode = m.ineCode;
		name = m.name;
		query = m.name;
		open = false;
		activeIndex = -1;
	}

	function close() {
		open = false;
		activeIndex = -1;
		// Sin selección confirmada, no se deja un texto suelto sin sentido.
		if (!ineCode) query = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			if (!open) {
				open = true;
				ensureCatalogLoaded();
				return;
			}
			activeIndex = nextActiveIndex(activeIndex, e.key, results.length);
			return;
		}
		if (e.key === 'Enter') {
			if (open && activeIndex >= 0 && results[activeIndex]) {
				e.preventDefault();
				select(results[activeIndex]);
			} else if (open && results.length === 1) {
				e.preventDefault();
				select(results[0]);
			}
			return;
		}
		if (e.key === 'Escape') {
			if (open) {
				e.preventDefault();
				close();
			}
		}
	}
</script>

<div class="relative">
	<label for={inputId} class="sr-only">Buscar municipio</label>
	<div class="relative">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
		/>
		<input
			id={inputId}
			type="text"
			role="combobox"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-autocomplete="list"
			aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
			autocomplete="off"
			value={query}
			oninput={(e) => onInput(e.currentTarget.value)}
			onfocus={onFocus}
			onblur={close}
			onkeydown={onKeydown}
			placeholder="Escribe el nombre de tu municipio…"
			class="w-full rounded-xl border-ink-200 pl-9 text-sm focus:border-brand-500 focus:ring-brand-500"
		/>
	</div>

	{#if open}
		<!-- onmousedown con preventDefault (no onclick) para que el blur del
		     input no cierre la lista antes de que la selección se registre. -->
		<ul
			id={listboxId}
			role="listbox"
			aria-label="Municipios"
			onmousedown={(e) => e.preventDefault()}
			class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink-200 bg-white py-1 shadow-card-hover"
		>
			{#if loading}
				<li class="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-400">
					<Loader2 class="size-3.5 animate-spin" /> Cargando municipios…
				</li>
			{:else if loadError}
				<li class="text-critical-600 px-3 py-2.5 text-sm">{loadError}</li>
			{:else if query.trim().length === 0}
				<li class="px-3 py-2.5 text-sm text-ink-400">Escribe al menos una letra para buscar.</li>
			{:else if results.length === 0}
				<li class="px-3 py-2.5 text-sm text-ink-400">Ningún municipio coincide con "{query}".</li>
			{:else}
				{#each results as m, i (m.ineCode)}
					<li
						id={optionId(i)}
						role="option"
						aria-selected={i === activeIndex}
						onmousedown={() => select(m)}
						onmouseenter={() => (activeIndex = i)}
						class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm {i === activeIndex
							? 'bg-brand-50 text-brand-800'
							: 'text-ink-700'}"
					>
						<MapPin class="size-3.5 shrink-0 text-ink-400" />
						<span class="truncate">{labelFor(m)}</span>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
