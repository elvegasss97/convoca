/**
 * Lógica pura compartida por `TerritoryPicker.svelte` (y por quien lo
 * envuelva, como `VozAbiertaFlow.svelte`): qué ámbitos necesitan un valor
 * asociado, cuáles usan un combobox de búsqueda en vez de un `<select>`, y
 * qué debe pasar con el valor/código de municipio guardados cuando la
 * persona cambia de tipo de ámbito. Aparte del componente para poder
 * probarse sin montar Svelte — mismo criterio que el resto de `$lib/utils`.
 */

/** 'nacional' y 'multiple' (Voz abierta) son los únicos ámbitos sin selector de valor. */
export function scopeNeedsValue(type: string): boolean {
	return type !== 'nacional' && type !== 'multiple';
}

export function scopeIsMunicipio(type: string): boolean {
	return type === 'municipio';
}

/**
 * 'municipio' (~8.100 opciones) y 'provincia' (52) usan un combobox de
 * búsqueda; 'comunidad_autonoma' (19 opciones) se mantiene como `<select>`
 * simple, cómodo de recorrer sin buscar.
 */
export function scopeUsesSearchCombobox(type: string): boolean {
	return type === 'municipio' || type === 'provincia';
}

export interface ScopeReset {
	scopeValue: string | undefined;
	/** Código INE del municipio (5 dígitos). Solo tiene sentido cuando scopeType es 'municipio'. */
	municipalityCode: string | undefined;
}

/**
 * Qué debe quedar en `scopeValue`/`municipalityCode` al pasar a `nextType`.
 * Limpia únicamente lo incompatible con el nuevo ámbito:
 *  - 'nacional'/'multiple': sin valor ni código.
 *  - 'municipio'/'provincia': sin preselección (ambos son un combobox de
 *    búsqueda — no hay un "primero" razonable entre decenas o miles de
 *    opciones) — la persona debe buscar y elegir.
 *  - 'comunidad_autonoma': usa `firstValueFor` para mantener el
 *    comportamiento existente del `<select>` (preselecciona la primera
 *    opción del catálogo), y limpia el código de municipio, que ya no aplica.
 */
export function resetScopeOnTypeChange(
	nextType: string,
	firstValueFor: (type: string) => string | undefined
): ScopeReset {
	if (!scopeNeedsValue(nextType)) return { scopeValue: undefined, municipalityCode: undefined };
	if (scopeUsesSearchCombobox(nextType))
		return { scopeValue: undefined, municipalityCode: undefined };
	return { scopeValue: firstValueFor(nextType), municipalityCode: undefined };
}

/**
 * `TerritoryPicker` construye su lista de comunidades a partir de
 * `autonomousCommunities` (`regions.ts`), que da a Baleares un nombre
 * distinto a nivel de comunidad ("Islas Baleares") del que usa a nivel de
 * provincia ("Illes Balears") — ver "NOMBRE UNIFICADO DE BALEARES" en la
 * cabecera de `scripts/data/generate-municipios.py`. No se corrige
 * `regions.ts` directamente: el selector de comunidad autónoma PROPIO de
 * Sanidad (`SanidadListeningFlow.svelte`, independiente de
 * `TerritoryPicker`) itera ese mismo array y lo valida contra un catálogo
 * cerrado ya en producción (`set_concern_listening_survey_response`,
 * migración 0044) que espera literalmente "Islas Baleares" — cambiarlo
 * ahí rompería esa función. `concerns`/`concern_proposals`/Voz abierta
 * (los únicos que pasan por `TerritoryPicker`) guardan `scope_value` como
 * texto libre sin ningún catálogo cerrado en BD, así que aquí sí se puede
 * unificar sin riesgo — solo afecta a lo que se muestra y se guarda a
 * través de `TerritoryPicker`, nunca al selector propio de Sanidad.
 */
const COMMUNITY_NAME_OVERRIDES: Record<string, string> = {
	'Islas Baleares': 'Illes Balears'
};

export function unifiedCommunityName(name: string): string {
	return COMMUNITY_NAME_OVERRIDES[name] ?? name;
}

/**
 * Alias conocidos de un nombre de comunidad autónoma, para filtrar sin
 * ocultar filas escritas con el nombre antiguo. La migración 0047 normaliza
 * `concerns`/`concern_proposals` (`'Islas Baleares'` -> `'Illes Balears'`)
 * en el momento de aplicarse, pero entre que el código nuevo se despliega y
 * esa migración se aplica de verdad —o si algún cliente con caché queda
 * atrás un instante— podría existir de forma transitoria una fila con el
 * nombre antiguo: filtrar por igualdad estricta la dejaría invisible. Se usa
 * en el filtro de lectura (`concernsService.listConcerns`), nunca al
 * escribir — toda escritura nueva usa siempre `unifiedCommunityName()`.
 */
const COMMUNITY_NAME_ALIASES: Record<string, string[]> = {
	'Illes Balears': ['Illes Balears', 'Islas Baleares'],
	'Islas Baleares': ['Illes Balears', 'Islas Baleares']
};

export function communityNameVariants(name: string): string[] {
	return COMMUNITY_NAME_ALIASES[name] ?? [name];
}
