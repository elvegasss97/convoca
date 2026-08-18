/**
 * Lectura de `public.audit_trail` (auditoría genérica e inmutable, ver
 * `supabase/migrations/0049_audit_trail.sql`) para el bloque "Actividad
 * reciente" del Centro de Operaciones. Solo lectura: la tabla no tiene
 * política ni GRANT de INSERT/UPDATE/DELETE para `authenticated` —
 * escribir en ella solo ocurre automáticamente desde los triggers/RPCs
 * `SECURITY DEFINER` de 0050/0051, nunca desde este archivo.
 *
 * `audit_trail_select_staff` (0049) ya exige `is_moderator_or_admin()`
 * (rol + aal2 desde 0052) — las comprobaciones de aquí son solo
 * conveniencia de UX, nunca la única barrera.
 */
import { supabase } from '$lib/supabase/client';
import type { AuditTrailActorType, AuditTrailEntry } from '$lib/types';

interface AuditTrailRow {
	action: string;
	target_type: string;
	actor_type: string;
	created_at: string;
}

/**
 * Deliberadamente NO selecciona `id`/`target_id`/`actor_id`/`metadata`:
 * son identificadores/detalles internos que este resumen no necesita
 * mostrar (ver el requisito explícito de no exponer "metadatos sensibles
 * ni identificadores innecesarios" en esta vista).
 */
const AUDIT_TRAIL_SUMMARY_COLUMNS = 'action, target_type, actor_type, created_at';

function rowToEntry(row: AuditTrailRow): AuditTrailEntry {
	return {
		action: row.action,
		targetType: row.target_type,
		actorType: row.actor_type as AuditTrailActorType,
		createdAt: row.created_at
	};
}

export async function listRecentAuditTrail(limit = 8): Promise<AuditTrailEntry[]> {
	const { data, error } = await supabase
		.from('audit_trail')
		.select(AUDIT_TRAIL_SUMMARY_COLUMNS)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) throw error;
	return (data ?? []).map(rowToEntry);
}
