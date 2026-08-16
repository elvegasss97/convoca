<script lang="ts">
	import {
		ArrowLeft,
		FileClock,
		BookText,
		Activity,
		Lightbulb,
		Rocket,
		Link as LinkIcon,
		Coins,
		CalendarRange,
		AlertTriangle,
		History,
		MessagesSquare,
		ShieldCheck,
		Ear,
		ArrowRight
	} from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { tick } from 'svelte';
	import type { PageData } from './$types';
	import type {
		MeasureParticipationResponse,
		MeasureParticipationResults,
		TopicMeasure
	} from '$lib/types';
	import {
		concernCategoryLabels,
		topicStatusLabels,
		TOPIC_CATEGORY_PENDING_LABEL
	} from '$lib/labels';
	import { formatEventDate, formatEventDateWithYear } from '$lib/utils/date';
	import Seo from '$lib/components/Seo.svelte';
	import ContentTypeTag from '$lib/components/pulso/ContentTypeTag.svelte';
	import ConcernResultsChart from '$lib/components/pulso/ConcernResultsChart.svelte';
	import TopicMeasureCard from '$lib/components/pulso/TopicMeasureCard.svelte';
	import GeneralParticipationBlock from '$lib/components/pulso/GeneralParticipationBlock.svelte';
	import SimpleMeasureCard from '$lib/components/pulso/SimpleMeasureCard.svelte';
	import SimpleGeneralParticipationBlock from '$lib/components/pulso/SimpleGeneralParticipationBlock.svelte';
	import PlanMap from '$lib/components/pulso/PlanMap.svelte';
	import CosteEconomico from '$lib/components/pulso/CosteEconomico.svelte';
	import SanidadPresupuesto from '$lib/components/pulso/SanidadPresupuesto.svelte';
	import SanidadCalendario from '$lib/components/pulso/SanidadCalendario.svelte';
	import CalendarioVisual from '$lib/components/pulso/CalendarioVisual.svelte';
	import RiesgosComprobacion from '$lib/components/pulso/RiesgosComprobacion.svelte';
	import SanidadRiesgos from '$lib/components/pulso/SanidadRiesgos.svelte';
	import CeutaPresupuesto from '$lib/components/pulso/CeutaPresupuesto.svelte';
	import CeutaCircuito72h from '$lib/components/pulso/CeutaCircuito72h.svelte';
	import { viviendaMapData, sanidadMapData } from '$lib/data/planMapData';
	import { submitMeasureAlternative } from '$lib/services/topicsService';
	import {
		listMyMeasureParticipationResponses,
		getMyGeneralParticipationResponse,
		getMyResponsePriorities,
		getMyParticipantContext
	} from '$lib/services/participationService';
	import { authState } from '$lib/auth/session.svelte';

	let { data }: { data: PageData } = $props();

	const topic = $derived(data.topic);
	const round = $derived(data.round);
	// Vivienda (priorizar + profundizar) y Sanidad (encuesta de una tirada)
	// ya tienen construida su propia Escucha abierta. El resto de temas la
	// enlaza como "Próximamente" en vez de apuntar a la rejilla genérica de
	// preocupaciones, vacía y sin ese recorrido todavía.
	const hasOpenListening = $derived(topic.category === 'vivienda' || topic.category === 'sanidad');
	// Vivienda usa el cuestionario rico (motivo estructurado, urgencia,
	// inversión, ritmo, prioridades, contexto). Otros temas, como Sanidad y
	// Ceuta, usan un modelo de participación más simple: posición + comentario
	// opcional. Cambiar esta rama no toca el camino de Vivienda.
	const usesSimpleParticipation = $derived(
		topic.category === 'sanidad' || topic.slug === 'plan-ceuta-2026'
	);
	const categoryLabel = $derived(
		topic.category ? concernCategoryLabels[topic.category] : TOPIC_CATEGORY_PENDING_LABEL
	);
	// La ronda de participación manda: solo se dice "abierta" cuando de verdad
	// admite respuestas ahora mismo.
	const statusLabel = $derived(
		round?.status === 'open'
			? 'Abierto a participación'
			: topic.status === 'open'
				? 'Borrador publicado — participación próximamente'
				: topicStatusLabels[topic.status]
	);

	// Copias locales mutables: cada TopicMeasureCard actualiza su propia
	// entrada de forma optimista al votar, sin recargar la página.
	// eslint-disable-next-line svelte/prefer-writable-derived -- necesitamos mutación local (contadores tras votar), no solo reemplazo del valor.
	let measureResults = $state<Map<string, MeasureParticipationResults>>(
		data.measureParticipationResults
	);
	$effect(() => {
		measureResults = data.measureParticipationResults;
	});

	let myMeasureResponses = $state<Map<string, MeasureParticipationResponse>>(new Map());
	$effect(() => {
		if (authState.session && round) {
			listMyMeasureParticipationResponses(round.id).then((m) => (myMeasureResponses = m));
		} else {
			myMeasureResponses = new Map();
		}
	});
	const measuresRespondedCount = $derived(myMeasureResponses.size);

	let myGeneralResponse = $state(
		undefined as Awaited<ReturnType<typeof getMyGeneralParticipationResponse>>
	);
	let myPriorities = $state<Awaited<ReturnType<typeof getMyResponsePriorities>>>([]);
	let myContext = $state(undefined as Awaited<ReturnType<typeof getMyParticipantContext>>);
	$effect(() => {
		if (authState.session && round) {
			getMyGeneralParticipationResponse(round.id).then((r) => (myGeneralResponse = r));
			getMyResponsePriorities(round.id).then((p) => (myPriorities = p));
			getMyParticipantContext(round.id).then((c) => (myContext = c));
		} else {
			myGeneralResponse = undefined;
			myPriorities = [];
			myContext = undefined;
		}
	});

	// "Compromisos" solo aparece en la navegación si el tema tiene alguno
	// guardado (hoy, únicamente Sanidad); Vivienda no lo tiene y su barra de
	// navegación no cambia.
	const NAV_SECTIONS = $derived([
		{ id: 'resumen', label: 'Resumen' },
		...(data.commitments.length > 0 ? [{ id: 'compromisos', label: 'Compromisos' }] : []),
		...(topic.slug === 'plan-ceuta-2026' ? [{ id: 'circuito-72h', label: '0-72h' }] : []),
		{ id: 'medidas', label: 'Medidas' },
		{ id: 'participar', label: 'Participar' },
		{ id: 'coste', label: 'Coste' },
		{ id: 'calendario', label: 'Calendario' },
		{ id: 'riesgos', label: 'Riesgos' },
		{ id: 'fuentes', label: 'Fuentes' }
	]);

	// Horizonte temporal derivado de las fases del calendario ya publicadas
	// (años mín/máx encontrados en sus títulos), no un dato nuevo inventado.
	const planHorizon = $derived.by(() => {
		const years = data.timelinePhases.flatMap((p) => (p.title.match(/\d{4}/g) ?? []).map(Number));
		if (years.length === 0) return null;
		return `${Math.min(...years)}–${Math.max(...years)}`;
	});

	// "El problema": si el texto es largo, se colapsa tras unos ~220
	// caracteres para no abrir la página con un muro de texto.
	const PROBLEM_PREVIEW_LENGTH = 220;
	let problemExpanded = $state(false);
	let dataPointsExpanded = $state(false);
	const DATA_POINTS_PREVIEW_COUNT = 4;
	const problemIsLong = $derived((topic.problemIntro ?? '').length > PROBLEM_PREVIEW_LENGTH);
	const problemPreview = $derived(
		problemIsLong
			? `${topic.problemIntro.slice(0, PROBLEM_PREVIEW_LENGTH).trim()}…`
			: topic.problemIntro
	);

	function sourceById(id?: string) {
		return id ? data.sources.find((s) => s.id === id) : undefined;
	}

	// Ejes: agrupa las medidas publicadas para presentarlas ordenadas
	// visualmente. Es solo organización de presentación (así lo pide el
	// encargo), nunca crea medidas nuevas.
	const AXIS_ACCENTS = [
		'border-brand-200 bg-brand-50 text-brand-800',
		'border-accent-200 bg-accent-50 text-accent-800',
		'border-warning-200 bg-warning-50 text-warning-700',
		'border-ink-200 bg-ink-50 text-ink-700'
	];
	interface MeasureGroup {
		axisId: string | undefined;
		axisTitle: string | undefined;
		accent: string;
		measures: TopicMeasure[];
	}
	const measureGroups = $derived.by<MeasureGroup[]>(() => {
		const groups: MeasureGroup[] = data.axes.map((axis, i) => ({
			axisId: axis.id,
			axisTitle: axis.title,
			accent: AXIS_ACCENTS[i % AXIS_ACCENTS.length],
			measures: []
		}));
		const withoutAxis: MeasureGroup = {
			axisId: undefined,
			axisTitle: undefined,
			accent: AXIS_ACCENTS[AXIS_ACCENTS.length - 1],
			measures: []
		};
		for (const measure of data.measures) {
			const group = groups.find((g) => g.axisId === measure.axisId);
			(group ?? withoutAxis).measures.push(measure);
		}
		if (withoutAxis.measures.length > 0) groups.push(withoutAxis);
		return groups.filter((g) => g.measures.length > 0);
	});
	// Numeración continua 1..N a través de todos los ejes, no reiniciada por eje.
	const measureNumberById = $derived.by<Map<string, number>>(() => {
		const map = new SvelteMap<string, number>();
		let n = 1;
		for (const group of measureGroups) for (const m of group.measures) map.set(m.id, n++);
		return map;
	});

	// Acordeón exclusivo: solo una medida abierta a la vez para no saturar la
	// página con varios paneles largos desplegados simultáneamente.
	let expandedMeasureId = $state<string | null>(null);
	function toggleMeasure(id: string) {
		expandedMeasureId = expandedMeasureId === id ? null : id;
	}

	// Usado por el mapa visual: fuerza la apertura (no toggle) y desplaza
	// hasta la tarjeta de la medida en el contenido detallado de abajo.
	async function openMeasure(id: string) {
		expandedMeasureId = id;
		await tick();
		const el =
			document.getElementById(`topic-measure-panel-${id}`) ??
			document.getElementById(`measure-panel-${id}`);
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	}

	const totalPulsoResponses = $derived(
		[...data.concernResults.values()].reduce((sum, r) => sum + r.totalResponses, 0)
	);

	// Modificación general del tema (no ligada a una medida concreta).
	let showGeneralAltForm = $state(false);
	let generalAltTitle = $state('');
	let generalAltDescription = $state('');
	let generalAltSubmitting = $state(false);
	let generalAltSubmitted = $state(false);
	let generalAltError = $state<string | null>(null);

	async function submitGeneralAlternative(e: SubmitEvent) {
		e.preventDefault();
		if (generalAltTitle.trim().length < 5 || generalAltDescription.trim().length < 10) return;
		generalAltSubmitting = true;
		generalAltError = null;
		try {
			await submitMeasureAlternative(topic.id, {
				title: generalAltTitle.trim(),
				description: generalAltDescription.trim()
			});
			generalAltSubmitted = true;
			generalAltTitle = '';
			generalAltDescription = '';
		} catch (err) {
			generalAltError = err instanceof Error ? err.message : 'No se ha podido enviar tu propuesta.';
		} finally {
			generalAltSubmitting = false;
		}
	}
</script>

<Seo
	title={`${topic.title} — Propuestas de Convoca`}
	description={topic.summary || `Tema en preparación dentro de Pulso ciudadano: ${topic.title}.`}
/>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-24 sm:px-6 md:pb-10">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<a
			href="/pulso/soluciones"
			class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
		>
			<ArrowLeft class="size-4" /> Volver a Propuestas de Convoca
		</a>
		{#if topic.category && hasOpenListening}
			<a
				href={`/pulso/escucha/${topic.category}`}
				class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
			>
				Ver la escucha ciudadana relacionada
			</a>
		{:else if topic.category}
			<span
				class="mb-4 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500"
			>
				Escucha abierta sobre {concernCategoryLabels[topic.category].toLowerCase()} — Próximamente
			</span>
		{/if}
	</div>

	<!-- 1. Cabecera -->
	<div class="flex flex-wrap items-center gap-1.5">
		<span class="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800"
			>{categoryLabel}</span
		>
		<span
			class="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
		>
			<FileClock class="size-3.5" />
			{statusLabel}
		</span>
		<span class="text-xs text-ink-400">Versión {topic.version}</span>
	</div>
	<h1
		id="resumen"
		class="mt-2 scroll-mt-20 font-display text-2xl leading-tight font-semibold text-ink-900 sm:text-3xl"
	>
		{topic.title}
	</h1>
	{#if topic.documentTitle}
		<p class="mt-1 text-sm font-medium text-ink-500">{topic.documentTitle}</p>
	{/if}
	<p class="mt-2 text-sm leading-relaxed text-ink-700">
		{topic.summary || 'Resumen pendiente.'}
	</p>

	{#if planHorizon || topic.investmentRange || data.measures.length > 0}
		<dl class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
			{#if planHorizon}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-xs text-ink-500">Horizonte</dt>
					<dd class="font-semibold text-ink-900">{planHorizon}</dd>
				</div>
			{/if}
			{#if topic.investmentRange}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-xs text-ink-500">Inversión global</dt>
					<dd class="font-semibold text-ink-900">{topic.investmentRange}</dd>
				</div>
			{/if}
			{#if data.measures.length > 0}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-xs text-ink-500">Medidas</dt>
					<dd class="font-semibold text-ink-900">{data.measures.length}</dd>
				</div>
			{/if}
		</dl>
	{/if}

	{#if topic.category === 'vivienda' || topic.category === 'sanidad'}
		<div class="mt-5">
			<h2 class="font-display text-lg font-semibold text-ink-900 sm:text-xl">
				Así funciona {topic.documentTitle || `el ${topic.title}`}
			</h2>
			<p class="mt-1 text-sm text-ink-600">
				{topic.category === 'vivienda'
					? 'Explora cómo cada problema se conecta con una medida, una inversión y un resultado.'
					: 'Explora cómo cada causa se conecta con una medida, un plazo y un compromiso verificable.'}
			</p>
		</div>
		<div class="mt-3">
			<PlanMap
				{topic}
				measures={data.measures}
				axes={data.axes}
				timelinePhases={data.timelinePhases}
				{measureNumberById}
				mapData={topic.category === 'vivienda' ? viviendaMapData : sanidadMapData}
				onOpenMeasure={openMeasure}
			/>
		</div>
	{/if}

	<p class="mt-4 text-xs text-ink-400">
		{#if topic.publishedAt}Publicado el {formatEventDate(topic.publishedAt)} ·{/if}
		Actualizado el {topic.slug === 'plan-sanidad-2036'
			? formatEventDateWithYear(topic.updatedAt)
			: formatEventDate(topic.updatedAt)}
	</p>

	{#if topic.publicNotice}
		<div
			class="mt-3 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs leading-relaxed text-warning-700"
		>
			<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
			{topic.publicNotice}
		</div>
	{/if}
	<div
		class="mt-3 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs leading-relaxed text-warning-700"
	>
		<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
		Borrador elaborado por Convoca. No representa automáticamente la opinión de los participantes.
	</div>

	<!-- Navegación interna -->
	<nav
		aria-label="Secciones del tema"
		class="no-scrollbar mt-4 flex gap-3 overflow-x-auto border-b border-ink-100"
	>
		{#each NAV_SECTIONS as section (section.id)}
			<a
				href={`#${section.id}`}
				class="shrink-0 py-2.5 text-xs font-medium text-ink-500 hover:text-brand-700 hover:underline focus-visible:underline focus-visible:outline-none"
			>
				{section.label}
			</a>
		{/each}
	</nav>

	<!-- 2. El problema de un vistazo -->
	<section
		id="problema"
		class="mt-6 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<BookText class="size-4 text-brand-700" /> El problema de un vistazo
		</h2>
		<ContentTypeTag type="dato" class="mt-2" />
		<p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-700">
			{topic.problemIntro
				? problemExpanded || !problemIsLong
					? topic.problemIntro
					: problemPreview
				: 'Contenido pendiente.'}
		</p>
		{#if problemIsLong}
			<button
				type="button"
				onclick={() => (problemExpanded = !problemExpanded)}
				class="mt-1.5 text-sm font-semibold text-brand-700 hover:underline"
			>
				{problemExpanded ? 'Mostrar menos' : 'Comprender el problema'}
			</button>
		{/if}

		{#if data.dataPoints.length > 0}
			{@const visiblePoints = dataPointsExpanded
				? data.dataPoints
				: data.dataPoints.slice(0, DATA_POINTS_PREVIEW_COUNT)}
			<dl class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
				{#each visiblePoints as point (point.id)}
					{@const source = sourceById(point.sourceId)}
					<div class="rounded-xl border border-ink-100 p-3">
						<dt class="text-xs font-medium text-ink-500">{point.label}</dt>
						<dd class="mt-0.5 text-sm font-semibold text-ink-900">{point.value}</dd>
						{#if point.explanation}
							<p class="mt-1 text-xs leading-relaxed text-ink-600">{point.explanation}</p>
						{/if}
						{#if point.timeScope}
							<p class="mt-0.5 text-xs text-ink-400">Ámbito: {point.timeScope}</p>
						{/if}
						{#if source}
							<p class="mt-1 text-xs text-ink-400">
								Fuente:
								{#if source.url}
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer nofollow"
										class="text-brand-700 hover:underline">{source.label}</a
									>
								{:else}
									{source.label}
								{/if}
							</p>
						{/if}
					</div>
				{/each}
			</dl>
			{#if data.dataPoints.length > DATA_POINTS_PREVIEW_COUNT}
				<button
					type="button"
					onclick={() => (dataPointsExpanded = !dataPointsExpanded)}
					class="mt-2 text-sm font-semibold text-brand-700 hover:underline"
				>
					{dataPointsExpanded
						? 'Mostrar menos datos'
						: `Ver ${data.dataPoints.length - DATA_POINTS_PREVIEW_COUNT} datos más`}
				</button>
			{/if}
		{:else}
			<p class="mt-3 text-xs text-ink-400">Datos destacados pendientes de incorporar.</p>
		{/if}
	</section>

	<!-- Compromisos: puente entre el diagnóstico y las medidas. Solo aparece
	     si el tema tiene compromisos guardados (hoy, únicamente Sanidad);
	     Vivienda no tiene filas y esta sección no se renderiza para ella. -->
	{#if data.commitments.length > 0}
		<section
			id="compromisos"
			class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
		>
			<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
				<ShieldCheck class="size-4 text-brand-700" /> Cinco compromisos que deben poder comprobarse
			</h2>
			<ContentTypeTag type="convoca" class="mt-2" />
			<p class="mt-2 text-sm leading-relaxed text-ink-700">
				{topic.category === 'sanidad' ? 'El' : 'La propuesta de'}
				{topic.documentTitle || topic.title} no se limita a proponer más recursos: establece compromisos
				concretos, plazos, indicadores y mecanismos de evaluación.
			</p>
			<ol class="mt-3 flex flex-col gap-3">
				{#each data.commitments as commitment, i (commitment.id)}
					<li class="flex gap-3 rounded-xl border border-ink-100 p-3">
						<span
							class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
							>{i + 1}</span
						>
						<div class="min-w-0">
							<p class="text-sm font-semibold text-ink-900">{commitment.title}</p>
							<p class="mt-1 text-sm leading-relaxed text-ink-700">{commitment.description}</p>
						</div>
					</li>
				{/each}
			</ol>
			<p class="mt-3 text-xs text-ink-400">
				Compromisos propuestos para 2036, todavía por cumplir: no son resultados ya alcanzados.
			</p>
		</section>
	{/if}

	<!-- Circuito operativo 0-72h: exclusivo de Plan Ceuta, sin equivalente en
	     Vivienda/Sanidad. No toca la navegación ni el contenido de ningún
	     otro tema. -->
	{#if topic.slug === 'plan-ceuta-2026'}
		<section
			id="circuito-72h"
			class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
		>
			<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
				<History class="size-4 text-brand-700" /> De 0 a 72 horas: el reloj que nadie puede parar
			</h2>
			<ContentTypeTag type="convoca" class="mt-2" />
			<p class="mt-2 text-sm leading-relaxed text-ink-700">
				Las 72 horas no son una promesa de expulsión automática. Son el límite legal que obliga a
				que cada expediente llegue a una salida: devolución ejecutada, salida voluntaria informada,
				asilo activado, protección de menores, petición judicial de internamiento o libertad.
				Explora cada tramo.
			</p>
			<div class="mt-4">
				<CeutaCircuito72h />
			</div>
		</section>
	{/if}

	<!-- 3 + 4. Organización de medidas y tarjetas -->
	<section id="medidas" class="mt-8 scroll-mt-20">
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<Lightbulb class="size-4 text-brand-700" /> Medidas
		</h2>
		{#if data.axes.length > 0}
			<p class="mt-1 text-xs text-ink-400">
				Las medidas se agrupan en ejes solo para facilitar la lectura: no son propuestas
				adicionales.
			</p>
		{/if}
		{#if data.measures.length > 0}
			<div class="mt-3 flex flex-col gap-5">
				{#each measureGroups as group (group.axisId ?? 'sin-eje')}
					<div>
						{#if group.axisTitle}
							<h3
								class={`mb-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${group.accent}`}
							>
								{group.axisTitle}
							</h3>
						{/if}
						<div class="flex flex-col gap-3">
							{#each group.measures as measure (measure.id)}
								{@const results = measureResults.get(measure.id) ?? {
									measureId: measure.id,
									positionCounts: { favor: 0, con_cambios: 0, en_contra: 0, mas_info: 0 },
									urgencyCounts: {},
									reasonCounts: {},
									totalResponses: 0
								}}
								{@const measureSources = (data.measureSourceIds.get(measure.id) ?? [])
									.map((id) => sourceById(id))
									.filter((s): s is NonNullable<typeof s> => Boolean(s))}
								{#if usesSimpleParticipation}
									<SimpleMeasureCard
										{measure}
										number={measureNumberById.get(measure.id) ?? 0}
										{round}
										{results}
										myResponse={myMeasureResponses.get(measure.id)}
										sources={measureSources}
										expanded={expandedMeasureId === measure.id}
										onToggle={() => toggleMeasure(measure.id)}
									/>
								{:else}
									<TopicMeasureCard
										{measure}
										topicId={topic.id}
										number={measureNumberById.get(measure.id) ?? 0}
										{round}
										{results}
										myResponse={myMeasureResponses.get(measure.id)}
										sources={measureSources}
										expanded={expandedMeasureId === measure.id}
										onToggle={() => toggleMeasure(measure.id)}
									/>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="mt-3 rounded-2xl border border-dashed border-ink-200 bg-white py-10 text-center">
				<p class="text-sm text-ink-500">Todavía no hay medidas propuestas para este tema.</p>
			</div>
		{/if}
	</section>

	<!-- Participar (cierre de participación general) -->
	<section id="participar" class="mt-8 scroll-mt-20">
		{#if topic.slug === 'plan-ceuta-2026'}
			<div
				class="mb-4 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs leading-relaxed text-warning-700"
			>
				<AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
				Esta participación queda registrada en CONVOCA, pero no constituye una firma oficial, una firma
				válida para una ILP ni una adhesión presentada ante una Administración.
			</div>
		{/if}
		{#if usesSimpleParticipation}
			<SimpleGeneralParticipationBlock
				{round}
				{myGeneralResponse}
				generalResults={data.generalResults}
				summary={data.summary}
			/>
		{:else}
			<GeneralParticipationBlock
				{round}
				measures={data.measures}
				{measuresRespondedCount}
				{myGeneralResponse}
				{myPriorities}
				{myContext}
				generalResults={data.generalResults}
				priorityResults={data.priorityResults}
				summary={data.summary}
			/>
		{/if}
	</section>

	<!-- 6. Coste y calendario -->
	<section
		id="coste"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<Coins class="size-4 text-brand-700" /> Coste
		</h2>
		<ContentTypeTag type="convoca" class="mt-2" />
		<div class="mt-3">
			{#if topic.slug === 'plan-sanidad-2036'}
				<SanidadPresupuesto />
			{:else if topic.slug === 'plan-ceuta-2026'}
				<CeutaPresupuesto />
			{:else}
				<CosteEconomico
					{topic}
					measures={data.measures}
					axes={data.axes}
					budgetLines={data.budgetLines}
					budgetScenarios={data.budgetScenarios}
					budgetTimeline={data.budgetTimeline}
				/>
			{/if}
		</div>
	</section>

	<section
		id="calendario"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<CalendarRange class="size-4 text-brand-700" /> Calendario
		</h2>
		<ContentTypeTag type="convoca" class="mt-2" />
		<div class="mt-4">
			{#if topic.slug === 'plan-sanidad-2036'}
				<SanidadCalendario />
			{:else}
				<CalendarioVisual
					measures={data.measures}
					axes={data.axes}
					phases={data.timelinePhases}
					phaseStatuses={data.measurePhaseStatuses}
				/>
			{/if}
		</div>
	</section>

	<!-- 7. Riesgos y comprobación -->
	<section
		id="riesgos"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<AlertTriangle class="size-4 text-brand-700" /> Riesgos y comprobación
		</h2>
		<ContentTypeTag type="convoca" class="mt-2" />
		<div class="mt-4">
			{#if topic.slug === 'plan-sanidad-2036'}
				<SanidadRiesgos />
			{:else}
				<RiesgosComprobacion
					{topic}
					risks={data.risks}
					evaluationMoments={data.evaluationMoments}
					measureChangeConditions={data.measureChangeConditions}
				/>
			{/if}
		</div>
	</section>

	<!-- 8. Pulso ciudadano -->
	<section
		id="pulso"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<Activity class="size-4 text-brand-700" /> Lo que dice la ciudadanía
		</h2>
		<ContentTypeTag type="pulso" class="mt-2" />
		{#if data.concerns.length > 0}
			<p class="mt-2 text-xs text-ink-400">
				{totalPulsoResponses}
				{totalPulsoResponses === 1 ? 'participación registrada' : 'participaciones registradas'} en las
				preguntas vinculadas. Los resultados reflejan solo a quienes han participado, no son representativos
				del conjunto de la población. El desglose territorial estará disponible más adelante.
			</p>
			<ul class="mt-3 flex flex-col gap-3">
				{#each data.concerns as concern (concern.id)}
					{@const results = data.concernResults.get(concern.id) ?? {
						concernId: concern.id,
						counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
						totalResponses: 0
					}}
					<li class="rounded-xl border border-ink-100 p-3">
						<a
							href={`/pulso/${concern.slug}`}
							class="text-sm font-medium text-ink-900 hover:text-brand-700 hover:underline"
						>
							{concern.question}
						</a>
						<div class="mt-2">
							<ConcernResultsChart {results} compact />
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-ink-500">
				Todavía no hay preguntas de Pulso vinculadas a este tema, ni participación registrada.
			</p>
		{/if}
	</section>

	<!-- Fuentes -->
	<section
		id="fuentes"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<BookText class="size-4 text-brand-700" /> Fuentes
		</h2>
		{#if data.sources.length > 0}
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each data.sources as source (source.id)}
					<li class="text-sm">
						{#if source.url}
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer nofollow"
								class="text-brand-700 hover:underline"
							>
								{source.label}
							</a>
						{:else}
							<span class="text-ink-800">{source.label}</span>
						{/if}
						{#if source.note}<span class="text-ink-500"> — {source.note}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-ink-500">Fuente pendiente.</p>
		{/if}
	</section>

	<!-- 9. Cierre de página -->
	<section
		id="cierre"
		class="mt-8 scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<History class="size-4 text-brand-700" /> Historial de versiones
		</h2>
		{#if data.versions.length > 0}
			<ul class="mt-2 flex flex-col gap-1.5">
				{#each data.versions as version (version.id)}
					<li class="text-sm text-ink-700">
						<span class="font-semibold text-ink-900">Versión {version.versionLabel}</span>
						— {formatEventDate(version.publishedAt)}
						{#if version.note}<span class="text-ink-500"> · {version.note}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-ink-500">Todavía no se ha publicado ninguna versión con nota.</p>
		{/if}

		<div class="mt-4 border-t border-ink-100 pt-4">
			<p class="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
				<MessagesSquare class="size-4 text-brand-700" /> Proponer una modificación general del tema
			</p>
			{#if authState.session}
				{#if showGeneralAltForm}
					{#if generalAltSubmitted}
						<p class="mt-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
							Tu propuesta se ha enviado a revisión. No se publica automáticamente.
						</p>
					{:else}
						<form class="mt-2.5 space-y-2" onsubmit={submitGeneralAlternative}>
							{#if generalAltError}
								<p class="text-critical-600 text-sm" role="alert">{generalAltError}</p>
							{/if}
							<input
								bind:value={generalAltTitle}
								maxlength="120"
								placeholder="Título de tu propuesta"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							/>
							<textarea
								bind:value={generalAltDescription}
								rows="3"
								maxlength="600"
								placeholder="Describe tu propuesta sobre el tema en general…"
								class="w-full rounded-xl border-ink-200 text-sm focus:border-brand-500 focus:ring-brand-500"
							></textarea>
							<div class="flex gap-2">
								<button
									type="submit"
									disabled={generalAltSubmitting ||
										generalAltTitle.trim().length < 5 ||
										generalAltDescription.trim().length < 10}
									class="rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
								>
									{generalAltSubmitting ? 'Enviando…' : 'Enviar propuesta'}
								</button>
								<button
									type="button"
									onclick={() => (showGeneralAltForm = false)}
									class="rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
								>
									Cancelar
								</button>
							</div>
						</form>
					{/if}
				{:else}
					<button
						type="button"
						onclick={() => (showGeneralAltForm = true)}
						class="mt-2 text-sm font-semibold text-brand-700 hover:underline"
					>
						Proponer una modificación general
					</button>
				{/if}
			{:else}
				<a
					href={`/login?redirect=${encodeURIComponent(`/pulso/soluciones/${topic.slug}`)}`}
					class="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
				>
					Inicia sesión para proponer una modificación general
				</a>
			{/if}
		</div>
	</section>

	<!-- Acción -->
	<section
		id="accion"
		class="mt-8 scroll-mt-20 rounded-2xl border border-dashed border-ink-200 bg-white p-4 sm:p-5"
	>
		<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
			<Rocket class="size-4 text-brand-700" /> Acción
		</h2>
		<p class="mt-2 text-sm text-ink-500">
			<LinkIcon class="mb-0.5 inline size-3.5" /> Próximamente: aquí se podrán vincular campañas, peticiones,
			adhesiones, comunicaciones institucionales o convocatorias relacionadas con este tema.
		</p>
	</section>

	{#if topic.category === 'sanidad'}
		<section class="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4 sm:p-5">
			<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
				<Ear class="size-4 text-brand-700" /> Ahora queremos escucharte
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-ink-700">
				Ya puedes valorar cada medida del plan. En esta escucha queremos ir un paso más allá: saber
				qué problemas consideras prioritarios y qué soluciones todavía faltan.
			</p>
			<a
				href="/pulso/escucha/sanidad"
				class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
			>
				Participar en la escucha sobre sanidad <ArrowRight class="size-3.5" />
			</a>
		</section>
	{/if}
</div>
