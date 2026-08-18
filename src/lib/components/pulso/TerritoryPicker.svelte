<script lang="ts" generics="T extends string">
	import { concernScopeTypeLabels } from '$lib/labels';
	import { autonomousCommunities, provinces } from '$lib/data/regions';
	import {
		resetScopeOnTypeChange,
		scopeIsMunicipio,
		scopeNeedsValue,
		unifiedCommunityName
	} from '$lib/utils/territoryScope';
	import MunicipalitySearchCombobox from './MunicipalitySearchCombobox.svelte';
	import ProvinceSearchCombobox from './ProvinceSearchCombobox.svelte';

	// Genérico en T (por defecto se infiere ConcernScopeType) para que Voz
	// abierta pueda reutilizar este mismo selector con un 5º valor
	// ('multiple', "no se limita a un único lugar") sin ensanchar
	// ConcernScopeType — ese tipo lo usan `concerns`/`concern_proposals`,
	// cuyo esquema en base de datos NO admite ese valor.
	interface Props {
		scopeType: T;
		scopeValue: string | undefined;
		/**
		 * Código INE del municipio elegido (5 dígitos), solo relevante cuando
		 * scopeType es 'municipio'. Opcional: los usos que no lo enlazan (p. ej.
		 * `concerns`/`concern_proposals`, cuyo esquema solo tiene `scope_value`
		 * de texto) siguen funcionando igual que antes, solo que ahora buscando
		 * sobre el catálogo completo de municipios en vez de 12 ciudades fijas.
		 */
		municipalityCode?: string | undefined;
		/** id/name base para los <select>/combobox, evita colisiones cuando hay varios en la misma página. */
		idPrefix?: string;
		/** Ámbitos ofrecidos, en el orden en que se muestran. Por defecto los 4 de ConcernScopeType. */
		availableTypes?: T[];
		/** Etiquetas por ámbito. Por defecto concernScopeTypeLabels. */
		labels?: Record<T, string>;
	}

	let {
		scopeType = $bindable(),
		scopeValue = $bindable(),
		municipalityCode = $bindable(undefined),
		idPrefix = 'territory',
		availableTypes = ['nacional', 'comunidad_autonoma', 'provincia', 'municipio'] as T[],
		labels = concernScopeTypeLabels as unknown as Record<T, string>
	}: Props = $props();

	// El nombre de comunidad autónoma se unifica aquí (ver comentario de
	// unifiedCommunityName): Baleares usa "Illes Balears" en los dos niveles
	// en vez de "Islas Baleares" a nivel de comunidad e "Illes Balears" a
	// nivel de provincia. Solo afecta a lo que pasa por TerritoryPicker
	// (concerns/concern_proposals/Voz abierta) — nunca al selector propio de
	// Sanidad, que no usa este componente.
	function valueOptionsFor(type: T): string[] {
		if (type === ('comunidad_autonoma' as T))
			return autonomousCommunities.map((c) => unifiedCommunityName(c.name));
		if (type === ('provincia' as T)) return provinces;
		return [];
	}

	const valueOptions = $derived(valueOptionsFor(scopeType));

	function onTypeChange(next: T) {
		scopeType = next;
		const reset = resetScopeOnTypeChange(next, (t) => valueOptionsFor(t as T)[0]);
		scopeValue = reset.scopeValue;
		municipalityCode = reset.municipalityCode;
	}
</script>

<div class="flex flex-col gap-2 sm:flex-row">
	<select
		id={`${idPrefix}-type`}
		value={scopeType}
		onchange={(e) => onTypeChange(e.currentTarget.value as T)}
		class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
	>
		{#each availableTypes as type (type)}
			<option value={type}>{labels[type]}</option>
		{/each}
	</select>

	{#if scopeIsMunicipio(scopeType)}
		<div class="flex-1">
			<MunicipalitySearchCombobox
				bind:ineCode={municipalityCode}
				bind:name={scopeValue}
				idPrefix={`${idPrefix}-municipality`}
			/>
		</div>
	{:else if scopeType === ('provincia' as T)}
		<div class="flex-1">
			<ProvinceSearchCombobox
				bind:value={scopeValue}
				options={valueOptions}
				idPrefix={`${idPrefix}-province`}
			/>
		</div>
	{:else if scopeNeedsValue(scopeType)}
		<select
			id={`${idPrefix}-value`}
			bind:value={scopeValue}
			class="flex-1 rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
		>
			{#each valueOptions as option (option)}
				<option value={option}>{option}</option>
			{/each}
		</select>
	{/if}
</div>
