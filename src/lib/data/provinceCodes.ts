/**
 * Código INE de provincia (2 dígitos) -> nombre de provincia y
 * código+nombre de su comunidad/ciudad autónoma. Generado por
 * `scripts/data/generate-municipios.py` a partir de la tabla oficial del
 * INE (ver cabecera de ese script para la fuente exacta y cómo
 * regenerarlo). Mismos nombres que `regions.ts`, EXCEPTO Baleares
 * (unificado a "Illes Balears" en los dos niveles — ver "NOMBRE
 * UNIFICADO DE BALEARES" en la cabecera del script). No editar a mano.
 */
export interface ProvinceCode {
	code: string;
	name: string;
	communityCode: string;
	community: string;
}

export const provinceCodes: ProvinceCode[] = [
	{ code: '01', name: 'Álava', communityCode: '16', community: 'País Vasco' },
	{ code: '02', name: 'Albacete', communityCode: '08', community: 'Castilla-La Mancha' },
	{ code: '03', name: 'Alicante', communityCode: '10', community: 'Comunidad Valenciana' },
	{ code: '04', name: 'Almería', communityCode: '01', community: 'Andalucía' },
	{ code: '05', name: 'Ávila', communityCode: '07', community: 'Castilla y León' },
	{ code: '06', name: 'Badajoz', communityCode: '11', community: 'Extremadura' },
	{ code: '07', name: 'Illes Balears', communityCode: '04', community: 'Illes Balears' },
	{ code: '08', name: 'Barcelona', communityCode: '09', community: 'Cataluña' },
	{ code: '09', name: 'Burgos', communityCode: '07', community: 'Castilla y León' },
	{ code: '10', name: 'Cáceres', communityCode: '11', community: 'Extremadura' },
	{ code: '11', name: 'Cádiz', communityCode: '01', community: 'Andalucía' },
	{ code: '12', name: 'Castellón', communityCode: '10', community: 'Comunidad Valenciana' },
	{ code: '13', name: 'Ciudad Real', communityCode: '08', community: 'Castilla-La Mancha' },
	{ code: '14', name: 'Córdoba', communityCode: '01', community: 'Andalucía' },
	{ code: '15', name: 'A Coruña', communityCode: '12', community: 'Galicia' },
	{ code: '16', name: 'Cuenca', communityCode: '08', community: 'Castilla-La Mancha' },
	{ code: '17', name: 'Girona', communityCode: '09', community: 'Cataluña' },
	{ code: '18', name: 'Granada', communityCode: '01', community: 'Andalucía' },
	{ code: '19', name: 'Guadalajara', communityCode: '08', community: 'Castilla-La Mancha' },
	{ code: '20', name: 'Gipuzkoa', communityCode: '16', community: 'País Vasco' },
	{ code: '21', name: 'Huelva', communityCode: '01', community: 'Andalucía' },
	{ code: '22', name: 'Huesca', communityCode: '02', community: 'Aragón' },
	{ code: '23', name: 'Jaén', communityCode: '01', community: 'Andalucía' },
	{ code: '24', name: 'León', communityCode: '07', community: 'Castilla y León' },
	{ code: '25', name: 'Lleida', communityCode: '09', community: 'Cataluña' },
	{ code: '26', name: 'La Rioja', communityCode: '17', community: 'La Rioja' },
	{ code: '27', name: 'Lugo', communityCode: '12', community: 'Galicia' },
	{ code: '28', name: 'Madrid', communityCode: '13', community: 'Comunidad de Madrid' },
	{ code: '29', name: 'Málaga', communityCode: '01', community: 'Andalucía' },
	{ code: '30', name: 'Murcia', communityCode: '14', community: 'Región de Murcia' },
	{ code: '31', name: 'Navarra', communityCode: '15', community: 'Comunidad Foral de Navarra' },
	{ code: '32', name: 'Ourense', communityCode: '12', community: 'Galicia' },
	{ code: '33', name: 'Asturias', communityCode: '03', community: 'Principado de Asturias' },
	{ code: '34', name: 'Palencia', communityCode: '07', community: 'Castilla y León' },
	{ code: '35', name: 'Las Palmas', communityCode: '05', community: 'Canarias' },
	{ code: '36', name: 'Pontevedra', communityCode: '12', community: 'Galicia' },
	{ code: '37', name: 'Salamanca', communityCode: '07', community: 'Castilla y León' },
	{ code: '38', name: 'Santa Cruz de Tenerife', communityCode: '05', community: 'Canarias' },
	{ code: '39', name: 'Cantabria', communityCode: '06', community: 'Cantabria' },
	{ code: '40', name: 'Segovia', communityCode: '07', community: 'Castilla y León' },
	{ code: '41', name: 'Sevilla', communityCode: '01', community: 'Andalucía' },
	{ code: '42', name: 'Soria', communityCode: '07', community: 'Castilla y León' },
	{ code: '43', name: 'Tarragona', communityCode: '09', community: 'Cataluña' },
	{ code: '44', name: 'Teruel', communityCode: '02', community: 'Aragón' },
	{ code: '45', name: 'Toledo', communityCode: '08', community: 'Castilla-La Mancha' },
	{ code: '46', name: 'Valencia', communityCode: '10', community: 'Comunidad Valenciana' },
	{ code: '47', name: 'Valladolid', communityCode: '07', community: 'Castilla y León' },
	{ code: '48', name: 'Bizkaia', communityCode: '16', community: 'País Vasco' },
	{ code: '49', name: 'Zamora', communityCode: '07', community: 'Castilla y León' },
	{ code: '50', name: 'Zaragoza', communityCode: '02', community: 'Aragón' },
	{ code: '51', name: 'Ceuta', communityCode: '18', community: 'Ciudad de Ceuta' },
	{ code: '52', name: 'Melilla', communityCode: '19', community: 'Ciudad de Melilla' }
];

export const provinceByCode: Record<string, ProvinceCode> = Object.fromEntries(
	provinceCodes.map((p) => [p.code, p])
);
