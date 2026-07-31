/**
 * Versión vigente de cada documento legal. Cuando el texto de uno de ellos
 * cambie de forma sustancial, sube su versión aquí: cualquier cuenta cuya
 * aceptación guardada no coincida con la versión vigente vuelve a pasar por
 * `/aceptar-condiciones` para ese documento, aunque ya lo hubiera aceptado
 * antes (ver `hasCompletedLegalAcceptance` en `$lib/auth/authService.ts`).
 *
 * IMPORTANTE: el texto mostrado en `/aceptar-condiciones` y en
 * `/registro` es un placeholder funcional, no redactado por un profesional
 * legal. Sustitúyelo antes de un lanzamiento público real.
 */
export const LEGAL_VERSIONS = {
	terms: '2026-07-31',
	privacy: '2026-07-31',
	peacefulUse: '2026-07-31'
} as const;
