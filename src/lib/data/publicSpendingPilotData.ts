export interface PublicSpendingWallItem {
	id: string;
	label: string;
	shortLabel: string;
	amount: number;
	rate: number;
	unit: string;
	capacity: string;
	description: string;
	fill: string;
	textColor: '#ffffff' | '#2b2622';
	rect: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	compact?: boolean;
}

export interface PublicSpendingSource {
	id: string;
	organization: string;
	title: string;
	date: string;
	url: string;
	whatItProves: string;
	status: 'Fuente primaria';
}

export interface PublicSpendingClaimOrigin {
	id: string;
	organization: string;
	title: string;
	date: string;
	url: string;
	claimSummary: string;
	editorialUse: string;
	status: 'Publicación analizada';
}

export const publicSpendingPilot = {
	id: 'acogida-proteccion-internacional-2026-2027',
	title: 'Sistema de acogida de protección internacional',
	period: 'Julio de 2026 — junio de 2027',
	plannedTotal: 670_458_917,
	reviewedAt: '22 de agosto de 2026',
	status: 'Planificación verificada',
	description:
		'Necesidades estructurales planificadas para la gestión indirecta del sistema de acogida mediante acción concertada.',
	disclaimer:
		'La cifra total es una planificación de necesidades. No equivale por sí sola a dinero ya pagado o finalmente justificado.'
} as const;

/**
 * El área de cada rectángulo reproduce la proporción del importe sobre el
 * total. El último bloque es deliberadamente pequeño: el muro no magnifica
 * partidas para hacerlas parecer mayores.
 */
export const publicSpendingWallItems: PublicSpendingWallItem[] = [
	{
		id: 'acogida-estandar-t1',
		label: 'Acogida estándar · tarifa 1',
		shortLabel: 'Acogida estándar T1',
		amount: 218_420_518,
		rate: 58,
		unit: 'plaza y día',
		capacity: '10.493 plazas/día de julio a diciembre; 10.139 de enero a junio',
		description:
			'Alojamiento y atención en la fase de acogida estándar, calculados con la tarifa 1.',
		fill: '#176056',
		textColor: '#ffffff',
		rect: { x: 0, y: 0, width: 32.577, height: 100 }
	},
	{
		id: 'acogida-estandar-t2',
		label: 'Acogida estándar · tarifa 2',
		shortLabel: 'Acogida estándar T2',
		amount: 212_426_200,
		rate: 50,
		unit: 'plaza y día',
		capacity: '12.037 plazas/día de julio a diciembre; 11.236 de enero a junio',
		description:
			'Alojamiento y atención en la fase de acogida estándar, calculados con la tarifa 2.',
		fill: '#279583',
		textColor: '#ffffff',
		rect: { x: 32.577, y: 0, width: 31.683, height: 100 }
	},
	{
		id: 'valoracion-t1',
		label: 'Valoración inicial y derivación · tarifa 1',
		shortLabel: 'Valoración inicial T1',
		amount: 161_093_350,
		rate: 55,
		unit: 'plaza y día',
		capacity: '7.370 plazas/día de julio a diciembre; 8.690 de enero a junio',
		description:
			'Primera valoración del perfil y las necesidades antes de derivar a un recurso adecuado.',
		fill: '#43b29e',
		textColor: '#ffffff',
		rect: { x: 64.26, y: 0, width: 35.74, height: 67.233 }
	},
	{
		id: 'autonomia',
		label: 'Fase de autonomía',
		shortLabel: 'Autonomía',
		amount: 38_824_655,
		rate: 37,
		unit: 'persona y día',
		capacity: '2.875 personas/día; 2.873 en junio de 2027',
		description:
			'Actuaciones orientadas a la autonomía de las personas beneficiarias tras la fase de acogida.',
		fill: '#e98a3f',
		textColor: '#2b2622',
		rect: { x: 64.26, y: 67.233, width: 17.677, height: 32.767 },
		compact: true
	},
	{
		id: 'valoracion-t2',
		label: 'Valoración inicial y derivación · tarifa 2',
		shortLabel: 'Valoración inicial T2',
		amount: 26_275_200,
		rate: 51,
		unit: 'plaza y día',
		capacity: '2.800 plazas/día de julio a diciembre',
		description:
			'Primera valoración y derivación con la tarifa 2 durante el segundo semestre de 2026.',
		fill: '#f0ac68',
		textColor: '#2b2622',
		rect: { x: 81.937, y: 67.233, width: 11.985, height: 32.767 },
		compact: true
	},
	{
		id: 'acogida-vulnerable',
		label: 'Acogida de personas vulnerables',
		shortLabel: 'Vulnerabilidad',
		amount: 10_407_744,
		rate: 64,
		unit: 'plaza y día',
		capacity: '450 plazas/día de julio a diciembre; 441 de enero a junio',
		description:
			'Plazas de acogida previstas para personas con necesidades de atención por vulnerabilidad.',
		fill: '#f6cea0',
		textColor: '#2b2622',
		rect: { x: 93.922, y: 67.233, width: 4.742, height: 32.767 },
		compact: true
	},
	{
		id: 'acogida-vulnerable-reforzada',
		label: 'Acogida con vulnerabilidad reforzada',
		shortLabel: 'Reforzada',
		amount: 3_011_250,
		rate: 150,
		unit: 'plaza y día',
		capacity: '55 plazas/día durante los doce meses',
		description:
			'Plazas reservadas para necesidades de atención reforzada. Es el bloque al que corresponde la cifra de 150 €.',
		fill: '#dc6c25',
		textColor: '#ffffff',
		rect: { x: 98.664, y: 67.233, width: 1.336, height: 32.767 },
		compact: true
	}
];

export const publicSpendingClaimOrigin: PublicSpendingClaimOrigin = {
	id: 'uhn-plus-150-euros',
	organization: 'UHN Plus',
	title:
		'El plan de Pedro Sánchez para los refugiados consta de 670 millones de euros mientras asfixia a los contribuyentes españoles',
	date: '19 de junio de 2026',
	url: 'https://www.uhnplus.com/el-plan-de-pedro-sanchez-para-los-refugiados-consta-de-670-millones-mientras-asfixia-a-los-contribuyentes-espanoles/',
	claimSummary:
		'Presenta los 150 € como una tarifa diaria por usuario dentro de la acogida de vulnerabilidad reforzada, sin mostrar en ese punto que la planificación la limita a 55 plazas.',
	editorialUse:
		'Sirve para entender de dónde nace la duda pública. CONVOCA no la usa como prueba del gasto: contrasta su lectura con el BOE y las resoluciones oficiales.',
	status: 'Publicación analizada'
};

export const publicSpendingSources: PublicSpendingSource[] = [
	{
		id: 'boe-planificacion',
		organization: 'Boletín Oficial del Estado',
		title:
			'Resolución de 18 de junio de 2026 sobre la planificación estructural del sistema de acogida',
		date: '19 de junio de 2026',
		url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-13362',
		whatItProves:
			'Periodo, plazas o personas planificadas, coste por fase, total de 670.458.917 € y posible cofinanciación europea.',
		status: 'Fuente primaria'
	},
	{
		id: 'resolucion-precios',
		organization: 'Secretaría de Estado de Migraciones',
		title: 'Resolución de 4 de junio de 2026 sobre precios de referencia',
		date: '4 de junio de 2026',
		url: 'https://sede.inclusion.gob.es/documents/387478/1674612/Resoluci%C3%B3n%2BSEM%2BPrecios_ACPI2026.pdf/11a405e7-b982-51bc-81bd-df5cd04085bc?t=1780578012700',
		whatItProves:
			'Los 150 € son un precio de referencia por plaza y día para vulnerabilidad reforzada y sirven para calcular anticipos y la retribución máxima de la entidad.',
		status: 'Fuente primaria'
	},
	{
		id: 'procedimiento-accion-concertada',
		organization: 'Sede electrónica del Ministerio de Inclusión',
		title: 'Acción Concertada de Protección Internacional',
		date: 'Consulta: 22 de agosto de 2026',
		url: 'https://sede.inclusion.gob.es/w/accion-concertada-proteccion-internacional',
		whatItProves:
			'Las entidades y la localización geográfica se concretan después mediante comunicaciones de asignación.',
		status: 'Fuente primaria'
	},
	{
		id: 'instrucciones-justificacion',
		organization: 'Secretaría de Estado de Migraciones',
		title: 'Instrucciones de gestión, seguimiento y justificación de la acción concertada',
		date: 'Consulta: 22 de agosto de 2026',
		url: 'https://sede.inclusion.gob.es/documents/387478/1674612/Instrucciones%2BGesti%C3%B3n%2C%2BSeguimiento%2By%2BJustificaci%C3%B3n%2BAC.pdf/24da74d2-0eee-7896-c176-f2ecff7de22f?t=1783593750640',
		whatItProves:
			'La retribución final depende de costes efectivos, seguimiento y documentación justificativa; la planificación no equivale al pago final.',
		status: 'Fuente primaria'
	}
];

export function publicSpendingShare(amount: number): number {
	return (amount / publicSpendingPilot.plannedTotal) * 100;
}
