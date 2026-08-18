<script lang="ts">
	import { MapPin, Search } from '@lucide/svelte';
	import { filterByQuery } from '$lib/utils/textSearch';
	import { nextActiveIndex } from '$lib/utils/comboboxNav';

	interface Props {
		/** Provincia elegida, o undefined si no hay selección. */
		value: string | undefined;
		/** Las 52 provincias/ciudades autónomas — ya en memoria, sin carga diferida (a diferencia de municipios). */
		options: string[];
		idPrefix?: string;
	}

	let { value = $bindable(), options, idPrefix = 'province' }: Props = $props();

	const inputId = `${idPrefix}-input`;
	const listboxId = `${idPrefix}-listbox`;
	function optionId(i: number) {
		return `${idPrefix}-option-${i}`;
	}

	let query = $state(value ?? '');
	let open = $state(false);
	let activeIndex = $state(-1);

	// Si el valor llega desde fuera (p. ej. borrador restaurado, o al
	// cambiar de ámbito y volver), refleja el nombre en el campo sin abrir
	// el desplegable.
	$effect(() => {
		if (!open) query = value ?? '';
	});

	const results = $derived(filterByQuery(options, query, (o) => o, 50));

	function onFocus() {
		open = true;
		activeIndex = -1;
	}

	function onInput(next: string) {
		query = next;
		open = true;
		activeIndex = -1;
		if (value) value = undefined;
	}

	function select(option: string) {
		value = option;
		query = option;
		open = false;
		activeIndex = -1;
	}

	function close() {
		open = false;
		activeIndex = -1;
		if (!value) query = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			if (!open) {
				open = true;
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
	<label for={inputId} class="sr-only">Buscar provincia o ciudad autónoma</label>
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
			placeholder="Escribe el nombre de tu provincia…"
			class="w-full rounded-xl border-ink-200 pl-9 text-sm focus:border-brand-500 focus:ring-brand-500"
		/>
	</div>

	{#if open}
		<!-- onmousedown con preventDefault (no onclick) para que el blur del
		     input no cierre la lista antes de que la selección se registre. -->
		<ul
			id={listboxId}
			role="listbox"
			aria-label="Provincias y ciudades autónomas"
			onmousedown={(e) => e.preventDefault()}
			class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink-200 bg-white py-1 shadow-card-hover"
		>
			{#if query.trim().length === 0}
				<li class="px-3 py-2.5 text-sm text-ink-400">Escribe al menos una letra para buscar.</li>
			{:else if results.length === 0}
				<li class="px-3 py-2.5 text-sm text-ink-400">Ninguna provincia coincide con "{query}".</li>
			{:else}
				{#each results as option, i (option)}
					<li
						id={optionId(i)}
						role="option"
						aria-selected={i === activeIndex}
						onmousedown={() => select(option)}
						onmouseenter={() => (activeIndex = i)}
						class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm {i === activeIndex
							? 'bg-brand-50 text-brand-800'
							: 'text-ink-700'}"
					>
						<MapPin class="size-3.5 shrink-0 text-ink-400" />
						<span class="truncate">{option}</span>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>
