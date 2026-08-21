import {
	publicSpendingPilot,
	publicSpendingSources,
	publicSpendingWallItems
} from './publicSpendingPilotData';

export type PublicSpendingStage = 'planificado' | 'regulado' | 'concedido' | 'adjudicado';
export type PublicSpendingTraceState = 'verified' | 'current' | 'pending';

export interface PublicSpendingInvestigationSource {
	id: string;
	organization: string;
	title: string;
	date: string;
	url: string;
	whatItProves: string;
}

export interface PublicSpendingBreakdownItem {
	label: string;
	amount: number;
	detail: string;
	place?: string;
}

export interface PublicSpendingTraceStep {
	label: string;
	detail: string;
	state: PublicSpendingTraceState;
}

export interface PublicSpendingInvestigation {
	slug: string;
	title: string;
	shortTitle: string;
	eyebrow: string;
	stage: PublicSpendingStage;
	amount: number;
	amountApproximate?: boolean;
	amountQualifier: string;
	period: string;
	publishedAt: string;
	reviewedAt: string;
	category: string;
	territory: string;
	manager: string;
	recipient: string;
	summary: string;
	whyItMatters: string;
	evidenceNote: string;
	featuredMetric: string;
	featuredLabel: string;
	breakdownTitle: string;
	breakdownNote: string;
	breakdownCoverage: 'complete' | 'selected';
	breakdown: PublicSpendingBreakdownItem[];
	known: string[];
	unknown: string[];
	trace: PublicSpendingTraceStep[];
	sources: PublicSpendingInvestigationSource[];
	accent: string;
}

export const publicSpendingStageLabels: Record<PublicSpendingStage, string> = {
	planificado: 'Planificado',
	regulado: 'Regulado',
	concedido: 'Concedido',
	adjudicado: 'Adjudicado'
};

const asylumSources: PublicSpendingInvestigationSource[] = publicSpendingSources.map(
	({ id, organization, title, date, url, whatItProves }) => ({
		id,
		organization,
		title,
		date,
		url,
		whatItProves
	})
);

export const publicSpendingInvestigations: PublicSpendingInvestigation[] = [
	{
		slug: publicSpendingPilot.id,
		title: 'Sistema de acogida de protección internacional',
		shortTitle: 'Acogida y protección internacional',
		eyebrow: 'Una cifra viral, abierta hasta la unidad de cálculo',
		stage: 'planificado',
		amount: publicSpendingPilot.plannedTotal,
		amountQualifier: 'necesidad planificada para doce meses',
		period: publicSpendingPilot.period,
		publishedAt: '19 de junio de 2026',
		reviewedAt: publicSpendingPilot.reviewedAt,
		category: 'Política social',
		territory: 'España · reparto territorial aún no publicado',
		manager: 'Secretaría de Estado de Migraciones',
		recipient: 'Entidades de acción concertada; asignaciones concretas posteriores',
		summary:
			'La resolución cuantifica plazas, personas y precios de referencia. Los 150 € corresponden únicamente a 55 plazas de vulnerabilidad reforzada por día, no a un pago personal generalizado.',
		whyItMatters:
			'Permite separar una tarifa técnica del dinero efectivamente recibido y localizar qué parte del recorrido todavía no es pública.',
		evidenceNote:
			'La cifra global es planificación estructural. No acredita por sí sola adjudicaciones, pagos ni gasto finalmente justificado.',
		featuredMetric: '55 plazas',
		featuredLabel: 'usan la tarifa de 150 €/día',
		breakdownTitle: 'Planificación por fase y tarifa',
		breakdownNote: 'Desglose completo: las siete partidas reconcilian exactamente con el total.',
		breakdownCoverage: 'complete',
		breakdown: publicSpendingWallItems.map((item) => ({
			label: item.label,
			amount: item.amount,
			detail: item.capacity
		})),
		known: [
			'Importe, periodo, plazas o personas y precios de referencia por modalidad.',
			'La tarifa de 150 € solo se aplica a vulnerabilidad reforzada.',
			'El precio sirve para anticipos y como techo de retribución de la entidad.'
		],
		unknown: [
			'Entidades finalmente asignadas a cada lote o necesidad.',
			'Municipios, centros e importe territorializado.',
			'Pagos efectivos y costes que terminen siendo justificados.'
		],
		trace: [
			{
				label: 'Necesidad planificada',
				detail: 'Publicada y cuantificada en el BOE.',
				state: 'verified'
			},
			{ label: 'Precio de referencia', detail: 'Unidad y techo documentados.', state: 'verified' },
			{
				label: 'Asignaciones',
				detail: 'Se concretan en comunicaciones posteriores.',
				state: 'current'
			},
			{ label: 'Pago', detail: 'No consta todavía para el periodo completo.', state: 'pending' },
			{ label: 'Justificación', detail: 'Pendiente de ejecución y rendición.', state: 'pending' }
		],
		sources: asylumSources,
		accent: '#176056'
	},
	{
		slug: 'renoinn-2-renovables-innovadoras-2026',
		title: 'RENOINN 2: renovables innovadoras y almacenamiento',
		shortTitle: 'RENOINN 2',
		eyebrow: 'Resolución definitiva con 524 proyectos identificables',
		stage: 'concedido',
		amount: 433_440_381.54,
		amountQualifier: 'ayuda concedida definitivamente',
		period: 'Convocatoria resuelta en agosto de 2026',
		publishedAt: '7 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Energía y transición ecológica',
		territory: 'Proyectos distribuidos por España',
		manager: 'Instituto para la Diversificación y Ahorro de la Energía (IDAE)',
		recipient: '524 proyectos; el anexo identifica beneficiario, municipio e importe',
		summary:
			'La resolución definitiva concede 433,44 millones a proyectos de agrivoltaica, fotovoltaica flotante, integración en infraestructuras, autoconsumo colectivo y bombas de calor renovables.',
		whyItMatters:
			'Es un buen ejemplo de dinero ya concedido con una lista nominal completa, pero todavía sujeto a ejecución, hitos y justificación.',
		evidenceNote:
			'Concedido no significa pagado ni obra terminada. La resolución fija obligaciones de ejecución y control posteriores.',
		featuredMetric: '524 proyectos',
		featuredLabel: 'con beneficiario y municipio en el anexo',
		breakdownTitle: 'Ayuda concedida por programa',
		breakdownNote: 'Desglose completo y reconciliado con la resolución definitiva.',
		breakdownCoverage: 'complete',
		breakdown: [
			{
				label: 'Agrivoltaica con almacenamiento',
				amount: 234_029_977.18,
				detail: '118 proyectos.'
			},
			{
				label: 'Integración de renovables en infraestructuras',
				amount: 65_463_421.26,
				detail: '47 proyectos con almacenamiento.'
			},
			{
				label: 'Bombas de calor renovables',
				amount: 51_125_682.6,
				detail: '56 proyectos.'
			},
			{
				label: 'Autoconsumo colectivo y consumidores vulnerables',
				amount: 45_707_794.14,
				detail: '274 proyectos y unos 9.000 consumidores vulnerables previstos.'
			},
			{
				label: 'Fotovoltaica flotante con almacenamiento',
				amount: 37_113_506.36,
				detail: '29 proyectos.'
			}
		],
		known: [
			'Beneficiario, proyecto, municipio e importe individual en la resolución definitiva.',
			'1.225,66 MW de potencia y 2.320,72 MWh de almacenamiento asociados.',
			'Inversión total movilizada declarada de 1.186,19 millones de euros.'
		],
		unknown: [
			'Cuánto se ha abonado efectivamente a cada proyecto a fecha de revisión.',
			'Qué proyectos completarán todos los hitos sin reducción o reintegro.',
			'Resultado final de las obligaciones de seguimiento y justificación.'
		],
		trace: [
			{ label: 'Convocatoria', detail: 'Programas y condiciones publicados.', state: 'verified' },
			{
				label: 'Concesión definitiva',
				detail: '524 proyectos e importes resueltos.',
				state: 'verified'
			},
			{
				label: 'Ejecución',
				detail: 'Los proyectos deben cumplir hitos y plazos.',
				state: 'current'
			},
			{
				label: 'Pago',
				detail: 'No equivale automáticamente al total concedido.',
				state: 'pending'
			},
			{ label: 'Justificación', detail: 'Control posterior pendiente.', state: 'pending' }
		],
		sources: [
			{
				id: 'idae-renoinn-noticia',
				organization: 'IDAE',
				title: 'El IDAE concede 433,4 millones a 524 nuevos proyectos innovadores',
				date: '7 de agosto de 2026',
				url: 'https://www.idae.es/noticias/el-idae-concede-4334-millones-524-nuevos-proyectos-con-almacenamiento-de-agrivoltaica',
				whatItProves:
					'Total, número de proyectos, tecnologías, potencia, almacenamiento e inversión movilizada.'
			},
			{
				id: 'idae-renoinn-resolucion',
				organization: 'Sede electrónica del IDAE',
				title: 'Resolución definitiva de la segunda convocatoria RENOINN',
				date: 'Agosto de 2026',
				url: 'https://sede.idae.gob.es/sites/default/files/documentos/2026/Enegias%20Renovables/RENOINN2/_427_resol_see_renoinn_2.pdf',
				whatItProves:
					'Listado nominal de proyectos, beneficiarios, municipios, inversión y ayuda concedida.'
			}
		],
		accent: '#238575'
	},
	{
		slug: 'hidrogeno-renovable-auctions-as-a-service-2026',
		title: 'Hidrógeno renovable: Auctions-as-a-Service',
		shortTitle: 'Hidrógeno renovable',
		eyebrow: 'Cuatro proyectos y un pago condicionado a producir',
		stage: 'concedido',
		amount: 274_298_434,
		amountQualifier: 'ayuda máxima concedida',
		period: 'Hasta diez años desde la entrada en operación',
		publishedAt: '6 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Energía e industria',
		territory: 'A Coruña, Albacete, Ciudad Real y Zaragoza',
		manager: 'IDAE · Ministerio para la Transición Ecológica',
		recipient: 'Cuatro proyectos empresariales nominados en resoluciones definitivas',
		summary:
			'Los 274,30 millones son el máximo concedido a cuatro plantas. La ayuda se devenga por kilogramo de hidrógeno renovable certificado y se liquida semestralmente durante sus primeros diez años.',
		whyItMatters:
			'El titular parece una transferencia inmediata, pero el mecanismo vincula el pago futuro a producción real certificada.',
		evidenceNote:
			'La suma es una ayuda máxima. El pago efectivo dependerá de producción, certificación y cumplimiento durante la operación.',
		featuredMetric: '4 proyectos',
		featuredLabel: 'con beneficiario, municipio e importe exactos',
		breakdownTitle: 'Ayuda máxima por proyecto',
		breakdownNote: 'Desglose completo de las cuatro resoluciones definitivas.',
		breakdownCoverage: 'complete',
		breakdown: [
			{
				label: 'ATLAS · Repsol Renewable and Circular Solutions',
				amount: 133_394_887.5,
				detail: '50 MW.',
				place: 'Arteixo (A Coruña)'
			},
			{
				label: 'QUIXOTGEN · Doña Urraca Energy',
				amount: 50_216_284,
				detail: '30 MW.',
				place: 'Villarrobledo (Albacete)'
			},
			{
				label: 'P-HYNET · Repsol Renewable and Circular Solutions',
				amount: 49_791_750,
				detail: '12,27 MW.',
				place: 'Puertollano (Ciudad Real)'
			},
			{
				label: 'ZARAGOZAH2V · Accionaplug',
				amount: 40_895_512.5,
				detail: '10 MW.',
				place: 'Zaragoza'
			}
		],
		known: [
			'Nombre del proyecto, sociedad beneficiaria, municipio, potencia e importe máximo.',
			'El pago se calcula por kilogramos certificados y se realiza semestralmente.',
			'La ayuda puede extenderse durante los diez primeros años de operación.'
		],
		unknown: [
			'Producción certificada que alcanzará finalmente cada planta.',
			'Importe semestral efectivamente abonado a cada beneficiario.',
			'Posibles reducciones si no se cumplen los hitos o el calendario.'
		],
		trace: [
			{
				label: 'Selección europea',
				detail: 'Proyectos elegidos en la subasta.',
				state: 'verified'
			},
			{
				label: 'Concesión definitiva',
				detail: 'Cuatro máximos individualizados.',
				state: 'verified'
			},
			{
				label: 'Decisión e inversión',
				detail: 'Deben cumplir los plazos fijados.',
				state: 'current'
			},
			{
				label: 'Pago por producción',
				detail: 'Semestral y condicionado a H₂ certificado.',
				state: 'pending'
			},
			{ label: 'Cierre y control', detail: 'Dependerá de la operación real.', state: 'pending' }
		],
		sources: [
			{
				id: 'miteco-hidrogeno',
				organization: 'MITECO',
				title: 'El MITECO destina ayudas a nuevos proyectos para producir hidrógeno renovable',
				date: '6 de agosto de 2026',
				url: 'https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/agosto/el-miteco-destina-233-millones-a-tres-nuevos-proyectos-para-prod.html',
				whatItProves: 'Mecanismo de ayuda, calendario y tres de los proyectos resueltos.'
			},
			{
				id: 'idae-hidrogeno',
				organization: 'IDAE',
				title: 'El IDAE destina 274 millones a cuatro proyectos para producir H₂ renovable',
				date: '6 de agosto de 2026',
				url: 'https://www.idae.es/noticias/el-idae-destina-274-millones-cuatro-nuevos-proyectos-para-producir-h2-renovable-en',
				whatItProves:
					'Los cuatro proyectos, ubicaciones, potencias, importes y pago ligado a producción.'
			},
			{
				id: 'idae-hidrogeno-resoluciones',
				organization: 'Sede electrónica del IDAE',
				title: 'Segunda convocatoria AaaS: resoluciones definitivas',
				date: 'Agosto de 2026',
				url: 'https://sede.idae.gob.es/tramites-servicios/segunda-convocatoria-de-concesion-directa-de-ayudas-proyectos-espanoles-de',
				whatItProves:
					'Acceso a las resoluciones individuales que dan soporte jurídico a cada concesión.'
			}
		],
		accent: '#2f6f8f'
	},
	{
		slug: 'variante-jaca-a21-a23-2026',
		title: 'Variante de Jaca y conexión de las autovías A-21 y A-23',
		shortTitle: 'Variante de Jaca',
		eyebrow: 'Contrato adjudicado con empresa, competencia y plazo',
		stage: 'adjudicado',
		amount: 135_300_000,
		amountApproximate: true,
		amountQualifier: 'adjudicación con IVA, cifra oficial redondeada',
		period: 'Plazo de obra: 54 meses',
		publishedAt: '7 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Infraestructuras',
		territory: 'Jaca (Huesca)',
		manager: 'Ministerio de Transportes y Movilidad Sostenible',
		recipient: 'UTE Sacyr Construcción–Papsa Infraestructuras',
		summary:
			'La obra está adjudicada por 111.827.525,49 € sin IVA —135,3 millones con IVA en la comunicación oficial— tras recibir 15 ofertas. El plazo contractual es de 54 meses.',
		whyItMatters:
			'La Plataforma de Contratación permite pasar del anuncio político al expediente: adjudicatario, importe base, licitadores y duración.',
		evidenceNote:
			'Adjudicado no equivale a pagado ni terminado. Las certificaciones de obra y la liquidación determinarán el coste efectivo.',
		featuredMetric: '15 ofertas',
		featuredLabel: 'constan en la adjudicación',
		breakdownTitle: 'Destino contractual identificado',
		breakdownNote:
			'La ficha contractual publica un adjudicatario y 111.827.525,49 € sin IVA. Los 135,3 M€ son la cifra oficial con IVA redondeada.',
		breakdownCoverage: 'complete',
		breakdown: [
			{
				label: 'UTE Sacyr Construcción–Papsa Infraestructuras',
				amount: 111_827_525.49,
				detail: 'Adjudicación sin IVA para 8,05 km de variante y conexión.',
				place: 'Jaca (Huesca)'
			}
		],
		known: [
			'Adjudicatario, importe sin IVA, 15 licitadores y plazo de 54 meses.',
			'La actuación incluye tres enlaces, tres viaductos y un falso túnel.',
			'El valor estimado inicial era 139,63 millones de euros sin IVA.'
		],
		unknown: [
			'Calendario real de certificaciones y pagos.',
			'Modificados, revisiones de precios o incidencias durante la obra.',
			'Coste liquidado y fecha efectiva de puesta en servicio.'
		],
		trace: [
			{ label: 'Licitación', detail: 'Expediente y condiciones publicados.', state: 'verified' },
			{ label: 'Adjudicación', detail: 'Empresa e importe ya identificados.', state: 'verified' },
			{
				label: 'Formalización y obra',
				detail: 'Ejecución prevista durante 54 meses.',
				state: 'current'
			},
			{
				label: 'Certificaciones y pagos',
				detail: 'Se producirán durante la obra.',
				state: 'pending'
			},
			{ label: 'Liquidación', detail: 'Coste final aún no disponible.', state: 'pending' }
		],
		sources: [
			{
				id: 'transportes-jaca',
				organization: 'Ministerio de Transportes',
				title: 'Adjudicadas las obras de la variante de Jaca',
				date: '7 de agosto de 2026',
				url: 'https://cdn.transportes.gob.es/portal-web-transportes/recursos-web/transportes/media/press_release/260807-np-aragon-adjudicacion-jaca-variante-a-21-y-a-23.pdf',
				whatItProves: 'Importe con IVA, plazo, longitud y elementos principales de la actuación.'
			},
			{
				id: 'boe-jaca',
				organization: 'Boletín Oficial del Estado',
				title: 'Anuncio de licitación de la variante de Jaca',
				date: 'Enero de 2026',
				url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-B-2026-187',
				whatItProves: 'Objeto, expediente y apertura formal de la licitación.'
			},
			{
				id: 'placsp-jaca',
				organization: 'Plataforma de Contratación del Sector Público',
				title: 'Expediente adjudicado: variante de Jaca',
				date: '7 de agosto de 2026',
				url: 'https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=2DxUbxA7tlr10HRJw8TEnQ%3D%3D',
				whatItProves:
					'Adjudicatario, importe sin IVA, número de licitadores y duración contractual.'
			}
		],
		accent: '#c86c2d'
	},
	{
		slug: 'subvenciones-sociales-directas-2026',
		title: 'Subvenciones directas para programas sociales y Agenda 2030',
		shortTitle: 'Subvenciones sociales directas',
		eyebrow: 'Beneficiarios nominativos, pero concesión aún pendiente',
		stage: 'regulado',
		amount: 50_578_440,
		amountQualifier: 'importe máximo nominado en el real decreto',
		period: 'Programas ejecutables entre 2026 y 2027 según resolución',
		publishedAt: '8 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Derechos sociales',
		territory: 'España, Canarias, Ceuta y Melilla',
		manager: 'Ministerio de Derechos Sociales, Consumo y Agenda 2030',
		recipient: 'Entidades y administraciones nominadas una a una en el artículo 3',
		summary:
			'El real decreto nombra beneficiarios y cuantías que suman 50,58 millones. A la fecha de revisión aún debían presentar la solicitud y obtener resolución o convenio: no es una lista de pagos realizados.',
		whyItMatters:
			'Permite ver quién está previsto que reciba cada ayuda directa y, al mismo tiempo, marcar el paso administrativo que todavía falta.',
		evidenceNote:
			'Los destinatarios son nominativos, pero la norma exige solicitud antes del 15 de septiembre y una resolución o convenio posterior.',
		featuredMetric: '30 M€',
		featuredLabel: 'para lucha contra la pobreza en Canarias',
		breakdownTitle: 'Importe máximo por gran bloque',
		breakdownNote: 'Suma derivada y reconciliada desde todas las cuantías del artículo 3.',
		breakdownCoverage: 'complete',
		breakdown: [
			{
				label: 'Tercer sector, familias y programas sociales',
				amount: 40_017_030,
				detail: 'Incluye 30 M€ para Canarias y 2 M€ para cada una de Ceuta y Melilla.'
			},
			{
				label: 'Entidades de derechos de las personas con discapacidad',
				amount: 6_038_000,
				detail: 'Programas y estructuras nominados en el real decreto.'
			},
			{
				label: 'Real Patronato sobre Discapacidad',
				amount: 2_798_910,
				detail: 'Programas ejecutados por entidades identificadas.'
			},
			{
				label: 'Derechos de los animales',
				amount: 807_500,
				detail: 'Actuaciones nominativas de protección animal.'
			},
			{
				label: 'Red de Entidades Locales para la Agenda 2030',
				amount: 600_000,
				detail: 'Federación Española de Municipios y Provincias.'
			},
			{
				label: 'Consumo, juego y alimentación escolar saludable',
				amount: 317_000,
				detail: 'Programas nominativos en tres ámbitos.'
			}
		],
		known: [
			'Beneficiarios e importes máximos individualizados por programa.',
			'Plazo de solicitud y mecanismo posterior de resolución o convenio.',
			'El pago será anticipado en una transferencia una vez concedida la ayuda.'
		],
		unknown: [
			'Qué solicitudes serán finalmente resueltas y por qué importe definitivo.',
			'Fecha del pago anticipado a cada beneficiario.',
			'Gasto elegible finalmente ejecutado y justificado.'
		],
		trace: [
			{ label: 'Real decreto', detail: 'Beneficiarios y máximos nominados.', state: 'verified' },
			{ label: 'Solicitud', detail: 'Plazo abierto hasta el 15 de septiembre.', state: 'current' },
			{ label: 'Concesión o convenio', detail: 'Debe dictarse después.', state: 'pending' },
			{
				label: 'Pago anticipado',
				detail: 'Una transferencia tras la concesión.',
				state: 'pending'
			},
			{
				label: 'Justificación',
				detail: 'Hasta tres meses después de la actividad.',
				state: 'pending'
			}
		],
		sources: [
			{
				id: 'boe-rd-642-2026',
				organization: 'Boletín Oficial del Estado',
				title: 'Real Decreto 642/2026, de 4 de agosto',
				date: '8 de agosto de 2026',
				url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16556',
				whatItProves:
					'Beneficiarios, importes, solicitud, concesión, pago anticipado y justificación.'
			}
		],
		accent: '#8067a8'
	},
	{
		slug: 'empleo-reconstruccion-andalucia-extremadura-2026',
		title: 'Empleo municipal para reconstrucción en Andalucía y Extremadura',
		shortTitle: 'Empleo para reconstrucción',
		eyebrow: '696 municipios y un reparto máximo sujeto a solicitud',
		stage: 'regulado',
		amount: 50_000_000,
		amountQualifier: 'presupuesto total del programa',
		period: 'Contratos de 3 a 6 meses tras cada resolución',
		publishedAt: '8 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Empleo y reconstrucción',
		territory: '543 municipios andaluces y 153 extremeños',
		manager: 'Servicio Público de Empleo Estatal (SEPE)',
		recipient: 'Corporaciones locales incluidas en el anexo',
		summary:
			'El programa reserva 50 millones para contratar personas desempleadas en tareas de reconstrucción. El anexo calcula máximos por municipio, pero cada ayuntamiento debe solicitar la subvención y recibir resolución.',
		whyItMatters:
			'El anexo permite territorializar la previsión hasta el municipio sin confundir ese máximo con una concesión ya pagada.',
		evidenceNote:
			'Los 10 M€ adicionales del anexo no se suman a los 50 M€: son un máximo redistribuible con los remanentes del mismo presupuesto.',
		featuredMetric: '696 municipios',
		featuredLabel: 'incluidos en el anexo territorial',
		breakdownTitle: 'Asignación garantizada máxima por comunidad',
		breakdownNote:
			'El anexo suma 49.999.998 € por redondeo municipal; la fila total y el artículo presupuestario fijan 50 M€.',
		breakdownCoverage: 'complete',
		breakdown: [
			{
				label: 'Andalucía',
				amount: 45_364_186,
				detail: '543 municipios; hasta 9.072.836 € adicionales dentro del mismo presupuesto.'
			},
			{
				label: 'Extremadura',
				amount: 4_635_812,
				detail: '153 municipios; hasta 927.164 € adicionales dentro del mismo presupuesto.'
			}
		],
		known: [
			'Los 696 municipios, su máximo garantizado y el máximo adicional potencial.',
			'La fórmula: mínimo, población, desempleo y coste de daños.',
			'Los contratos cubrirán salario y cotizaciones durante tres a seis meses.'
		],
		unknown: [
			'Qué municipios solicitarán finalmente la ayuda.',
			'Importe individual concedido tras redistribuir posibles remanentes.',
			'Contratos formalizados, pagos y reconstrucción ejecutada.'
		],
		trace: [
			{
				label: 'Real decreto',
				detail: 'Presupuesto, fórmula y anexo publicados.',
				state: 'verified'
			},
			{
				label: 'Solicitud municipal',
				detail: 'Cada corporación debe pedir su ayuda.',
				state: 'current'
			},
			{ label: 'Resolución', detail: 'Fijará la cuantía individual definitiva.', state: 'pending' },
			{ label: 'Contratación', detail: 'Contratos de tres a seis meses.', state: 'pending' },
			{ label: 'Pago y justificación', detail: 'Aún no disponibles.', state: 'pending' }
		],
		sources: [
			{
				id: 'boe-rd-608-2026',
				organization: 'Boletín Oficial del Estado',
				title: 'Real Decreto 608/2026, de 29 de julio',
				date: '8 de agosto de 2026',
				url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16553',
				whatItProves:
					'Presupuesto, condiciones, fórmula y anexo completo de importes máximos municipales.'
			}
		],
		accent: '#b07a2a'
	},
	{
		slug: 'renovacion-equipamiento-hosteleria-2026',
		title: 'Renovación de equipamiento en establecimientos de hostelería',
		shortTitle: 'Equipamiento de hostelería',
		eyebrow: 'Programa aprobado sin beneficiarios finales todavía',
		stage: 'regulado',
		amount: 15_000_000,
		amountQualifier: 'presupuesto máximo del programa',
		period: '1 M€ en 2026 y 14 M€ en 2027',
		publishedAt: '8 de agosto de 2026',
		reviewedAt: '22 de agosto de 2026',
		category: 'Turismo y empresa',
		territory: 'España',
		manager: 'Ministerio de Industria y Turismo',
		recipient: 'Establecimientos con CNAE 55 o 56 que resulten beneficiarios',
		summary:
			'La norma crea un programa de 15 millones para sustituir equipamiento en hostelería. Cada establecimiento podrá recibir entre 5.000 y 11.000 €, pero todavía no existe una relación final de beneficiarios.',
		whyItMatters:
			'Es el estado más temprano del muro: conocemos presupuesto y reglas, no quién cobrará ni cuánto se ejecutará.',
		evidenceNote:
			'El pago se realizará después de justificar el gasto. El IVA no forma parte de la ayuda elegible.',
		featuredMetric: '5.000–11.000 €',
		featuredLabel: 'por establecimiento elegible',
		breakdownTitle: 'Presupuesto por anualidad',
		breakdownNote: 'Desglose completo del límite presupuestario publicado.',
		breakdownCoverage: 'complete',
		breakdown: [
			{ label: 'Anualidad 2027', amount: 14_000_000, detail: 'Mayor parte del programa.' },
			{ label: 'Anualidad 2026', amount: 1_000_000, detail: 'Primera anualidad presupuestaria.' }
		],
		known: [
			'Presupuesto por anualidad y rango de ayuda por establecimiento.',
			'Actividades elegibles de alojamiento y restauración (CNAE 55 y 56).',
			'El pago queda condicionado a justificar previamente el gasto.'
		],
		unknown: [
			'Número y nombre de establecimientos beneficiarios.',
			'Reparto territorial e importe final por empresa.',
			'Cuánto del presupuesto se pagará y quedará justificado.'
		],
		trace: [
			{ label: 'Real decreto', detail: 'Programa y presupuesto aprobados.', state: 'verified' },
			{ label: 'Solicitudes', detail: 'Beneficiarios aún por determinar.', state: 'current' },
			{ label: 'Concesión', detail: 'Importes individuales pendientes.', state: 'pending' },
			{ label: 'Compra y justificación', detail: 'Debe acreditarse el gasto.', state: 'pending' },
			{ label: 'Pago', detail: 'Se realizará tras la justificación.', state: 'pending' }
		],
		sources: [
			{
				id: 'boe-rd-638-2026',
				organization: 'Boletín Oficial del Estado',
				title: 'Real Decreto 638/2026, de 4 de agosto',
				date: '8 de agosto de 2026',
				url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16554',
				whatItProves:
					'Presupuesto, beneficiarios potenciales, cuantías, gasto elegible, justificación y pago.'
			}
		],
		accent: '#4f7780'
	}
];

export const publicSpendingInvestigationBySlug = new Map(
	publicSpendingInvestigations.map((investigation) => [investigation.slug, investigation])
);

export const publicSpendingSourceCount = publicSpendingInvestigations.reduce(
	(total, investigation) => total + investigation.sources.length,
	0
);

export const publicSpendingMaxAmount = Math.max(
	...publicSpendingInvestigations.map((investigation) => investigation.amount)
);

export function publicSpendingBreakdownTotal(investigation: PublicSpendingInvestigation): number {
	return investigation.breakdown.reduce((total, item) => total + item.amount, 0);
}
