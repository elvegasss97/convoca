/**
 * Genera un id aleatorio único sin depender de `crypto.randomUUID()`.
 *
 * `crypto.randomUUID()` solo existe en "contextos seguros" (HTTPS o
 * `localhost`). Al abrir la app desde el móvil usando la IP del ordenador
 * en la red local (`http://192.168.x.x:5173`), el navegador la trata como
 * contexto NO seguro y `crypto.randomUUID` (junto con `crypto.subtle`)
 * simplemente no existe — de ahí que crear cuentas, iniciar sesión o crear
 * convocatorias fallara solo desde el móvil y no desde el PC (que accedía
 * por `localhost`, sí seguro). Esta función funciona igual en ambos casos.
 */
export function randomId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch {
			// Algún navegador podría exponer el método y aun así rechazarlo; seguimos con la alternativa.
		}
	}
	const time = Date.now().toString(36);
	const a = Math.random().toString(36).slice(2, 10);
	const b = Math.random().toString(36).slice(2, 10);
	return `${time}-${a}-${b}`;
}
