/**
 * Comunidades y ciudades autónomas de España, con sus provincias reales.
 * Dato estático de referencia (no cambia), igual criterio que
 * `$lib/data/cities.ts`: no es contenido ficticio, es geografía
 * administrativa real usada para el selector territorial de "Pulso
 * ciudadano". El nivel "municipio" reutiliza `cities.ts` — la app no tiene
 * (ni pretende tener) un nomenclátor completo de municipios españoles.
 */

export interface AutonomousCommunity {
	name: string;
	provinces: string[];
}

export const autonomousCommunities: AutonomousCommunity[] = [
	{
		name: 'Andalucía',
		provinces: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla']
	},
	{ name: 'Aragón', provinces: ['Huesca', 'Teruel', 'Zaragoza'] },
	{ name: 'Principado de Asturias', provinces: ['Asturias'] },
	{ name: 'Islas Baleares', provinces: ['Illes Balears'] },
	{ name: 'Canarias', provinces: ['Las Palmas', 'Santa Cruz de Tenerife'] },
	{ name: 'Cantabria', provinces: ['Cantabria'] },
	{
		name: 'Castilla-La Mancha',
		provinces: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo']
	},
	{
		name: 'Castilla y León',
		provinces: [
			'Ávila',
			'Burgos',
			'León',
			'Palencia',
			'Salamanca',
			'Segovia',
			'Soria',
			'Valladolid',
			'Zamora'
		]
	},
	{ name: 'Cataluña', provinces: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'] },
	{ name: 'Comunidad Valenciana', provinces: ['Alicante', 'Castellón', 'Valencia'] },
	{ name: 'Extremadura', provinces: ['Badajoz', 'Cáceres'] },
	{ name: 'Galicia', provinces: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'] },
	{ name: 'Comunidad de Madrid', provinces: ['Madrid'] },
	{ name: 'Región de Murcia', provinces: ['Murcia'] },
	{ name: 'Comunidad Foral de Navarra', provinces: ['Navarra'] },
	{ name: 'País Vasco', provinces: ['Álava', 'Gipuzkoa', 'Bizkaia'] },
	{ name: 'La Rioja', provinces: ['La Rioja'] },
	{ name: 'Ciudad de Ceuta', provinces: ['Ceuta'] },
	{ name: 'Ciudad de Melilla', provinces: ['Melilla'] }
];

/** Lista plana de provincias reales, ordenada alfabéticamente, para el selector por provincia. */
export const provinces: string[] = [
	...new Set(autonomousCommunities.flatMap((c) => c.provinces))
].sort((a, b) => a.localeCompare(b, 'es'));

export function communityForProvince(province: string): string | undefined {
	return autonomousCommunities.find((c) => c.provinces.includes(province))?.name;
}
