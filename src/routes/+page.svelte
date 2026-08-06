<script lang="ts">
	import { CheckCircle2, Compass } from '@lucide/svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { reveal } from '$lib/actions/reveal';
	import HomeIntro from '$lib/components/HomeIntro.svelte';

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
</script>

<Seo
	title="El proyecto"
	description="Qué es Convoca, por qué nació, cómo funciona y a qué aspira: una herramienta ciudadana para escuchar, construir soluciones abiertas y convertirlas en pasos reales."
/>

<article>
	<HomeIntro />

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

	<!-- 6. A QUÉ ASPIRA — contenedor aspiracional independiente.
	     Deliberadamente breve: reservado para alojar más adelante otro
	     artifact o una pieza visual horizontal sobre la aspiración final
	     de Convoca. No añadir aquí explicaciones de funcionamiento. -->
	<section use:reveal class="reveal-section border-t border-ink-100">
		<div class="mx-auto max-w-2xl px-4 pt-20 text-center sm:px-6 sm:pt-28">
			<h2 class="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
				Una infraestructura democrática al alcance de cualquiera
			</h2>
			<p class="mt-2 text-xs font-semibold tracking-wide text-accent-600 uppercase">
				La visión futura de CONVOCA
			</p>
			<p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-700 sm:text-lg">
				Convoca aspira a que cualquier persona pueda abrir el mapa de su país o de su municipio y
				comprender qué preocupa a su comunidad.
			</p>
		</div>

		<!-- Escena piloto (1/9) — prueba de integración de una única escena de
		     la futura secuencia visual aspiracional. No generar el resto de
		     escenas ni construir galería/carrusel hasta validar esta prueba.
		     Contenedor propio (más ancho que el bloque de texto de arriba)
		     para que la pieza horizontal tenga presencia real en escritorio.
		     <picture> sirve la versión horizontal solo desde `sm` (≥640px);
		     por debajo de eso el móvil sigue viendo exactamente la misma
		     imagen vertical de antes. -->
		<div
			class="mx-auto mt-4 max-w-xs px-4 text-center sm:mt-6 sm:max-w-4xl sm:translate-x-1 sm:px-6 lg:max-w-6xl lg:translate-x-2"
		>
			<figure>
				<picture>
					<source
						srcset="/vision/vision-sistema-nervioso-01-desktop.webp"
						media="(min-width: 640px)"
					/>
					<img
						src="/vision/vision-sistema-nervioso-01-mobile.webp"
						alt="Un grupo de personas observa desde una colina un mapa de España iluminado por una red de nodos conectados entre municipios: la visión de Convoca como un sistema nervioso ciudadano."
						width="1024"
						height="1536"
						loading="lazy"
						decoding="async"
						class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm sm:aspect-[1717/916]"
					/>
				</picture>
				<figcaption class="mt-3">
					<p class="text-xs font-medium text-ink-400">1 / 9</p>
					<p class="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-500">
						Cada municipio escucha. Los patrones se conectan. La ciudadanía decide: la visión busca
						convertir voces ciudadanas en planes públicos verificables.
					</p>
					<p class="mt-3 text-[11px] text-ink-400 italic">
						Primera escena de una secuencia en desarrollo.
					</p>
				</figcaption>
			</figure>
		</div>

		<!-- Escena 2 (2/9) — misma imagen que en la 01: <picture> sirve la
		     versión horizontal propia desde `sm` (≥640px); por debajo el
		     móvil ve la imagen vertical. La versión desktop conserva su
		     encuadre completo (título y franja inferior íntegros), por eso
		     usa su propio ratio (1717/1145) en vez del de la escena 1. -->
		<div
			class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-4xl sm:translate-x-1 sm:px-6 lg:max-w-6xl lg:translate-x-2"
		>
			<figure>
				<picture>
					<source
						srcset="/vision/vision-sistema-nervioso-02-desktop.webp"
						media="(min-width: 640px)"
					/>
					<img
						src="/vision/vision-sistema-nervioso-02-mobile.webp"
						alt="Representación de un municipio conectado digitalmente donde las preocupaciones, propuestas y realidades locales alimentan el sistema ciudadano de CONVOCA."
						width="1024"
						height="1536"
						loading="lazy"
						decoding="async"
						class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm sm:aspect-[1717/1145]"
					/>
				</picture>
				<figcaption class="mt-3">
					<p class="text-xs font-medium text-ink-400">2 / 9</p>
					<p class="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-500">
						Cada municipio conserva su propio espacio de escucha, con preocupaciones que mantienen
						su contexto territorial. La participación puede hacerse de forma digital, y esas voces
						locales alimentan una red ciudadana más amplia.
					</p>
					<p class="mt-3 text-[11px] text-ink-400 italic">
						Segunda escena de una secuencia en desarrollo.
					</p>
				</figcaption>
			</figure>
		</div>

		<!-- Escena 3 (3/9) — mismo patrón que la escena 2: <picture> sirve la
		     versión horizontal propia desde `sm` (≥640px), con su encuadre
		     completo (mismo ratio 1717/1145, sin recortes). -->
		<div
			class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-4xl sm:translate-x-1 sm:px-6 lg:max-w-6xl lg:translate-x-2"
		>
			<figure>
				<picture>
					<source
						srcset="/vision/vision-sistema-nervioso-03-desktop.webp"
						media="(min-width: 640px)"
					/>
					<img
						src="/vision/vision-sistema-nervioso-03-mobile.webp"
						alt="Una persona consulta la aplicación de CONVOCA en su móvil sobre la ciudad: sus propuestas se priorizan junto a las de miles de ciudadanos y se convierten en planes de acción."
						width="1024"
						height="1536"
						loading="lazy"
						decoding="async"
						class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm sm:aspect-[1717/1145]"
					/>
				</picture>
				<figcaption class="mt-3">
					<p class="text-xs font-medium text-ink-400">3 / 9</p>
					<p class="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-500">
						La participación ciudadana se organiza, se estructura y se transforma en propuestas
						reales: de las preocupaciones a planes verificables que la comunidad puede impulsar.
					</p>
					<p class="mt-3 text-[11px] text-ink-400 italic">
						Tercera escena de una secuencia en desarrollo.
					</p>
				</figcaption>
			</figure>
		</div>

		<!-- Escena 4 (4/9) — todavía sin versión panorámica propia, por eso
		     conserva el tratamiento vertical (mismo patrón que las escenas
		     2 y 3 antes de recibir su versión desktop). -->
		<div
			class="mx-auto mt-10 max-w-xs px-4 pb-16 text-center sm:mt-14 sm:max-w-sm sm:px-6 sm:pb-20"
		>
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-04-mobile.webp"
					alt="Una persona consulta en su móvil el plan de CONVOCA en construcción con la ciudadanía: prioridades, recursos, acciones y seguimiento del avance."
					width="1024"
					height="1536"
					loading="lazy"
					decoding="async"
					class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="text-xs font-medium text-ink-400">4 / 9</p>
					<p class="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-500">
						Lo que importa se convierte en prioridades, recursos y acciones verificables: un plan
						que nace de las personas y se revisa, mide y ajusta junto a la ciudadanía.
					</p>
					<p class="mt-3 text-[11px] text-ink-400 italic">
						Cuarta escena de una secuencia en desarrollo.
					</p>
				</figcaption>
			</figure>
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
