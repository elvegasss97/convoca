<script lang="ts">
	import { FlaskConical } from '@lucide/svelte';
	import { authService } from '$lib/auth/authService';

	/**
	 * Ya no existe un "reset de datos mock": los datos viven en Supabase, no
	 * en localStorage. Este botón (solo visible con `PUBLIC_ENABLE_DEV_TOOLS`,
	 * nunca en producción) se limita a borrar el estado puramente local del
	 * navegador — el token anónimo de asistencia y el borrador de "Crear
	 * convocatoria" — y cerrar la sesión. Nunca toca ninguna fila remota.
	 */
	async function reset() {
		const confirmed = confirm(
			'¿Borrar el estado local de este navegador (borrador de "Crear convocatoria", token de asistencia anónima) y cerrar sesión? Esto no borra nada en el servidor.'
		);
		if (!confirmed) return;
		localStorage.removeItem('convoca:crear:draft:v1');
		localStorage.removeItem('convoca:attendance-device-token');
		localStorage.removeItem('convoca:my-attendance');
		await authService.signOut();
		location.reload();
	}
</script>

<button
	type="button"
	onclick={reset}
	class="fixed right-4 bottom-24 z-30 flex items-center gap-1.5 rounded-full border border-warning-300 bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-700 shadow-card hover:bg-warning-100 md:bottom-4"
	title="Solo visible en modo desarrollo: borra el estado local de este navegador (nunca datos del servidor)"
>
	<FlaskConical class="size-3.5" />
	Reset local (dev)
</button>
