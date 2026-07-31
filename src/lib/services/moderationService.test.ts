import { describe, expect, it } from 'vitest';
import { actionToStatus } from './moderationService';

/**
 * Especificación de qué estado de convocatoria produce cada acción de
 * moderación. La aplicación real de esta transición (y que solo
 * moderador/admin puedan ejecutarla) la hacen `applyModerationAction` y,
 * sobre todo, las políticas RLS + el trigger `enforce_event_update_rules`
 * (`supabase/migrations/0003_events.sql`), verificadas en vivo en la Fase 14.
 */
describe('moderationService — actionToStatus', () => {
	it('aprobar publica la convocatoria', () => {
		expect(actionToStatus.approve).toBe('published');
	});

	it('solicitar cambios la devuelve a borrador', () => {
		expect(actionToStatus.request_changes).toBe('draft');
	});

	it('ocultar la oculta', () => {
		expect(actionToStatus.hide).toBe('hidden');
	});

	it('rechazar la rechaza', () => {
		expect(actionToStatus.reject).toBe('rejected');
	});

	it('restaurar la vuelve a publicar', () => {
		expect(actionToStatus.reinstate).toBe('published');
	});
});
