<script lang="ts">
	import type { ConcernScopeType } from '$lib/types';
	import { concernScopeTypeLabels } from '$lib/labels';
	import { autonomousCommunities, provinces } from '$lib/data/regions';
	import { mockCities } from '$lib/data/cities';

	interface Props {
		scopeType: ConcernScopeType;
		scopeValue: string | undefined;
		/** id/name base para los <select>, evita colisiones cuando hay varios en la misma página. */
		idPrefix?: string;
		/** Ámbitos ofrecidos. Por defecto los 4; el selector público puede limitarse a los que ya tienen contenido. */
		availableTypes?: ConcernScopeType[];
	}

	let {
		scopeType = $bindable(),
		scopeValue = $bindable(),
		idPrefix = 'territory',
		availableTypes = ['nacional', 'comunidad_autonoma', 'provincia', 'municipio']
	}: Props = $props();

	const valueOptions = $derived.by((): string[] => {
		if (scopeType === 'comunidad_autonoma') return autonomousCommunities.map((c) => c.name);
		if (scopeType === 'provincia') return provinces;
		if (scopeType === 'municipio') return mockCities.map((c) => c.name);
		return [];
	});

	function onTypeChange(next: ConcernScopeType) {
		scopeType = next;
		scopeValue = next === 'nacional' ? undefined : valueOptionsFor(next)[0];
	}

	function valueOptionsFor(type: ConcernScopeType): string[] {
		if (type === 'comunidad_autonoma') return autonomousCommunities.map((c) => c.name);
		if (type === 'provincia') return provinces;
		if (type === 'municipio') return mockCities.map((c) => c.name);
		return [];
	}
</script>

<div class="flex flex-col gap-2 sm:flex-row">
	<select
		id={`${idPrefix}-type`}
		value={scopeType}
		onchange={(e) => onTypeChange(e.currentTarget.value as ConcernScopeType)}
		class="rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
	>
		{#each availableTypes as type (type)}
			<option value={type}>{concernScopeTypeLabels[type]}</option>
		{/each}
	</select>

	{#if scopeType !== 'nacional'}
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
