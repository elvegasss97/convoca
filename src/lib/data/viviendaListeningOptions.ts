/**
 * Las diez preocupaciones concretas de "Escucha abierta sobre vivienda" y,
 * para cada una, un listado de causas neutrales entre las que elegir al
 * profundizar. Contenido fijo de esta fase (solo Vivienda): no se gestiona
 * todavía desde el panel de administración.
 *
 * Las causas son opciones de taxonomía, no afirmaciones políticas ni datos:
 * describen posibles explicaciones de forma neutral y comprensible, sin
 * atribuir responsabilidad ni presentar opiniones de Convoca como hechos.
 * Todas las preocupaciones incluyen además, ya en el componente que las
 * usa, "Otra causa" y "No tengo información suficiente".
 */

export interface ListeningOption {
	code: string;
	label: string;
	causes: { code: string; label: string }[];
}

export const VIVIENDA_LISTENING_OPTIONS: ListeningOption[] = [
	{
		code: 'precio_alquiler',
		label: 'Precio del alquiler',
		causes: [
			{ code: 'escasez_oferta', label: 'Escasez de oferta de alquiler' },
			{ code: 'aumento_demanda', label: 'Aumento de la demanda en la zona' },
			{ code: 'presion_turistica', label: 'Presión de alquileres turísticos o temporales' },
			{ code: 'ingresos_estancados', label: 'Ingresos que no crecen al mismo ritmo' },
			{ code: 'falta_regulacion', label: 'Falta de regulación eficaz' }
		]
	},
	{
		code: 'dificultad_compra',
		label: 'Dificultad para comprar una vivienda',
		causes: [
			{ code: 'precio_elevado', label: 'Precio de la vivienda elevado' },
			{ code: 'dificultad_hipoteca', label: 'Dificultad para acceder a hipoteca o ahorro inicial' },
			{ code: 'salarios_insuficientes', label: 'Salarios insuficientes' },
			{ code: 'escasez_vivienda_venta', label: 'Escasez de vivienda nueva o de segunda mano' },
			{
				code: 'competencia_inversores',
				label: 'Competencia de inversores o compradores con más capacidad económica'
			}
		]
	},
	{
		code: 'emancipacion_juvenil',
		label: 'Emancipación juvenil',
		causes: [
			{ code: 'precios_elevados', label: 'Precios elevados de alquiler o compra' },
			{ code: 'empleo_joven_inestable', label: 'Empleo joven inestable o mal pagado' },
			{ code: 'falta_ayudas', label: 'Falta de ayudas específicas' },
			{
				code: 'convivencia_prolongada',
				label: 'Necesidad de compartir vivienda durante más tiempo'
			},
			{ code: 'falta_vivienda_pequena', label: 'Falta de vivienda pequeña o asequible disponible' }
		]
	},
	{
		code: 'falta_vivienda_publica',
		label: 'Falta de vivienda pública o asequible',
		causes: [
			{ code: 'parque_publico_insuficiente', label: 'Parque público insuficiente' },
			{ code: 'pocas_viviendas_nuevas', label: 'Pocas viviendas nuevas de este tipo' },
			{ code: 'venta_historica_protegida', label: 'Venta histórica de vivienda protegida' },
			{ code: 'listas_espera_largas', label: 'Listas de espera largas' },
			{ code: 'falta_suelo_presupuesto', label: 'Falta de suelo o presupuesto destinado' }
		]
	},
	{
		code: 'inestabilidad_impagos',
		label: 'Inestabilidad, impagos y riesgo de perder la vivienda',
		causes: [
			{ code: 'perdida_ingresos', label: 'Pérdida o reducción de ingresos' },
			{ code: 'aumento_renta_repentino', label: 'Aumento repentino de la renta o cuota' },
			{ code: 'falta_ayuda_a_tiempo', label: 'Falta de ayudas o mediación a tiempo' },
			{ code: 'contratos_inestables', label: 'Contratos poco estables' },
			{ code: 'gastos_imprevistos', label: 'Gastos imprevistos' }
		]
	},
	{
		code: 'sinhogarismo',
		label: 'Personas sin hogar o en exclusión residencial',
		causes: [
			{
				code: 'falta_alternativas_emergencia',
				label: 'Falta de alternativas habitacionales de emergencia'
			},
			{ code: 'falta_apoyo_social', label: 'Falta de apoyo social o sanitario' },
			{ code: 'desahucios_sin_alternativa', label: 'Desahucios sin alternativa' },
			{ code: 'pobreza_prolongada', label: 'Pobreza o exclusión prolongada' },
			{ code: 'falta_recursos_territorio', label: 'Falta de recursos suficientes en el territorio' }
		]
	},
	{
		code: 'presion_turistica',
		label: 'Presión de alquileres turísticos y temporales',
		causes: [
			{ code: 'rentabilidad_turistica', label: 'Alta rentabilidad frente al alquiler residencial' },
			{ code: 'demanda_turistica_alta', label: 'Elevada demanda turística en la zona' },
			{ code: 'falta_limites_locales', label: 'Falta de límites o regulación local' },
			{ code: 'escasa_inspeccion', label: 'Escasa inspección de la actividad irregular' },
			{ code: 'concentracion_barrios', label: 'Concentración en determinados barrios' }
		]
	},
	{
		code: 'viviendas_vacias',
		label: 'Viviendas vacías o fuera del mercado habitual',
		causes: [
			{ code: 'propietarios_reticentes', label: 'Propietarios que prefieren no alquilar' },
			{
				code: 'mal_estado_pendiente_reforma',
				label: 'Viviendas en mal estado o pendientes de reforma'
			},
			{ code: 'incertidumbre_legal', label: 'Trámites o incertidumbre legal para alquilar' },
			{ code: 'herencias_sin_resolver', label: 'Herencias o situaciones familiares sin resolver' },
			{ code: 'falta_incentivos', label: 'Falta de incentivos para movilizarlas' }
		]
	},
	{
		code: 'mal_estado_accesibilidad',
		label: 'Mal estado, falta de accesibilidad o pobreza energética',
		causes: [
			{ code: 'antiguedad_edificio', label: 'Antigüedad del edificio o la vivienda' },
			{ code: 'coste_rehabilitacion', label: 'Coste elevado de la rehabilitación' },
			{ code: 'falta_ayudas_suficientes', label: 'Falta de ayudas suficientes' },
			{
				code: 'dificultad_acuerdo_comunidad',
				label: 'Dificultad para acordar obras en la comunidad de vecinos'
			},
			{ code: 'baja_eficiencia_energetica', label: 'Baja eficiencia energética de la vivienda' }
		]
	},
	{
		code: 'falta_vivienda_rural',
		label: 'Falta de vivienda en zonas rurales o determinados territorios',
		causes: [
			{
				code: 'escasa_construccion_zona',
				label: 'Escasa construcción o rehabilitación en la zona'
			},
			{ code: 'envejecimiento_parque', label: 'Envejecimiento o abandono del parque existente' },
			{ code: 'falta_servicios', label: 'Falta de servicios que atraigan población' },
			{ code: 'baja_rentabilidad_inversion', label: 'Baja rentabilidad para invertir en la zona' },
			{ code: 'dificultad_financiacion_local', label: 'Dificultad de acceso a financiación local' }
		]
	}
];

export function listeningOptionLabel(code: string): string {
	return VIVIENDA_LISTENING_OPTIONS.find((o) => o.code === code)?.label ?? code;
}
