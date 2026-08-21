<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		Building2,
		CheckCircle2,
		CircleHelp,
		Clock3,
		Euro,
		ExternalLink,
		FileCheck2,
		FileSearch,
		Info,
		Landmark,
		MapPin,
		Route,
		ShieldCheck
	} from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import PulsoSectionTabs from '$lib/components/pulso/PulsoSectionTabs.svelte';
	import {
		publicSpendingPilot,
		publicSpendingShare,
		publicSpendingSources,
		publicSpendingWallItems
	} from '$lib/data/publicSpendingPilotData';

	let selectedId = $state('acogida-vulnerable-reforzada');
	const selectedItem = $derived(
		publicSpendingWallItems.find((item) => item.id === selectedId) ?? publicSpendingWallItems[0]
	);

	const euroFormatter = new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 0
	});
	const decimalFormatter = new Intl.NumberFormat('es-ES', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	const shareFormatter = new Intl.NumberFormat('es-ES', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 2
	});

	function formatMillions(amount: number): string {
		return `${decimalFormatter.format(amount / 1_000_000)} M€`;
	}
</script>

<Seo
	title="El rastro del dinero — Gasto público"
	description="Sigue el gasto público desde la planificación hasta el pago y comprueba qué documento oficial acredita cada cifra."
/>

<div class="mx-auto max-w-7xl px-4 pt-4 pb-20 sm:px-6">
	<header class="mb-5">
		<PulsoSectionTabs active="gasto" />
		<a
			href="/pulso/gasto-publico"
			class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
		>
			<ArrowLeft class="size-4" /> Volver al muro
		</a>
	</header>

	<section
		class="relative isolate overflow-hidden rounded-3xl bg-brand-950 px-5 py-7 text-white shadow-card sm:px-8 sm:py-10 lg:px-12"
	>
		<div
			class="pointer-events-none absolute -top-36 -right-28 -z-10 size-80 rounded-full bg-brand-400/25 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-accent-500/20 blur-3xl"
		></div>
		<div class="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"></div>

		<div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
			<div class="max-w-3xl">
				<div
					class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100"
				>
					<ShieldCheck class="size-3.5" /> Investigación con fuentes primarias
				</div>
				<div class="mt-4 flex items-center gap-2.5">
					<Landmark class="size-7 text-accent-300" strokeWidth={2.1} />
					<p class="font-display text-sm font-semibold tracking-wide text-brand-100 uppercase">
						Gasto público
					</p>
				</div>
				<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
					El rastro del dinero
				</h1>
				<p class="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-lg">
					De una cifra que circula en redes al documento que la origina. Cuánto se planifica, quién
					lo gestiona, dónde termina y qué parte todavía no conocemos.
				</p>
			</div>

			<div class="grid shrink-0 grid-cols-2 gap-2 sm:min-w-md">
				<div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
					<p class="text-[11px] font-medium tracking-wide text-brand-200 uppercase">Estado real</p>
					<p class="mt-1 font-display text-lg font-semibold">Planificado</p>
				</div>
				<div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
					<p class="text-[11px] font-medium tracking-wide text-brand-200 uppercase">Fuentes</p>
					<p class="mt-1 font-display text-lg font-semibold">4 oficiales</p>
				</div>
				<div class="col-span-2 rounded-2xl border border-accent-300/25 bg-accent-300/10 px-4 py-3">
					<p class="text-[11px] font-medium tracking-wide text-accent-200 uppercase">
						Importe planificado
					</p>
					<p class="mt-0.5 font-display text-2xl font-semibold">
						{formatMillions(publicSpendingPilot.plannedTotal)}
					</p>
					<p class="mt-0.5 text-xs text-brand-100">{publicSpendingPilot.period}</p>
				</div>
			</div>
		</div>
	</section>

	<nav
		aria-label="Contenido de El rastro del dinero"
		class="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1"
	>
		<a href="#caso" class="section-link">El caso de los 150 €</a>
		<a href="#muro" class="section-link">Ver el muro</a>
		<a href="#rastro" class="section-link">Seguir el dinero</a>
		<a href="#fuentes" class="section-link">Comprobar fuentes</a>
	</nav>

	<div
		class="mt-4 flex flex-col gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-center gap-2 text-xs font-semibold text-brand-800">
			<CheckCircle2 class="size-4 shrink-0" />
			{publicSpendingPilot.status} · Revisado el
			{publicSpendingPilot.reviewedAt}
		</div>
		<p class="max-w-2xl text-xs leading-relaxed text-ink-600">
			{publicSpendingPilot.disclaimer}
		</p>
	</div>

	<section id="caso" class="scroll-mt-24 pt-10">
		<div class="mb-5 max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-accent-700 uppercase">
				Del ruido al dato
			</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				¿Qué significan realmente los 150 €?
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				La cifra existe. Lo que cambia por completo es la unidad, a quién se aplica y quién recibe
				el dinero.
			</p>
		</div>

		<div class="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
			<article class="rounded-3xl border border-critical-100 bg-critical-50 p-5 sm:p-6">
				<div class="flex items-center gap-2 text-critical-700">
					<CircleHelp class="size-5" />
					<p class="text-xs font-semibold tracking-wider uppercase">Lo que puede parecer</p>
				</div>
				<p class="mt-5 font-display text-4xl font-semibold text-ink-900">150 €</p>
				<p class="mt-1 text-lg font-semibold text-ink-800">
					entregados a cada solicitante cada día
				</p>
				<p class="mt-4 text-sm leading-relaxed text-ink-600">
					Esa lectura mezcla una tarifa técnica con un pago personal y extiende el caso más caro a
					todo el sistema.
				</p>
			</article>

			<article class="rounded-3xl border border-brand-200 bg-brand-50 p-5 shadow-card sm:p-6">
				<div class="flex items-center gap-2 text-brand-700">
					<FileCheck2 class="size-5" />
					<p class="text-xs font-semibold tracking-wider uppercase">Lo que documenta la fuente</p>
				</div>
				<div class="mt-5 grid gap-3 sm:grid-cols-3">
					<div class="fact-card">
						<p class="font-display text-2xl font-semibold text-ink-900">150 €</p>
						<p class="mt-1 text-xs leading-relaxed text-ink-600">
							precio de referencia por plaza y día
						</p>
					</div>
					<div class="fact-card">
						<p class="font-display text-2xl font-semibold text-ink-900">55</p>
						<p class="mt-1 text-xs leading-relaxed text-ink-600">
							plazas de vulnerabilidad reforzada
						</p>
					</div>
					<div class="fact-card">
						<p class="font-display text-2xl font-semibold text-ink-900">0,45 %</p>
						<p class="mt-1 text-xs leading-relaxed text-ink-600">del total planificado</p>
					</div>
				</div>
				<div class="mt-4 rounded-2xl border border-brand-200 bg-white px-4 py-3">
					<p class="font-mono text-sm font-semibold text-ink-800 sm:text-base">
						55 plazas × 365 días × 150 € = 3.011.250 €
					</p>
					<p class="mt-1.5 text-xs leading-relaxed text-ink-600">
						El precio sirve para calcular anticipos y la retribución máxima de la entidad que presta
						el servicio. No describe un ingreso en efectivo para la persona acogida.
					</p>
				</div>
			</article>
		</div>
	</section>

	<section id="muro" class="scroll-mt-24 pt-12">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-semibold tracking-wider text-brand-700 uppercase">El muro</p>
				<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
					Cada bloque ocupa lo que pesa
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
					El área representa el importe real dentro de la planificación. Pulsa cualquier bloque para
					entenderlo.
				</p>
			</div>
			<div class="flex items-center gap-2 text-xs text-ink-500">
				<ShieldCheck class="size-4 text-brand-600" /> Reconciliado con el total del BOE
			</div>
		</div>

		<div
			class="mt-5 overflow-hidden rounded-3xl border border-ink-200 bg-white p-2 shadow-card sm:p-3"
		>
			<div
				class="spending-wall relative overflow-hidden rounded-2xl bg-ink-100"
				role="group"
				aria-label="Distribución proporcional de 670.458.917 euros por fase"
			>
				{#each publicSpendingWallItems as item (item.id)}
					<button
						type="button"
						class:selected={selectedId === item.id}
						class="spending-tile absolute overflow-hidden border border-white/70 p-2 text-left transition focus-visible:z-20 focus-visible:outline-3 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:p-3"
						style={`left:${item.rect.x}%; top:${item.rect.y}%; width:${item.rect.width}%; height:${item.rect.height}%; background:${item.fill}; color:${item.textColor};`}
						aria-pressed={selectedId === item.id}
						aria-label={`${item.label}: ${euroFormatter.format(item.amount)}, ${shareFormatter.format(publicSpendingShare(item.amount))} % del total`}
						title={`${item.label} · ${euroFormatter.format(item.amount)}`}
						onclick={() => (selectedId = item.id)}
					>
						{#if !item.compact}
							<span class="block text-[10px] leading-tight font-semibold sm:text-sm">
								{item.shortLabel}
							</span>
							<span class="mt-1 block font-display text-xs font-semibold sm:text-xl">
								{formatMillions(item.amount)}
							</span>
							<span class="mt-1 hidden text-xs opacity-80 sm:block">
								{shareFormatter.format(publicSpendingShare(item.amount))} %
							</span>
						{:else if item.rect.width > 8}
							<span class="hidden text-[11px] leading-tight font-semibold sm:block">
								{item.shortLabel}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-3 flex flex-wrap gap-2" aria-label="Leyenda del muro">
			{#each publicSpendingWallItems as item (item.id)}
				<button
					type="button"
					aria-pressed={selectedId === item.id}
					class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition {selectedId ===
					item.id
						? 'border-brand-300 bg-brand-50 text-brand-800'
						: 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}"
					onclick={() => (selectedId = item.id)}
				>
					<span class="size-2.5 shrink-0 rounded-sm" style={`background:${item.fill}`}></span>
					{item.shortLabel}
					<span class="text-ink-400"
						>{shareFormatter.format(publicSpendingShare(item.amount))} %</span
					>
				</button>
			{/each}
		</div>

		<article
			aria-live="polite"
			class="mt-4 grid gap-5 rounded-3xl border border-ink-200 bg-white p-5 shadow-card sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center"
		>
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<span class="size-3 rounded-sm" style={`background:${selectedItem.fill}`}></span>
					<p class="text-xs font-semibold tracking-wider text-ink-500 uppercase">
						Bloque seleccionado
					</p>
				</div>
				<h3 class="mt-2 font-display text-xl font-semibold text-ink-900 sm:text-2xl">
					{selectedItem.label}
				</h3>
				<p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-600">
					{selectedItem.description}
				</p>
				<p class="mt-3 flex items-start gap-2 text-sm text-ink-700">
					<Info class="mt-0.5 size-4 shrink-0 text-brand-600" />
					{selectedItem.capacity}
				</p>
			</div>
			<div class="grid grid-cols-2 gap-2 lg:min-w-72">
				<div class="rounded-2xl bg-ink-50 p-3.5">
					<p class="text-[11px] font-medium text-ink-400 uppercase">Planificado</p>
					<p class="mt-1 font-display text-lg font-semibold text-ink-900">
						{formatMillions(selectedItem.amount)}
					</p>
				</div>
				<div class="rounded-2xl bg-ink-50 p-3.5">
					<p class="text-[11px] font-medium text-ink-400 uppercase">Referencia</p>
					<p class="mt-1 font-display text-lg font-semibold text-ink-900">
						{selectedItem.rate} €
					</p>
					<p class="text-[10px] text-ink-500">por {selectedItem.unit}</p>
				</div>
			</div>
		</article>
	</section>

	<section id="rastro" class="scroll-mt-24 pt-12">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-accent-700 uppercase">Trazabilidad</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				¿Hasta dónde podemos seguir el dinero?
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				CONVOCA no rellena los huecos. Cada paso cambia de estado solo cuando aparece el documento
				que lo acredita.
			</p>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
			<ol class="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
				<li class="trace-row">
					<span class="trace-icon bg-brand-100 text-brand-700"
						><CheckCircle2 class="size-4.5" /></span
					>
					<div>
						<p class="font-display font-semibold text-ink-900">1. Necesidad planificada</p>
						<p class="trace-copy">
							El BOE cuantifica plazas, personas y coste por fase para doce meses.
						</p>
					</div>
					<span class="status-ok">Verificado</span>
				</li>
				<li class="trace-row">
					<span class="trace-icon bg-brand-100 text-brand-700"><Euro class="size-4.5" /></span>
					<div>
						<p class="font-display font-semibold text-ink-900">2. Precio de referencia</p>
						<p class="trace-copy">
							La resolución de precios explica la unidad y cómo limita la retribución máxima.
						</p>
					</div>
					<span class="status-ok">Verificado</span>
				</li>
				<li class="trace-row">
					<span class="trace-icon bg-warning-100 text-warning-700"
						><Building2 class="size-4.5" /></span
					>
					<div>
						<p class="font-display font-semibold text-ink-900">3. Entidades asignadas</p>
						<p class="trace-copy">
							Las comunicaciones posteriores concretan la entidad. Ese desglose no consta en las
							fuentes revisadas para esta ficha.
						</p>
					</div>
					<span class="status-waiting">Pendiente</span>
				</li>
				<li class="trace-row">
					<span class="trace-icon bg-warning-100 text-warning-700"><MapPin class="size-4.5" /></span
					>
					<div>
						<p class="font-display font-semibold text-ink-900">4. Municipios y centros</p>
						<p class="trace-copy">
							La planificación nacional no incluye el reparto geográfico que permitiría encender el
							mapa.
						</p>
					</div>
					<span class="status-waiting">No localizado</span>
				</li>
				<li class="trace-row border-b-0">
					<span class="trace-icon bg-ink-100 text-ink-500"><Clock3 class="size-4.5" /></span>
					<div>
						<p class="font-display font-semibold text-ink-900">5. Pagado y justificado</p>
						<p class="trace-copy">
							El periodo sigue en ejecución. No confundimos el máximo planificado con el gasto
							efectivo.
						</p>
					</div>
					<span class="status-empty">Sin dato</span>
				</li>
			</ol>

			<aside class="rounded-3xl bg-ink-900 p-5 text-white shadow-card sm:p-6">
				<Route class="size-7 text-accent-300" />
				<h3 class="mt-4 font-display text-xl font-semibold">La regla del rastro</h3>
				<div class="mt-5 space-y-3">
					<div class="rounded-2xl bg-white/8 px-4 py-3">
						<p class="text-xs text-ink-300">Planificado</p>
						<p class="font-semibold">670.458.917 €</p>
					</div>
					<div class="text-center text-ink-400">↓</div>
					<div class="rounded-2xl border border-dashed border-white/20 px-4 py-3">
						<p class="text-xs text-ink-300">Asignado</p>
						<p class="font-semibold text-warning-300">Pendiente de documentación</p>
					</div>
					<div class="text-center text-ink-400">↓</div>
					<div class="rounded-2xl border border-dashed border-white/20 px-4 py-3">
						<p class="text-xs text-ink-300">Pagado y justificado</p>
						<p class="font-semibold text-warning-300">Todavía no disponible</p>
					</div>
				</div>
				<p class="mt-5 text-xs leading-relaxed text-ink-300">
					Un hueco de información se muestra como hueco. Nunca se sustituye por 0 € ni por una
					estimación sin etiquetar.
				</p>
			</aside>
		</div>
	</section>

	<section id="fuentes" class="scroll-mt-24 pt-12">
		<div class="max-w-3xl">
			<p class="text-xs font-semibold tracking-wider text-brand-700 uppercase">
				Expediente abierto
			</p>
			<h2 class="mt-1 font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Compruébalo sin fiarte de CONVOCA
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
				Cada conclusión importante enlaza con el documento original y explica qué demuestra —y qué
				no demuestra— esa fuente.
			</p>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
			{#each publicSpendingSources as source, index (source.id)}
				<article class="flex flex-col rounded-3xl border border-ink-200 bg-white p-5 shadow-card">
					<div class="flex items-start justify-between gap-3">
						<span
							class="flex size-9 items-center justify-center rounded-full bg-brand-100 text-brand-700"
						>
							<FileSearch class="size-4.5" />
						</span>
						<span
							class="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700"
						>
							{source.status}
						</span>
					</div>
					<p class="mt-4 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
						Fuente {index + 1} · {source.organization}
					</p>
					<h3 class="mt-2 font-display font-semibold text-ink-900">{source.title}</h3>
					<p class="mt-1 text-xs text-ink-500">{source.date}</p>
					<div class="my-4 h-px bg-ink-100"></div>
					<p class="text-xs font-semibold text-ink-500">Qué demuestra</p>
					<p class="mt-1 text-sm leading-relaxed text-ink-600">{source.whatItProves}</p>
					<a
						href={source.url}
						target="_blank"
						rel="noreferrer"
						class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
					>
						Abrir documento original <ExternalLink class="size-3.5" />
					</a>
				</article>
			{/each}
		</div>
	</section>

	<section class="mt-12 rounded-3xl border border-accent-200 bg-accent-50 p-5 sm:p-7">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
			<div class="max-w-3xl">
				<div class="flex items-center gap-2 text-accent-700">
					<Info class="size-5" />
					<p class="text-xs font-semibold tracking-wider uppercase">Alcance de la ficha</p>
				</div>
				<h2 class="mt-2 font-display text-xl font-semibold text-ink-900">
					Una investigación completa dentro de un muro abierto
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-600">
					Esta ficha explica el expediente estatal con el nivel de evidencia hoy disponible. Las
					asignaciones, entidades y municipios se añadirán cuando exista documentación pública que
					los acredite.
				</p>
			</div>
			<a
				href="/pulso/gasto-publico"
				class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
			>
				Ver las 7 investigaciones <ArrowRight class="size-3.5" />
			</a>
		</div>
	</section>
</div>

<style>
	.section-link {
		flex-shrink: 0;
		border: 1px solid var(--color-ink-200);
		border-radius: 9999px;
		background: white;
		padding: 0.5rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink-700);
		box-shadow: 0 1px 2px rgb(23 20 16 / 0.04);
	}

	.section-link:hover {
		border-color: var(--color-brand-300);
		color: var(--color-brand-700);
	}

	.fact-card {
		border-radius: 1rem;
		background: white;
		padding: 1rem;
	}

	.spending-wall {
		aspect-ratio: 1.35 / 1;
	}

	.spending-tile:hover {
		z-index: 10;
		filter: brightness(1.06);
	}

	.spending-tile.selected {
		z-index: 11;
		box-shadow:
			inset 0 0 0 4px rgb(255 255 255 / 0.95),
			inset 0 0 0 7px rgb(23 20 16 / 0.38);
	}

	.trace-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.75rem;
		border-bottom: 1px solid var(--color-ink-100);
		padding: 1rem;
	}

	.trace-icon {
		display: flex;
		width: 2.25rem;
		height: 2.25rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
	}

	.trace-copy {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		line-height: 1.625;
		color: var(--color-ink-600);
	}

	.status-ok,
	.status-waiting,
	.status-empty {
		border-radius: 9999px;
		padding: 0.25rem 0.625rem;
		font-size: 0.6875rem;
		font-weight: 600;
	}

	.status-ok {
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}

	.status-waiting {
		background: var(--color-warning-50);
		color: var(--color-warning-700);
	}

	.status-empty {
		background: var(--color-ink-100);
		color: var(--color-ink-600);
	}

	@media (min-width: 640px) {
		.spending-wall {
			aspect-ratio: 2 / 1;
		}

		.trace-row {
			padding: 1.25rem;
		}
	}

	@media (max-width: 520px) {
		.trace-row {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.trace-row > :global(.status-ok),
		.trace-row > :global(.status-waiting),
		.trace-row > :global(.status-empty) {
			grid-column: 2;
			justify-self: start;
		}
	}
</style>
