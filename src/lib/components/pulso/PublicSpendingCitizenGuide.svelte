<script lang="ts">
	import { ArrowRight, CircleHelp, Info, Landmark, MapPin } from '@lucide/svelte';
	import type { PublicSpendingInvestigation } from '$lib/data/publicSpending';

	let { investigation }: { investigation: PublicSpendingInvestigation } = $props();
</script>

<section
	id="resumen-sencillo"
	aria-labelledby="resumen-sencillo-titulo"
	class="relative scroll-mt-24 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card"
>
	<div class="absolute inset-y-0 left-0 w-1.5" style={`background:${investigation.accent}`}></div>

	<div class="border-b border-brand-100 bg-brand-50/70 px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
		<p
			class="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-700 uppercase"
		>
			<Info class="size-4" /> Antes de entrar en el detalle
		</p>
		<h2
			id="resumen-sencillo-titulo"
			class="mt-2 font-display text-2xl font-semibold text-ink-900 sm:text-3xl"
		>
			En pocas palabras
		</h2>
		<p class="mt-3 max-w-4xl text-sm leading-relaxed text-ink-700 sm:text-base">
			{investigation.citizenIntro}
		</p>

		<div class="mt-6 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
			<article class="rounded-2xl border border-brand-200 bg-white p-4 sm:p-5">
				<div class="flex items-center gap-2 text-brand-700">
					<Landmark class="size-4.5" />
					<h3 class="text-xs font-semibold tracking-wider uppercase">De dónde sale</h3>
				</div>
				<p class="mt-2 text-sm leading-relaxed text-ink-700">
					{investigation.fundingOrigin}
				</p>
			</article>

			<span
				aria-hidden="true"
				class="flex items-center justify-center text-brand-400 max-sm:rotate-90"
			>
				<ArrowRight class="size-5" />
			</span>

			<article class="rounded-2xl border border-brand-200 bg-white p-4 sm:p-5">
				<div class="flex items-center gap-2 text-brand-700">
					<MapPin class="size-4.5" />
					<h3 class="text-xs font-semibold tracking-wider uppercase">A dónde va</h3>
				</div>
				<p class="mt-2 text-sm leading-relaxed text-ink-700">
					{investigation.fundingDestination}
				</p>
			</article>
		</div>
	</div>

	<div class="px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
		<div class="flex items-center gap-2 text-ink-500">
			<CircleHelp class="size-4.5 text-accent-600" />
			<h3 class="text-xs font-semibold tracking-wider uppercase">
				{investigation.explainerFigures.length === 3
					? 'Tres cifras, tres preguntas distintas'
					: 'Las cifras que conviene separar'}
			</h3>
		</div>

		<div class="mt-4 grid gap-3 lg:grid-cols-3">
			{#each investigation.explainerFigures as figure (figure.id)}
				<article class="rounded-2xl border border-ink-200 bg-ink-50/70 p-4 sm:p-5">
					<p class="font-display text-2xl font-semibold tracking-tight text-ink-900">
						{figure.value}
					</p>
					<h4 class="mt-2 text-sm leading-snug font-semibold text-ink-800">
						{figure.question}
					</h4>
					<p class="mt-2 text-xs leading-relaxed text-ink-600 sm:text-sm">
						{figure.explanation}
					</p>
				</article>
			{/each}
		</div>

		<div class="mt-4 rounded-2xl bg-ink-900 px-4 py-4 text-white sm:px-5">
			<p class="text-[11px] font-semibold tracking-wider text-accent-300 uppercase">
				Si solo recuerdas una idea
			</p>
			<p class="mt-1.5 text-sm leading-relaxed text-ink-100 sm:text-base">
				{investigation.citizenTakeaway}
			</p>
		</div>
	</div>
</section>
