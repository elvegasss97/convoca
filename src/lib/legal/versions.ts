/**
 * Versión vigente de cada documento legal. Cuando el texto de uno de ellos
 * cambie de forma sustancial, sube su versión aquí: cualquier cuenta cuya
 * aceptación guardada no coincida con la versión vigente vuelve a pasar por
 * `/aceptar-condiciones` para ese documento, aunque ya lo hubiera aceptado
 * antes (ver `hasCompletedLegalAcceptance` en `$lib/auth/authService.ts`).
 *
 * El texto real vive en `/legal/terminos`, `/legal/privacidad` y
 * `/legal/uso-pacifico` (antes eran solo etiquetas de checkbox sin ningún
 * documento detrás). Sigue siendo un borrador funcional redactado con
 * apoyo de IA, no revisado por un profesional legal — ver el aviso en cada
 * página. Sustitúyelo/revísalo antes de un lanzamiento público real.
 */
export const LEGAL_VERSIONS = {
	terms: '2026-08-01',
	privacy: '2026-08-01',
	peacefulUse: '2026-08-01'
} as const;
