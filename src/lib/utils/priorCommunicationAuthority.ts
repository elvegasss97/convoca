/**
 * A qué autoridad hay que presentar la comunicación previa de una reunión o
 * manifestación en lugar de tránsito público. La autoridad competente real
 * NO es uniforme en toda España: Cataluña y País Vasco tienen su propio
 * régimen (Departament d'Interior / Gobierno Vasco), el resto del país
 * (incluida Navarra, que no tiene esta competencia transferida) pasa por la
 * Delegación o Subdelegación del Gobierno vía la sede electrónica nacional.
 * Las tres URLs se han verificado por búsqueda — no inventar más regímenes
 * ni URLs por provincia sin verificarlas igual: la sede nacional no expone
 * una URL limpia y estable por provincia (queda detrás de un flujo con
 * certificado digital), así que el régimen "general" enlaza la página
 * oficial que reparte internamente por Delegación/Subdelegación en vez de
 * fingir precisión que no se puede comprobar.
 */
import { normalizeForSearch } from './textSearch';

export type PriorCommunicationRegime = 'catalunya' | 'pais_vasco' | 'general';

export interface PriorCommunicationAuthority {
	label: string;
	description: string;
	url: string;
}

const CATALUNYA_KEYWORDS = [
	'barcelona',
	'girona',
	'gerona',
	'lleida',
	'lerida',
	'tarragona',
	'catalunya',
	'cataluna'
];
const PAIS_VASCO_KEYWORDS = [
	'araba',
	'alava',
	'gipuzkoa',
	'guipuzcoa',
	'bizkaia',
	'vizcaya',
	'euskadi',
	'pais vasco',
	// Las 3 capitales de provincia vascas tienen un nombre distinto al de su
	// provincia (a diferencia de Cataluña, donde capital == provincia), así
	// que si el geocodificador solo devuelve la ciudad (cityName, sin
	// province) hacen falta explícitamente para el fallback.
	'bilbao',
	'vitoria',
	'donostia',
	'san sebastian'
];

/**
 * Detecta si la convocatoria cae en uno de los dos regímenes con autoridad
 * propia (Cataluña, País Vasco) a partir del texto libre de
 * provincia/ciudad que devuelve el geocodificador (ver geocode.ts) — nunca
 * normalizado contra las 52 provincias canónicas de provinceCodes.ts. Se
 * comprueba por palabra clave (contains, no igualdad) porque Nominatim
 * puede devolver "Provincia de Barcelona", "Barcelona", "Catalunya"...
 * Cualquier texto no reconocido cae en 'general' — nunca al revés, para no
 * mandar a nadie a la autoridad equivocada por una coincidencia dudosa.
 */
export function resolvePriorCommunicationRegime(
	province: string | undefined,
	cityName: string | undefined
): PriorCommunicationRegime {
	const normalized = normalizeForSearch(`${province ?? ''} ${cityName ?? ''}`);
	if (CATALUNYA_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'catalunya';
	if (PAIS_VASCO_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'pais_vasco';
	return 'general';
}

export const priorCommunicationAuthorities: Record<
	PriorCommunicationRegime,
	PriorCommunicationAuthority
> = {
	catalunya: {
		label: "Departament d'Interior (Generalitat de Catalunya)",
		description:
			"En Cataluña la comunicación previa se presenta ante el Departament d'Interior, no ante la Delegación del Gobierno.",
		url: 'https://interior.gencat.cat/es/arees_dactuacio/seguretat/manifestacions_i_concentracions/index.html'
	},
	pais_vasco: {
		label: 'Gobierno Vasco',
		description:
			'En el País Vasco la comunicación previa se presenta ante el Gobierno Vasco, no ante la Delegación del Gobierno.',
		url: 'https://www.euskadi.eus/comunicacion/comunicacion-sobre-manifestacion-o-reunion/web01-tramite/es/'
	},
	general: {
		label: 'Delegación o Subdelegación del Gobierno',
		description:
			'Se presenta ante la Delegación o Subdelegación del Gobierno de tu provincia, a través de la sede electrónica.',
		url: 'https://sede.administracionespublicas.gob.es/pagina/index/directorio/comunicacion_reunion'
	}
};
