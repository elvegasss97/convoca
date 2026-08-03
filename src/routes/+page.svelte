<script lang="ts">
	import {
		ArrowRight,
		Ear,
		ListOrdered,
		Hammer,
		Megaphone,
		ClipboardCheck,
		Landmark,
		Building2,
		Users,
		CheckCircle2,
		Compass
	} from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { reveal } from '$lib/actions/reveal';

	const journey = [
		{
			icon: Ear,
			title: 'Escuchar',
			text: 'Detectar qué preocupa realmente a la ciudadanía.'
		},
		{
			icon: ListOrdered,
			title: 'Priorizar',
			text: 'Ordenar los problemas por impacto, urgencia y apoyo.'
		},
		{
			icon: Hammer,
			title: 'Construir',
			text: 'Crear soluciones abiertas con medidas concretas.'
		},
		{
			icon: Megaphone,
			title: 'Actuar',
			text: 'Facilitar la participación, la organización y la llegada a las instituciones.'
		},
		{
			icon: ClipboardCheck,
			title: 'Comprobar',
			text: 'Publicar avances, resultados y corregir lo que no funcione.'
		}
	];

	const timeline = [
		{
			label: 'Primero',
			text: 'Facilitar convocatorias y organización ciudadana.',
			future: false
		},
		{
			label: 'Después',
			text: 'Medir preocupaciones mediante Pulso Ciudadano.',
			future: false
		},
		{
			label: 'Ahora',
			text: 'Transformar la escucha en soluciones abiertas y comprobables.',
			future: false
		},
		{
			label: 'Próximo paso',
			text: 'Llevar ese proceso también a municipios y comunidades.',
			future: true
		}
	];

	const principles = [
		'Participación abierta.',
		'Pluralidad política.',
		'Transparencia en decisiones y financiación.',
		'Propuestas con plazos, presupuesto y evaluación.',
		'Datos públicos y comprensibles.',
		'Corrección cuando una medida no funcione.',
		'Independencia frente a intereses partidistas.'
	];

	const scales = [
		{
			icon: Landmark,
			title: 'Nacional',
			text: 'Grandes preocupaciones y planes públicos.'
		},
		{
			icon: Building2,
			title: 'Municipal',
			text: 'Escucha local, propuestas y guías de actuación.'
		},
		{
			icon: Users,
			title: 'Comunidad',
			text: 'Personas capaces de organizarse alrededor de objetivos concretos.'
		}
	];
</script>

<Seo
	title="El proyecto"
	description="Qué es Convoca, por qué nació, cómo funciona y a qué aspira: una herramienta ciudadana para escuchar, construir soluciones abiertas y convertirlas en pasos reales."
/>

<article>
	<!-- 1. HERO -->
	<section class="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
		<h1
			class="font-display text-3xl font-semibold text-balance text-ink-900 sm:text-4xl md:text-5xl"
		>
			De la preocupación a la propuesta.<br />
			De la propuesta a la acción.
		</h1>
		<p class="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
			Convoca es una herramienta ciudadana para escuchar lo que importa, construir soluciones
			abiertas y convertirlas en pasos reales.
		</p>
		<div class="mt-7 flex flex-wrap items-center justify-center gap-3">
			<a
				href="/pulso"
				class="flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
			>
				Explorar Pulso Ciudadano <ArrowRight class="size-4" />
			</a>
			<a
				href="/pulso/escucha"
				class="flex items-center gap-1.5 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
			>
				Participar en Convoca <ArrowRight class="size-4" />
			</a>
		</div>
	</section>

	<!-- 2. QUÉ ES CONVOCA -->
	<section use:reveal class="reveal-section border-t border-ink-100 bg-white">
		<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
			<h2 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Un lugar para construir, no solo para opinar
			</h2>
			<p class="mt-4 text-base leading-relaxed text-ink-700 sm:text-lg">
				Cada día miles de personas comparten las mismas preocupaciones, pero esas voces suelen
				quedar dispersas entre titulares, comentarios y conversaciones aisladas. Convoca quiere
				reunirlas, hacerlas comprensibles y convertirlas en propuestas que puedan avanzar.
			</p>

			<ul class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<li class="rounded-2xl border border-ink-100 px-4 py-3.5 text-center">
					<p class="font-display text-sm font-semibold text-ink-900">No es un partido.</p>
				</li>
				<li class="rounded-2xl border border-ink-100 px-4 py-3.5 text-center">
					<p class="font-display text-sm font-semibold text-ink-900">No te dice qué pensar.</p>
				</li>
				<li class="rounded-2xl border border-ink-100 px-4 py-3.5 text-center">
					<p class="font-display text-sm font-semibold text-ink-900">
						No promete tener todas las respuestas.
					</p>
				</li>
			</ul>

			<p class="mt-8 text-base leading-relaxed font-medium text-ink-800 sm:text-lg">
				Es una infraestructura ciudadana en construcción para escuchar, debatir, proponer,
				organizarse y comprobar si las soluciones funcionan.
			</p>

			<div class="mt-8 rounded-2xl border border-ink-100 bg-ink-50 p-5 sm:p-6">
				<p class="text-sm leading-relaxed text-ink-700 sm:text-base">
					Organizarse también tiene una forma muy concreta: las <strong class="font-semibold"
						>convocatorias</strong
					>, manifestaciones, concentraciones, recogidas de firmas y otras acciones ciudadanas que
					cualquiera puede publicar, descubrir cerca de su ciudad y confirmar su asistencia sin
					exponer su identidad.
				</p>
				<a
					href="/descubrir"
					class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
				>
					Explorar convocatorias activas <ArrowRight class="size-3.5" />
				</a>
			</div>
		</div>
	</section>

	<!-- 3. CÓMO NACIÓ -->
	<section use:reveal class="reveal-section">
		<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
			<h2 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Convoca nació de una pregunta
			</h2>
			<p class="mt-4 font-display text-lg font-medium text-balance text-brand-800 sm:text-xl">
				¿Qué ocurre cuando muchas personas comparten una preocupación, pero no existe un camino
				claro para convertirla en una respuesta colectiva?
			</p>
			<p class="mt-5 text-base leading-relaxed text-ink-700">
				La movilización ciudadana suele aparecer cuando un problema ya es urgente. Convoca comenzó
				como una forma de facilitar esa organización, pero pronto surgió una ambición mayor:
				construir también el camino anterior y posterior a la movilización.
			</p>
			<p class="mt-3 text-base leading-relaxed text-ink-700">
				Escuchar antes de actuar. Comprender antes de proponer. Y mantener el seguimiento después de
				exigir una respuesta.
			</p>

			<ol class="mt-9 flex flex-col gap-3">
				{#each timeline as stage, i (stage.label)}
					<li
						class="flex items-start gap-3 rounded-2xl border p-4 {stage.future
							? 'border-dashed border-ink-200'
							: 'border-ink-100 bg-white'}"
					>
						<span
							class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold {stage.future
								? 'border border-dashed border-ink-300 text-ink-400'
								: 'bg-brand-700 text-white'}"
						>
							{#if stage.future}
								<span class="sr-only">Visión futura</span>
								{i + 1}
							{:else}
								<CheckCircle2 class="size-4" />
							{/if}
						</span>
						<div>
							<p class="text-sm font-semibold {stage.future ? 'text-ink-500' : 'text-ink-900'}">
								{stage.label}
								{#if stage.future}
									<span
										class="ml-1.5 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-500"
										>Visión futura</span
									>
								{/if}
							</p>
							<p class="mt-0.5 text-sm text-ink-600">{stage.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- 4. EL CAMINO DE CONVOCA -->
	<section use:reveal class="reveal-section border-t border-ink-100 bg-brand-50">
		<div class="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
			<h2 class="text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				El camino de Convoca
			</h2>
			<ol
				class="mt-10 flex flex-col gap-0 sm:flex-row sm:items-stretch sm:justify-between sm:gap-2"
			>
				{#each journey as step, i (step.title)}
					<li class="flex flex-1 flex-col items-center gap-2 px-2 py-2 text-center">
						<span
							class="flex size-12 items-center justify-center rounded-full bg-brand-700 text-white"
						>
							<step.icon class="size-5.5" strokeWidth={2.25} />
						</span>
						<p class="font-display text-sm font-semibold text-ink-900">{step.title}</p>
						<p class="max-w-[16rem] text-xs leading-relaxed text-ink-600 sm:max-w-none">
							{step.text}
						</p>
					</li>
					{#if i < journey.length - 1}
						<li
							class="flex shrink-0 items-center justify-center py-1 text-brand-400 sm:rotate-0"
							aria-hidden="true"
						>
							<ArrowRight class="hidden size-5 sm:block" />
							<ArrowRight class="size-5 rotate-90 sm:hidden" />
						</li>
					{/if}
				{/each}
			</ol>
		</div>
	</section>

	<!-- 5. PRINCIPIOS -->
	<section use:reveal class="reveal-section bg-white">
		<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
			<h2 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Las reglas que deben proteger la idea
			</h2>
			<ul class="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
				{#each principles as principle (principle)}
					<li class="flex items-start gap-2.5 text-sm text-ink-700 sm:text-base">
						<CheckCircle2 class="mt-0.5 size-4.5 shrink-0 text-brand-600" />
						{principle}
					</li>
				{/each}
			</ul>
			<blockquote
				class="mt-9 border-l-4 border-accent-400 pl-5 font-display text-lg font-medium text-balance text-ink-900 sm:text-xl"
			>
				Convoca no nace para sustituir la democracia, sino para hacerla más continua, comprensible y
				participativa.
			</blockquote>
		</div>
	</section>

	<!-- 6. A QUÉ ASPIRA -->
	<section use:reveal class="reveal-section border-t border-ink-100">
		<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
			<h2 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Una infraestructura democrática al alcance de cualquiera
			</h2>
			<p class="mt-4 text-base leading-relaxed text-ink-700 sm:text-lg">
				Convoca aspira a que cualquier persona pueda abrir el mapa de su país o de su municipio,
				comprender qué preocupa a su comunidad, participar en la construcción de soluciones y
				conocer los pasos necesarios para llevarlas hasta las instituciones.
			</p>

			<div class="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-3">
				{#each scales as scale (scale.title)}
					<div class="flex flex-col items-center gap-2 text-center">
						<span
							class="flex size-11 items-center justify-center rounded-full bg-accent-100 text-accent-700"
						>
							<scale.icon class="size-5" strokeWidth={2.25} />
						</span>
						<p class="font-display text-sm font-semibold text-ink-900">{scale.title}</p>
						<p class="text-xs leading-relaxed text-ink-600">{scale.text}</p>
					</div>
				{/each}
			</div>

			<p class="mt-9 text-base leading-relaxed font-medium text-ink-800 sm:text-lg">
				No queremos que participar signifique únicamente votar, firmar o protestar. Queremos que
				también signifique comprender, proponer, colaborar y comprobar.
			</p>
		</div>
	</section>

	<!-- 7. CIERRE -->
	<section use:reveal class="reveal-section bg-brand-900 text-white">
		<div class="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
			<p class="font-display text-2xl font-semibold text-balance sm:text-3xl md:text-4xl">
				La democracia no debería terminar en las urnas.<br />
				Debería continuar todos los días.
			</p>
			<p class="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-brand-100 sm:text-base">
				Convoca todavía no está terminada. Y esa es precisamente la idea: construirla con la
				ciudadanía, no entregársela ya decidida.
			</p>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
				<a
					href="/pulso/escucha"
					class="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
				>
					Ver las preocupaciones ciudadanas
				</a>
				<a
					href="/pulso/soluciones"
					class="flex items-center gap-1.5 rounded-full border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
				>
					Conocer las propuestas
				</a>
				<a
					href="/crear"
					class="flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
				>
					<Compass class="size-4" /> Crear una convocatoria
				</a>
			</div>
		</div>
	</section>
</article>

<style>
	:global(.reveal-init) {
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 0.6s ease-out,
			transform 0.6s ease-out;
	}
	:global(.reveal-visible) {
		opacity: 1;
		transform: translateY(0);
	}
</style>
