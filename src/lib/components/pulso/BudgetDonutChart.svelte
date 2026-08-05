<script lang="ts">
	interface DonutItem {
		id: string;
		label: string;
		min: number;
		max: number;
		/** Token de color del proyecto (p. ej. "brand-700"), nunca un hex suelto. */
		colorToken: string;
	}

	interface Props {
		items: DonutItem[];
		/** id del elemento resaltado desde fuera (p. ej. al pulsar un tramo de la barra de inversión). */
		selectedId?: string | null;
		onSelect?: (id: string | null) => void;
	}

	let { items, selectedId = null, onSelect }: Props = $props();

	let hoverId = $state<string | null>(null);
	const activeId = $derived(hoverId ?? selectedId);

	const total = $derived(items.reduce((sum, it) => sum + (it.min + it.max) / 2, 0));

	const RADIUS = 80;
	const STROKE = 34;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const segments = $derived.by(() => {
		let cumulative = 0;
		return items.map((it) => {
			const value = (it.min + it.max) / 2;
			const fraction = total > 0 ? value / total : 0;
			// Pequeño hueco entre segmentos (2px de "padding angle").
			const length = Math.max(fraction * CIRCUMFERENCE - 2, 0);
			const offset = -cumulative;
			cumulative += fraction * CIRCUMFERENCE;
			return { ...it, length, offset };
		});
	});

	function eur(n: number): string {
		return Math.round(n).toLocaleString('es-ES');
	}

	function colorVar(token: string): string {
		return `var(--color-${token})`;
	}
</script>

<div class="grid gap-6 md:grid-cols-2 md:items-center">
	<!-- Donut: puramente decorativo, la lista de abajo es la superficie accesible real. -->
	<div class="mx-auto aspect-square w-full max-w-[280px]" aria-hidden="true">
		<svg viewBox="0 0 200 200" class="size-full -rotate-90">
			{#each segments as seg (seg.id)}
				<circle
					cx="100"
					cy="100"
					r={RADIUS}
					fill="none"
					stroke={colorVar(seg.colorToken)}
					stroke-width={STROKE}
					stroke-dasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
					stroke-dashoffset={seg.offset}
					class="transition-opacity duration-150"
					style={`opacity:${activeId && activeId !== seg.id ? 0.32 : 1}`}
				/>
			{/each}
		</svg>
	</div>

	<ul class="flex min-w-0 flex-col gap-1.5">
		{#each items as it (it.id)}
			<li>
				<button
					type="button"
					onmouseenter={() => (hoverId = it.id)}
					onmouseleave={() => (hoverId = null)}
					onfocus={() => (hoverId = it.id)}
					onblur={() => (hoverId = null)}
					onclick={() => onSelect?.(selectedId === it.id ? null : it.id)}
					aria-pressed={selectedId === it.id}
					class={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
						activeId === it.id ? 'bg-ink-50' : ''
					}`}
				>
					<span
						class="size-3 shrink-0 rounded-full"
						style={`background-color:${colorVar(it.colorToken)}`}
					></span>
					<span class="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{it.label}</span>
					<span class="shrink-0 text-sm font-semibold text-ink-700 tabular-nums">
						{eur(it.min)}–{eur(it.max)} M€
					</span>
				</button>
			</li>
		{/each}
	</ul>
</div>
