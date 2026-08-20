import { browser } from '$app/environment';
import { tick } from 'svelte';

function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Recoloca un flujo por pasos después de sustituir una etapa por otra.
 *
 * En móvil, blur() ayuda a cerrar el teclado y los dos frames siguientes
 * dejan que el viewport recupere su altura antes del scroll. De esta forma
 * la persona aterriza viendo claramente la nueva pregunta en vez de quedarse
 * visualmente al final del paso anterior.
 */
export async function revealFlowStep(selector: string): Promise<void> {
	if (!browser) return;

	const activeElement = document.activeElement;
	if (activeElement instanceof HTMLElement) activeElement.blur();

	await tick();
	await nextFrame();
	await nextFrame();

	const target = document.querySelector<HTMLElement>(selector);
	if (!target) return;

	target.scrollIntoView({
		behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
		block: 'start'
	});
}
