<script lang="ts">
	import { FlaskConical } from '@lucide/svelte';
	import { resetAllPersisted } from '$lib/utils/persistedArray';

	function reset() {
		const confirmed = confirm(
			'¿Borrar todos los datos de prueba (convocatorias creadas, actualizaciones, reportes, documentación y asistencia) y recargar con los datos ficticios originales?'
		);
		if (!confirmed) return;
		resetAllPersisted();
		location.reload();
	}
</script>

<button
	type="button"
	onclick={reset}
	class="fixed right-4 bottom-24 z-30 flex items-center gap-1.5 rounded-full border border-warning-300 bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-700 shadow-card hover:bg-warning-100 md:bottom-4"
	title="Solo visible en modo desarrollo: borra los datos de prueba guardados en este navegador"
>
	<FlaskConical class="size-3.5" />
	Reset datos (dev)
</button>
