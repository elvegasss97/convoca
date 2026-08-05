<script lang="ts">
	import { ChevronDown, ChevronUp, Search } from '@lucide/svelte';
	import type { TopicRisk } from '$lib/types';

	interface Props {
		risks: TopicRisk[];
	}

	let { risks }: Props = $props();

	// Familia de color por categoría — misma paleta ya usada en Coste y
	// Calendario. "Continuidad jurídica y política" reutiliza brand, igual
	// que en el diseño aprobado (con 5 categorías y 4 familias de color
	// disponibles, una repetición es inevitable; se distinguen por su
	// etiqueta completa, siempre visible).
	const CATEGORY_COLOR: Record<string, string> = {
		'Ejecución y presupuesto': 'brand-700',
		'Territorio y planificación': 'accent-600',
		'Mercado y acceso': 'warning-700',
		'Integridad y datos': 'ink-700',
		'Continuidad jurídica y política': 'brand-700'
	};
	const CATEGORY_SOFT: Record<string, string> = {
		'Ejecución y presupuesto': 'brand-50',
		'Territorio y planificación': 'accent-50',
		'Mercado y acceso': 'warning-50',
		'Integridad y datos': 'ink-50',
		'Continuidad jurídica y política': 'brand-50'
	};
	function categoryColor(category: string | undefined): string {
		return CATEGORY_COLOR[category ?? ''] ?? 'ink-700';
	}
	function categorySoft(category: string | undefined): string {
		return CATEGORY_SOFT[category ?? ''] ?? 'ink-50';
	}

	// Orden de primera aparición, que en Vivienda ya sigue el sort_order de
	// topic_risks (mismo orden que en el diseño aprobado).
	const categories = $derived([
		...new Set(risks.map((r) => r.category).filter((c): c is string => !!c))
	]);
	const hasCategories = $derived(categories.length > 0);

	let activeCategory = $state<string | null>(null);
	let query = $state('');
	let openRiskId = $state<string | null>(null);

	function categoryCount(category: string): number {
		return risks.filter((r) => r.category === category).length;
	}

	const filteredRisks = $derived.by(() => {
		let list = risks;
		if (activeCategory) list = list.filter((r) => r.category === activeCategory);
		const q = query.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(r) => r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)
			);
		}
		return list;
	});
</script>

<div>
	{#if hasCategories}
		<div class="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar riesgos por categoría">
			<button
				type="button"
				onclick={() => (activeCategory = null)}
				aria-pressed={activeCategory === null}
				class={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
					activeCategory === null
						? 'border-ink-800 bg-ink-800 text-white'
						: 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
				}`}
			>
				Todos ({risks.length})
			</button>
			{#each categories as category (category)}
				{@const active = activeCategory === category}
				<button
					type="button"
					onclick={() => (activeCategory = active ? null : category)}
					aria-pressed={active}
					class="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors"
					style={active
						? `background-color: var(--color-${categoryColor(category)}); border-color: var(--color-${categoryColor(category)}); color: #fff;`
						: `background-color: var(--color-${categorySoft(category)}); border-color: transparent; color: var(--color-${categoryColor(category)});`}
				>
					{category}
					<span
						class="flex size-5 items-center justify-center rounded-full text-[10px]"
						style={`background-color:${active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)'}`}
					>
						{categoryCount(category)}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="relative mb-4">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
		/>
		<label class="sr-only" for="risk-search">Buscar un riesgo</label>
		<input
			id="risk-search"
			type="text"
			bind:value={query}
			placeholder="Buscar un riesgo…"
			class="w-full rounded-xl border border-ink-200 py-2.5 pr-3 pl-9 text-sm text-ink-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
		/>
	</div>

	<div class="flex flex-col gap-2.5">
		{#each filteredRisks as risk (risk.id)}
			{@const isOpen = openRiskId === risk.id}
			<div
				class="overflow-hidden rounded-2xl border transition-colors"
				style={isOpen && risk.category
					? `border-color: var(--color-${categoryColor(risk.category)})`
					: 'border-color: var(--color-ink-100)'}
			>
				<button
					type="button"
					onclick={() => (openRiskId = isOpen ? null : risk.id)}
					aria-expanded={isOpen}
					class="flex w-full items-start gap-3 p-4 text-left hover:bg-ink-50/60"
				>
					<span
						class="mt-1.5 size-2 shrink-0 rounded-full"
						style={`background-color: var(--color-${categoryColor(risk.category)})`}
						aria-hidden="true"
					></span>
					<div class="min-w-0 flex-1">
						{#if risk.category}
							<div
								class="mb-0.5 text-[10px] font-bold tracking-wide uppercase"
								style={`color: var(--color-${categoryColor(risk.category)})`}
							>
								{risk.category}
							</div>
						{/if}
						<div class="text-sm font-semibold text-ink-800">{risk.title}</div>
					</div>
					{#if isOpen}<ChevronUp class="mt-0.5 size-4 shrink-0 text-ink-500" />{:else}<ChevronDown
							class="mt-0.5 size-4 shrink-0 text-ink-500"
						/>{/if}
				</button>
				{#if isOpen}
					<div class="flex flex-col gap-3 px-4 pb-4 pl-8">
						{#if risk.description}
							<div>
								<div class="mb-0.5 text-[10px] font-bold tracking-wide text-ink-500 uppercase">
									En qué consiste
								</div>
								<p class="text-xs text-ink-700">{risk.description}</p>
							</div>
						{/if}
						{#if risk.signals}
							<div>
								<div class="mb-0.5 text-[10px] font-bold tracking-wide text-ink-500 uppercase">
									Señales de alerta
								</div>
								<p class="text-xs text-ink-700">{risk.signals}</p>
							</div>
						{/if}
						{#if risk.mitigation}
							<div>
								<div
									class="mb-0.5 text-[10px] font-bold tracking-wide uppercase"
									style={`color: var(--color-${categoryColor(risk.category)})`}
								>
									Cómo se reduce
								</div>
								<p class="text-xs text-ink-700">{risk.mitigation}</p>
							</div>
						{/if}
						{#if risk.decisionTrigger}
							<div>
								<div
									class="mb-0.5 text-[10px] font-bold tracking-wide uppercase"
									style={`color: var(--color-${categoryColor(risk.category)})`}
								>
									Decisión si ocurre
								</div>
								<p class="text-xs font-medium text-ink-800">{risk.decisionTrigger}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		{#if filteredRisks.length === 0}
			<p class="py-8 text-center text-sm text-ink-500">Ningún riesgo coincide con la búsqueda.</p>
		{/if}
	</div>
</div>
