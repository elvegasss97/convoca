<script lang="ts">
	import { ShieldCheck, ChevronDown, ChevronUp } from '@lucide/svelte';
	import type { Topic } from '$lib/types';
	import type { TopicMethodologyInfo } from '$lib/data/topicMethodologyData';
	import { formatEventDateWithYear } from '$lib/utils/date';
	import ProposalSourcesPanel from '$lib/components/pulso/ProposalSourcesPanel.svelte';

	interface Props {
		topic: Topic;
		methodology: TopicMethodologyInfo;
	}

	let { topic, methodology }: Props = $props();

	let open = $state(false);
	const contentId = $derived(`metodologia-${topic.slug}`);

	const RESPONSIBLE = 'Elías Vega — CONVOCA';
</script>

<section class="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
	<h2 class="flex items-center gap-1.5 font-display text-base font-semibold text-ink-900">
		<ShieldCheck class="size-4 text-brand-700" /> Cómo se elaboró este plan
	</h2>
	<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
		Este es un borrador de CONVOCA elaborado con asistencia de inteligencia artificial y abierto a
		revisión ciudadana y experta.
	</p>

	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls={contentId}
		class="mt-2.5 flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
	>
		{open ? 'Ocultar metodología' : 'Ver metodología de elaboración'}
		{#if open}<ChevronUp class="size-4" />{:else}<ChevronDown class="size-4" />{/if}
	</button>

	{#if open}
		<div id={contentId} class="mt-4 flex max-w-2xl flex-col gap-4 border-t border-ink-100 pt-4">
			<div>
				<h3 class="font-display text-sm font-semibold text-ink-900">
					Papel de la inteligencia artificial
				</h3>
				<p class="mt-1 text-sm leading-relaxed text-ink-600">
					La IA se ha utilizado para organizar información pública, comparar alternativas, detectar
					contradicciones, estructurar las medidas y asistir en la elaboración de escenarios,
					calendarios, riesgos e indicadores. La IA no se ha utilizado como fuente ni toma
					decisiones en nombre de la ciudadanía.
				</p>
			</div>

			<div>
				<h3 class="font-display text-sm font-semibold text-ink-900">Fuentes y cálculos</h3>
				<p class="mt-1 text-sm leading-relaxed text-ink-600">
					Los datos presentados como verificados proceden de fuentes públicas enlazadas. Las
					estimaciones y cálculos de CONVOCA deben identificarse como tales y acompañarse de sus
					supuestos y metodología cuando estén disponibles.
					{#if methodology.reproducibleModel}
						{methodology.reproducibleModel}
					{/if}
				</p>
			</div>

			<div>
				<h3 class="font-display text-sm font-semibold text-ink-900">Responsabilidad humana</h3>
				<p class="mt-1 text-sm leading-relaxed text-ink-600">
					CONVOCA asume la responsabilidad editorial de este borrador. El contenido generado con
					asistencia de IA ha sido seleccionado, revisado y organizado antes de su publicación. La
					decisión final sobre qué medidas apoyar, modificar o rechazar corresponde siempre a las
					personas.
				</p>
				<p class="mt-1.5 text-sm font-semibold text-ink-900">
					Responsable del borrador: {RESPONSIBLE}
				</p>
			</div>

			<div>
				<h3 class="font-display text-sm font-semibold text-ink-900">Límites actuales</h3>
				<p class="mt-1 text-sm leading-relaxed text-ink-600">
					Este plan no ha sido aprobado por ninguna institución ni validado todavía por un comité
					independiente de especialistas. Puede contener errores, estimaciones discutibles o
					alternativas incompletas. La versión publicada no debe interpretarse como una solución
					definitiva.
				</p>
			</div>

			<div>
				<h3 class="font-display text-sm font-semibold text-ink-900">Revisión y corrección</h3>
				<p class="mt-1 text-sm leading-relaxed text-ink-600">
					Cualquier persona puede consultar las fuentes y proponer modificaciones. Las aportaciones
					relevantes podrán incorporarse mediante nuevas versiones, dejando constancia pública de
					qué ha cambiado y por qué — consulta el <a
						href="#cierre"
						class="font-semibold text-brand-700 hover:underline">historial de versiones</a
					> de este plan.
				</p>
			</div>

			<div class="rounded-xl bg-ink-50 p-3">
				<h3 class="font-display text-sm font-semibold text-ink-900">Etiquetas metodológicas</h3>
				<dl class="mt-1.5 flex flex-col gap-1.5 text-sm text-ink-600">
					<div>
						<dt class="inline font-semibold text-ink-800">Dato verificado:</dt>
						<dd class="inline">información procedente de una fuente externa enlazada.</dd>
					</div>
					<div>
						<dt class="inline font-semibold text-ink-800">Estimación CONVOCA:</dt>
						<dd class="inline">cálculo o escenario basado en supuestos documentados.</dd>
					</div>
					<div>
						<dt class="inline font-semibold text-ink-800">Propuesta abierta:</dt>
						<dd class="inline">medida, objetivo o decisión sometida a deliberación.</dd>
					</div>
					<div>
						<dt class="inline font-semibold text-ink-800">Fuente propositiva:</dt>
						<dd class="inline">
							actor externo que formula una solución concreta. Se registra su procedencia y se
							contrasta sin que su inclusión implique apoyo de CONVOCA.
						</dd>
					</div>
				</dl>
			</div>

			<dl
				class="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500 sm:grid-cols-2"
			>
				<div class="flex items-baseline gap-1.5">
					<dt class="shrink-0">Responsable del borrador</dt>
					<dd class="font-semibold text-ink-800">{RESPONSIBLE}</dd>
				</div>
				<div class="flex items-baseline gap-1.5">
					<dt class="shrink-0">Versión</dt>
					<dd class="font-semibold text-ink-800">{topic.version}</dd>
				</div>
				{#if topic.publishedAt}
					<div class="flex items-baseline gap-1.5">
						<dt class="shrink-0">Fecha de publicación</dt>
						<dd class="font-semibold text-ink-800">{formatEventDateWithYear(topic.publishedAt)}</dd>
					</div>
				{/if}
				<div class="flex items-baseline gap-1.5">
					<dt class="shrink-0">Última actualización</dt>
					<dd class="font-semibold text-ink-800">{formatEventDateWithYear(topic.updatedAt)}</dd>
				</div>
				{#if methodology.sourcesCutoff}
					<div class="flex items-baseline gap-1.5">
						<dt class="shrink-0">Cierre de fuentes</dt>
						<dd class="font-semibold text-ink-800">{methodology.sourcesCutoff}</dd>
					</div>
				{/if}
			</dl>
		</div>
	{/if}
</section>

<ProposalSourcesPanel topicId={topic.id} />
