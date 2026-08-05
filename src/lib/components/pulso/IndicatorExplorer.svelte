<script lang="ts">
	interface IndicatorGroup {
		category: string;
		items: string[];
	}

	interface Props {
		groups: IndicatorGroup[];
	}

	let { groups }: Props = $props();

	// La etiqueta puede venir como "A. Parque público" (Vivienda, con letra)
	// o como "Acceso" (Sanidad, sin letra) — el círculo usa la letra si
	// existe, o la inicial de la etiqueta si no, sin asumir un esquema fijo.
	function badge(category: string): string {
		const match = /^([A-Za-z])\.\s/.exec(category);
		return (match ? match[1] : category.charAt(0)).toUpperCase();
	}
	function label(category: string): string {
		const match = /^[A-Za-z]\.\s/.exec(category);
		return match ? category.slice(match[0].length) : category;
	}

	let selectedCategory = $state<string | null>(null);
	const activeCategory = $derived(selectedCategory ?? groups[0]?.category ?? '');
	const activeGroup = $derived(groups.find((g) => g.category === activeCategory) ?? groups[0]);
	const maxCount = $derived(Math.max(...groups.map((g) => g.items.length), 1));
</script>

<div class="grid gap-6 sm:grid-cols-[220px_1fr]">
	<div
		class="flex gap-1.5 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible"
		role="tablist"
		aria-label="Categorías de indicadores"
	>
		{#each groups as group (group.category)}
			{@const active = activeCategory === group.category}
			<button
				type="button"
				role="tab"
				aria-selected={active}
				onclick={() => (selectedCategory = group.category)}
				class={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
					active ? 'bg-brand-700' : 'bg-ink-50 hover:bg-ink-100'
				}`}
			>
				<span
					class={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
						active ? 'bg-white/20 text-white' : 'bg-white text-brand-700'
					}`}
				>
					{badge(group.category)}
				</span>
				<span
					class={`text-xs font-semibold whitespace-nowrap sm:whitespace-normal ${active ? 'text-white' : 'text-ink-700'}`}
				>
					{label(group.category)}
				</span>
				<span
					class={`ml-auto hidden text-[10px] font-medium sm:inline ${active ? 'text-white/70' : 'text-ink-500'}`}
				>
					{group.items.length}
				</span>
			</button>
		{/each}
	</div>

	{#if activeGroup}
		<div>
			<div class="mb-4 flex items-center gap-2">
				<div class="h-1.5 flex-1 rounded-full bg-ink-50">
					<div
						class="h-1.5 rounded-full bg-brand-300"
						style={`width:${(activeGroup.items.length / maxCount) * 100}%`}
					></div>
				</div>
				<span class="text-xs font-semibold whitespace-nowrap text-ink-500">
					{activeGroup.items.length} indicadores
				</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each activeGroup.items as item (item)}
					<span class="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
						{item}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
