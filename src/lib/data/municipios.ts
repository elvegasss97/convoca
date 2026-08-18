/**
 * Catálogo completo de municipios de España (fuente: INE, ver
 * `scripts/data/generate-municipios.py`). A diferencia de `regions.ts`
 * (comunidades y provincias, ~70 filas, va en el bundle normal) o de
 * `cities.ts` (12 ciudades de referencia para centrar el mapa de
 * /descubrir, con su propia búsqueda por geocodificación — no es este
 * catálogo ni lo sustituye), este fichero son solo tipos y funciones: los
 * datos viven en `static/data/municipios.json` (~8.100 filas) y se cargan
 * de forma diferida, solo cuando alguien elige ámbito "municipio" — nunca
 * en el bundle inicial ni precacheados por el service worker (el patrón
 * `globPatterns` de vite-plugin-pwa en vite.config.ts no incluye `.json`).
 */
import { filterByQuery } from '$lib/utils/textSearch';

export interface Municipality {
	/** Código INE de 5 dígitos: 2 de provincia + 3 de municipio. Estable, único, oficial. */
	ineCode: string;
	name: string;
	/** Código INE de provincia (2 dígitos) — los 2 primeros caracteres de ineCode. */
	provinceCode: string;
}

let cachedCatalog: Promise<Municipality[]> | null = null;

/**
 * Carga (una sola vez, con caché en memoria) el catálogo completo desde
 * `/data/municipios.json`. Si la carga falla, se limpia la caché para
 * permitir reintentar en la siguiente llamada en vez de recordar el error
 * para siempre.
 */
export function loadMunicipalitiesCatalog(): Promise<Municipality[]> {
	if (!cachedCatalog) {
		cachedCatalog = fetch('/data/municipios.json')
			.then((res) => {
				if (!res.ok) throw new Error('No se ha podido cargar el listado de municipios.');
				return res.json() as Promise<[string, string, string][]>;
			})
			.then((rows) =>
				rows.map(([ineCode, name, provinceCode]) => ({ ineCode, name, provinceCode }))
			)
			.catch((err) => {
				cachedCatalog = null;
				throw err;
			});
	}
	return cachedCatalog;
}

/**
 * Búsqueda pura sobre un catálogo ya cargado (recibido como parámetro, no
 * leído de la caché del módulo) para poder probarse con un catálogo de
 * prueba controlado. Los resultados cuyo nombre EMPIEZA por la búsqueda
 * van primero (más relevantes), después los que solo la CONTIENEN en
 * cualquier posición; cada grupo ordenado alfabéticamente.
 */
export function searchMunicipalities(
	catalog: Municipality[],
	query: string,
	limit = 50
): Municipality[] {
	return filterByQuery(catalog, query, (m) => m.name, limit);
}

export function municipalityById(
	catalog: Municipality[],
	ineCode: string
): Municipality | undefined {
	return catalog.find((m) => m.ineCode === ineCode);
}
