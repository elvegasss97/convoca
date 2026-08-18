/**
 * Normalización compartida para búsquedas insensibles a mayúsculas/minúsculas
 * y a tildes/diéresis (p. ej. "Munoz" debe encontrar "Muñoz", "alcala"
 * debe encontrar "Alcalá"). NFD descompone cada letra acentuada en
 * letra base + marca diacrítica combinante, que luego se elimina.
 */
export function normalizeForSearch(value: string): string {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Filtrado genérico usado por los combobox de búsqueda territorial
 * (municipio, provincia): los elementos cuyo texto EMPIEZA por la búsqueda
 * van primero (más relevantes), después los que solo la CONTIENEN en
 * cualquier posición; cada grupo ordenado alfabéticamente. `getText`
 * permite reutilizar esta misma lógica tanto sobre `string[]` (provincias)
 * como sobre objetos con un campo de nombre (municipios).
 */
export function filterByQuery<T>(
	items: T[],
	query: string,
	getText: (item: T) => string,
	limit = 50
): T[] {
	const q = normalizeForSearch(query.trim());
	if (q.length === 0) return [];

	const starts: T[] = [];
	const contains: T[] = [];
	for (const item of items) {
		const normalized = normalizeForSearch(getText(item));
		if (normalized.startsWith(q)) starts.push(item);
		else if (normalized.includes(q)) contains.push(item);
	}
	const byText = (a: T, b: T) => getText(a).localeCompare(getText(b), 'es');
	return [...starts.sort(byText), ...contains.sort(byText)].slice(0, limit);
}
