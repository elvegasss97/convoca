<script lang="ts">
	import { MapPin, ChevronDown } from '@lucide/svelte';
	import { selectedCity } from '$lib/stores/location';
	import { mockCities } from '$lib/mock/cities';

	let open = $state(false);

	function choose(city: (typeof mockCities)[number]) {
		$selectedCity = city;
		open = false;
	}
</script>

<div class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		<MapPin class="size-4 text-brand-600" strokeWidth={2.25} />
		<span>{$selectedCity.name}</span>
		<ChevronDown class="size-3.5 text-ink-500" />
	</button>

	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-30 cursor-default"
			aria-label="Cerrar selector de ciudad"
			onclick={() => (open = false)}
		></button>
		<ul
			role="listbox"
			class="absolute left-0 z-40 mt-2 max-h-72 w-56 overflow-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-card-hover"
		>
			{#each mockCities as city (city.name)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={city.name === $selectedCity.name}
						onclick={() => choose(city)}
						class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-brand-50 {city.name ===
						$selectedCity.name
							? 'bg-brand-50 font-semibold text-brand-700'
							: 'text-ink-700'}"
					>
						<span>{city.name}</span>
						<span class="text-xs text-ink-400">{city.province}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
