/**
 * Código INE oficial de comunidad/ciudad autónoma (CODAUTO, 2 dígitos)
 * -> nombre y provincias que la forman. Generado por
 * `scripts/data/generate-municipios.py` — deduplicado de
 * `provinceCodes.ts` por `communityCode`, 19 filas exactas (17
 * comunidades autónomas + Ceuta + Melilla). No editar a mano.
 */
export interface CommunityCode {
	code: string;
	name: string;
	provinceCodes: string[];
}

export const communityCodes: CommunityCode[] = [
	{
		code: '01',
		name: 'Andalucía',
		provinceCodes: ['04', '11', '14', '18', '21', '23', '29', '41']
	},
	{ code: '02', name: 'Aragón', provinceCodes: ['22', '44', '50'] },
	{ code: '03', name: 'Principado de Asturias', provinceCodes: ['33'] },
	{ code: '04', name: 'Illes Balears', provinceCodes: ['07'] },
	{ code: '05', name: 'Canarias', provinceCodes: ['35', '38'] },
	{ code: '06', name: 'Cantabria', provinceCodes: ['39'] },
	{
		code: '07',
		name: 'Castilla y León',
		provinceCodes: ['05', '09', '24', '34', '37', '40', '42', '47', '49']
	},
	{ code: '08', name: 'Castilla-La Mancha', provinceCodes: ['02', '13', '16', '19', '45'] },
	{ code: '09', name: 'Cataluña', provinceCodes: ['08', '17', '25', '43'] },
	{ code: '10', name: 'Comunidad Valenciana', provinceCodes: ['03', '12', '46'] },
	{ code: '11', name: 'Extremadura', provinceCodes: ['06', '10'] },
	{ code: '12', name: 'Galicia', provinceCodes: ['15', '27', '32', '36'] },
	{ code: '13', name: 'Comunidad de Madrid', provinceCodes: ['28'] },
	{ code: '14', name: 'Región de Murcia', provinceCodes: ['30'] },
	{ code: '15', name: 'Comunidad Foral de Navarra', provinceCodes: ['31'] },
	{ code: '16', name: 'País Vasco', provinceCodes: ['01', '20', '48'] },
	{ code: '17', name: 'La Rioja', provinceCodes: ['26'] },
	{ code: '18', name: 'Ciudad de Ceuta', provinceCodes: ['51'] },
	{ code: '19', name: 'Ciudad de Melilla', provinceCodes: ['52'] }
];

export const communityByCode: Record<string, CommunityCode> = Object.fromEntries(
	communityCodes.map((c) => [c.code, c])
);
