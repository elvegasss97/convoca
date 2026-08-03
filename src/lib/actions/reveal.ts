/**
 * Animación de entrada sutil al hacer scroll, sin dependencias nuevas:
 * `IntersectionObserver` nativo + una transición CSS que el propio
 * componente que use esta action debe definir (clases `.reveal-init` /
 * `.reveal-visible`). `prefers-reduced-motion` ya se neutraliza de forma
 * global en `layout.css` (duraciones a 0.01ms), así que no hace falta
 * duplicar esa comprobación aquí.
 */
export function reveal(node: HTMLElement) {
	node.classList.add('reveal-init');

	if (typeof IntersectionObserver === 'undefined') {
		// Entornos sin soporte (muy raro hoy): mostrar directamente, nunca
		// dejar contenido invisible por falta de la API.
		node.classList.add('reveal-visible');
		return {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('reveal-visible');
					observer.unobserve(node);
				}
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
