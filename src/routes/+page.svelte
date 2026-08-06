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
	<section class="reveal-section border-t border-ink-100">
		<div use:reveal class="mx-auto max-w-2xl px-4 pt-20 text-center sm:px-6 sm:pt-28">
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

		<!-- Secuencia aspiracional (9 escenas) — nuevo diseño "El sistema
		     nervioso ciudadano". Solo versión móvil por ahora; la versión
		     desktop se añadirá en una segunda pasada con <picture> como en
		     el diseño anterior. Cada escena conserva su propio ratio de
		     imagen (object-contain) para no recortar contenido.
		     `use:reveal` va en cada escena individual, no en la <section>:
		     con 9 escenas la sección es demasiado alta para que el 15% de
		     intersección del propio elemento se alcance pronto, así que
		     aplicarlo a toda la sección dejaba el bloque entero en opacidad
		     0 (en blanco) durante gran parte del scroll. -->
		<div use:reveal class="mx-auto mt-4 max-w-xs px-4 text-center sm:mt-6 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-01-mobile.webp"
					alt="Mapa iluminado con nodos de conversación conectando los municipios de un territorio, con la etiqueta 'Tu municipio' señalando un punto concreto."
					width="864"
					height="1821"
					loading="lazy"
					decoding="async"
					class="aspect-[864/1821] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						Cada municipio tiene su propio espacio de escucha: la ciudadanía comparte lo que le
						preocupa en su territorio, sin filtros ni etiquetas.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-02-mobile.webp"
					alt="Un medidor en forma de arco que va de 'Aún no suficiente' a 'Participación suficiente', mostrando cuándo se activa el agente municipal de CONVOCA."
					width="862"
					height="1825"
					loading="lazy"
					decoding="async"
					class="aspect-[862/1825] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						El sistema no se activa por ruido aislado, sino cuando una preocupación es compartida
						por suficientes voces: cuantas más, más fuerza tiene la comunidad.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-03-mobile.webp"
					alt="Un cerebro conectado a múltiples burbujas de conversación de colores que la IA agrupa y ordena en categorías: casos individuales, patrones, alertas y aportaciones."
					width="863"
					height="1823"
					loading="lazy"
					decoding="async"
					class="aspect-[863/1823] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						La IA agrupa, interpreta y organiza la escucha sin borrar matices: distingue casos
						individuales de patrones colectivos y conserva el origen de cada aportación.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-04-mobile.webp"
					alt="Un cerebro central conectado a varios grupos de personas repartidos por un mapa de municipios, representando patrones compartidos entre territorios."
					width="864"
					height="1821"
					loading="lazy"
					decoding="async"
					class="aspect-[864/1821] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						La IA detecta patrones compartidos entre municipios y conecta soluciones que ya han
						funcionado en otros territorios, sin borrar lo local.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-05-mobile.webp"
					alt="Un diagrama que conecta problemas detectados en los municipios —vivienda, transporte, contaminación, salud mental, servicios sociales, cobertura digital— con el nivel institucional competente: ayuntamiento, diputación, comunidad autónoma o Estado."
					width="1024"
					height="1536"
					loading="lazy"
					decoding="async"
					class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						Cada propuesta toma la ruta correcta: el sistema dirige cada problema al nivel
						institucional con la competencia y la capacidad real de actuar.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-06-mobile.webp"
					alt="Un borrador de plan en el centro rodeado de seis agentes de IA especializados: económico, jurídico, de evidencia, de implementación, de riesgos y de participación ciudadana."
					width="1024"
					height="1536"
					loading="lazy"
					decoding="async"
					class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						Un gabinete de agentes especializados —económico, jurídico, de riesgos, de
						participación— contrasta cada propuesta desde todas las perspectivas antes de
						convertirla en un plan sólido.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-07-mobile.webp"
					alt="Un plan propuesto con medidas, coste, calendario y nivel de consenso, junto a tres opciones para la ciudadanía: aprobar, corregir o rechazar."
					width="878"
					height="1792"
					loading="lazy"
					decoding="async"
					class="aspect-[878/1792] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						La IA propone, las personas deciden: el plan se revisa y se corrige hasta alcanzar un
						consenso real. La decisión final siempre es humana.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 text-center sm:mt-14 sm:max-w-sm sm:px-6">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-08-mobile.webp"
					alt="Un mapa de España con nodos iluminados mostrando el escalado territorial de una propuesta: de municipio a comarca, provincia, comunidad autónoma y Estado."
					width="863"
					height="1822"
					loading="lazy"
					decoding="async"
					class="aspect-[863/1822] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						Cada propuesta empieza en un municipio y puede escalar de la comarca a la provincia, la
						comunidad y el Estado: lo que funciona en un lugar inspira a otro.
					</p>
				</figcaption>
			</figure>
		</div>

		<div use:reveal class="mx-auto mt-10 max-w-xs px-4 pb-16 text-center sm:mt-14 sm:max-w-sm sm:px-6 sm:pb-20">
			<figure>
				<img
					src="/vision/vision-sistema-nervioso-09-mobile.webp"
					alt="Iconos de código abierto, datos abiertos, gobernanza ciudadana, financiación transparente y sostenibilidad, junto a las formas de participar en CONVOCA."
					width="1024"
					height="1536"
					loading="lazy"
					decoding="async"
					class="aspect-[2/3] w-full rounded-2xl border border-ink-100 object-contain shadow-sm"
				/>
				<figcaption class="mt-3">
					<p class="mx-auto max-w-sm text-xs leading-relaxed text-ink-500">
						Un proyecto abierto, transparente y sostenible: código abierto, datos abiertos y
						gobernanza ciudadana. Convoca es de la ciudadanía y para la ciudadanía.
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
