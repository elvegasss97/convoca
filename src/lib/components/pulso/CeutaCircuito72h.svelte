<script lang="ts">
	/**
	 * Circuito operativo 0-72h de Plan Ceuta: tabs accesibles (role="tablist"),
	 * sin equivalente genérico en Vivienda/Sanidad (confirmado antes de
	 * escribir este componente). Datos en `$lib/data/ceutaCircuitoData.ts`.
	 *
	 * Navegación por teclado (flechas/Inicio/Fin) siguiendo el patrón WAI-ARIA
	 * de "tabs automáticas" ya usado en el propio artifact de referencia.
	 */
	import { CEUTA_TRAMOS } from '$lib/data/ceutaCircuitoData';

	let activeIndex = $state(0);
	let tabRefs: (HTMLButtonElement | null)[] = [];

	const activeTramo = $derived(CEUTA_TRAMOS[activeIndex]);

	function select(i: number, moveFocus: boolean) {
		activeIndex = i;
		if (moveFocus) tabRefs[i]?.focus();
	}

	function onKeydown(e: KeyboardEvent, i: number) {
		let next: number | null = null;
		if (e.key === 'ArrowRight') next = (i + 1) % CEUTA_TRAMOS.length;
		else if (e.key === 'ArrowLeft') next = (i - 1 + CEUTA_TRAMOS.length) % CEUTA_TRAMOS.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = CEUTA_TRAMOS.length - 1;
		if (next !== null) {
			e.preventDefault();
			select(next, true);
		}
	}
</script>

<div class="ceuta-scope">
	<div
		role="tablist"
		aria-label="Tramos horarios del circuito de 0 a 72 horas"
		class="reloj-72 no-scrollbar"
	>
		{#each CEUTA_TRAMOS as tramo, i (tramo.id)}
			<button
				bind:this={tabRefs[i]}
				type="button"
				role="tab"
				id={`ceuta-tab-${tramo.id}`}
				aria-selected={activeIndex === i}
				aria-controls={`ceuta-panel-${tramo.id}`}
				tabindex={activeIndex === i ? 0 : -1}
				onclick={() => select(i, false)}
				onkeydown={(e) => onKeydown(e, i)}
				class="tramo-boton"
			>
				<span class="rango">{tramo.rango}</span>
				<span class="titulo-corto">{tramo.titulo}</span>
			</button>
		{/each}
	</div>

	<div
		role="tabpanel"
		id={`ceuta-panel-${activeTramo.id}`}
		aria-labelledby={`ceuta-tab-${activeTramo.id}`}
		tabindex="0"
		class="tramo-panel"
	>
		<span class="subrango"
			>Tramo {activeIndex + 1} de {CEUTA_TRAMOS.length} · {activeTramo.rango}</span
		>
		<h3>{activeTramo.titulo}</h3>
		<div class="tramo-grid">
			<div>
				<h4>Qué ocurre</h4>
				<ul>
					{#each activeTramo.ocurre as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
				<h4 class="mt-3">Quién responde</h4>
				<p>{activeTramo.responde}</p>
				<h4 class="mt-3">Qué decisión debe tomarse</h4>
				<p>{activeTramo.decision}</p>
			</div>
			<div>
				<div class="caja-garantia">
					<strong>Garantía para la persona.</strong>
					{activeTramo.garantia}
				</div>
				<div class="caja-bloqueo"><strong>Señal de bloqueo.</strong> {activeTramo.bloqueo}</div>
				<h4 class="mt-3">Si el sistema falla</h4>
				<p>{activeTramo.remedio}</p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Identidad visual propia de Plan Ceuta (azul profundo del estrecho,
	   turquesa mediterráneo, arena, rojo reservado para bloqueos), aislada
	   con scoping automático de Svelte: no toca los tokens brand/accent/ink
	   globales ni se filtra a otras rutas — mismo patrón ya usado en
	   SanidadRiesgos.svelte para su propia identidad visual. */
	.ceuta-scope {
		--ceuta-deep: #0b3550;
		--ceuta-night: #082a3f;
		--ceuta-turquoise: #127e88;
		--ceuta-turquoise-light: #5fbec4;
		--ceuta-sand: #d9a86c;
		--ceuta-ink: #132531;
		--ceuta-ink-soft: #3e5560;
		--ceuta-line: #e1d8c7;
		--ceuta-green-soft: #e4eee7;
		--ceuta-green: #3e7a5e;
		--ceuta-red-soft: #f6e3e0;
		--ceuta-red: #b8392f;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	/* En móvil los seis tramos ya no forman una fila intrínseca de ~800 px.
	   Ese ancho mínimo estaba ensanchando el viewport de toda la ruta en PWA
	   y hacía que incluso la navegación fija inferior apareciera a media escala.
	   Dos columnas mantienen cada opción legible sin sacar ancho del documento. */
	.reloj-72 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		width: 100%;
		max-width: 100%;
		min-width: 0;
		align-items: stretch;
		gap: 6px;
		margin-bottom: 20px;
		padding-bottom: 6px;
	}
	.tramo-boton {
		width: 100%;
		min-width: 0;
		background: #fff;
		border: 1px solid var(--ceuta-line);
		border-radius: 12px;
		padding: 12px 10px;
		text-align: left;
		cursor: pointer;
		transition: background 0.2s ease;
	}
	@media (min-width: 640px) {
		.reloj-72 {
			display: flex;
			overflow-x: auto;
			overscroll-behavior-x: contain;
			-webkit-overflow-scrolling: touch;
		}
		.tramo-boton {
			flex: 0 0 128px;
			width: auto;
		}
	}
	.tramo-boton .rango {
		font-family: var(--font-sans);
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--ceuta-turquoise);
		display: block;
		margin-bottom: 4px;
	}
	.tramo-boton .titulo-corto {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--ceuta-night);
		line-height: 1.25;
		overflow-wrap: anywhere;
	}
	.tramo-boton[aria-selected='true'] {
		background: var(--ceuta-deep);
		border-color: var(--ceuta-deep);
	}
	.tramo-boton[aria-selected='true'] .rango {
		color: var(--ceuta-turquoise-light);
	}
	.tramo-boton[aria-selected='true'] .titulo-corto {
		color: #fff;
	}
	.tramo-boton:focus-visible {
		outline: 3px solid var(--ceuta-sand);
		outline-offset: 2px;
	}

	.tramo-panel {
		min-width: 0;
		max-width: 100%;
		background: #fff;
		border: 1px solid var(--ceuta-line);
		border-radius: 20px;
		padding: 24px;
		color: var(--ceuta-ink);
	}
	.tramo-panel:focus-visible {
		outline: 3px solid var(--ceuta-sand);
		outline-offset: 2px;
	}
	.tramo-panel h3 {
		font-size: 1.25rem;
		margin: 0 0 4px;
		color: var(--ceuta-night);
		overflow-wrap: anywhere;
	}
	.subrango {
		font-size: 0.78rem;
		color: var(--ceuta-turquoise);
		display: block;
		margin-bottom: 18px;
	}
	.tramo-grid {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 24px;
		margin-top: 16px;
		min-width: 0;
	}
	.tramo-grid > div {
		min-width: 0;
	}
	@media (max-width: 800px) {
		.tramo-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	.tramo-panel h4 {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ceuta-ink-soft);
		margin: 0 0 8px;
	}
	.tramo-panel .mt-3 {
		margin-top: 14px;
	}
	.tramo-panel ul {
		margin: 0;
		padding-left: 18px;
	}
	.tramo-panel li {
		margin-bottom: 6px;
		font-size: 0.92rem;
		overflow-wrap: anywhere;
	}
	.tramo-panel p {
		margin: 0;
		font-size: 0.92rem;
		overflow-wrap: anywhere;
	}
	.caja-garantia {
		background: var(--ceuta-green-soft);
		border-radius: 10px;
		padding: 12px 14px;
		margin-bottom: 12px;
		font-size: 0.88rem;
	}
	.caja-garantia strong {
		color: var(--ceuta-green);
		display: block;
		margin-bottom: 2px;
	}
	.caja-bloqueo {
		background: var(--ceuta-red-soft);
		border-radius: 10px;
		padding: 12px 14px;
		font-size: 0.88rem;
	}
	.caja-bloqueo strong {
		color: var(--ceuta-red);
		display: block;
		margin-bottom: 2px;
	}
</style>
