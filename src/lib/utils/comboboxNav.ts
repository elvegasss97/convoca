/**
 * Lógica pura de navegación por teclado de un combobox ARIA (patrón
 * listbox): qué índice queda activo tras cada tecla, sin tocar el DOM. Vive
 * aparte de `MunicipalitySearchCombobox.svelte` para poder probarse con
 * tests unitarios normales — mismo criterio que el resto de `$lib/utils`.
 */
export type ComboboxNavKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

/**
 * @param current Índice activo actual (-1 = ninguno resaltado).
 * @param length Número de resultados visibles.
 * @returns El nuevo índice activo, siempre dentro de `[0, length - 1]` (o -1 si `length` es 0). Circular: bajar desde el último vuelve al primero y viceversa.
 */
export function nextActiveIndex(current: number, key: ComboboxNavKey, length: number): number {
	if (length <= 0) return -1;
	if (key === 'Home') return 0;
	if (key === 'End') return length - 1;
	if (key === 'ArrowDown') return current < 0 || current >= length - 1 ? 0 : current + 1;
	if (key === 'ArrowUp') return current <= 0 ? length - 1 : current - 1;
	return current;
}
