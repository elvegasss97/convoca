/**
 * Circuito operativo de 0 a 72 horas del Plan Ceuta (borrador 0.1).
 *
 * Transcrito literalmente de `Plan-Ceuta-Borrador-0.1.md` §6 ("El circuito
 * operativo: qué ocurre desde el minuto cero") y contrastado contra el
 * mismo bloque de datos del artifact de referencia
 * (`Plan-Ceuta-Artifact-Final.html`, variable `TRAMOS`). No existe ninguna
 * tabla genérica de `topics` para este concepto (ni Vivienda ni Sanidad
 * tienen un equivalente) — mismo patrón que `sanidadCalendarData.ts`: un
 * módulo estático tipado consumido por un componente bespoke
 * (`CeutaCircuito72h.svelte`).
 */

export interface CeutaTramo {
	id: string;
	rango: string;
	titulo: string;
	ocurre: string[];
	responde: string;
	decision: string;
	garantia: string;
	bloqueo: string;
	remedio: string;
}

export const CEUTA_TRAMOS: CeutaTramo[] = [
	{
		id: 't1',
		rango: '0h – 2h',
		titulo: 'Interceptar, rescatar y conservar la prueba',
		ocurre: [
			'Guardia Civil, Salvamento o el cuerpo competente intercepta o rescata.',
			'Se atiende primero cualquier urgencia vital.',
			'Se registra hora, lugar, medio de entrada, unidad actuante y circunstancias observables.',
			'Se preservan de forma legal las pruebas del punto y forma de acceso.',
			'Se informa de manera comprensible sobre la actuación y la posibilidad de solicitar protección.',
			'Se separa cualquier investigación penal sobre redes, violencia o tráfico de personas del procedimiento migratorio individual.'
		],
		responde: 'Guardia Civil, Salvamento Marítimo o el cuerpo competente.',
		decision:
			'Calificar la situación como rescate, interceptación o localización, y separar cualquier investigación penal sobre redes o tráfico de personas del procedimiento migratorio individual.',
		garantia:
			'Atención vital antes que cualquier objetivo de control; información comprensible sobre la posibilidad de solicitar protección.',
		bloqueo:
			'No poder demostrar después que la persona fue interceptada en frontera o que procedía de Marruecos.',
		remedio:
			'Protocolo único de cadena de custodia, registro geolocalizado, partes normalizados, grabación legal cuando proceda y auditoría de expedientes anulados por falta de prueba.'
	},
	{
		id: 't2',
		rango: '2h – 12h',
		titulo: 'Identidad, salud y primera clasificación',
		ocurre: [
			'Apertura de un expediente electrónico único con reloj legal visible.',
			'Fotografía, huellas y comprobaciones en las bases permitidas.',
			'Verificación de identidad y nacionalidad, sin convertir la falta de documentos en presunción de culpabilidad.',
			'Control sanitario inicial.',
			'Detección de edad dudosa, embarazo, discapacidad, enfermedad, trata, tortura, violencia o necesidades especiales.',
			'Registro de vínculos familiares y prevención de separaciones indebidas.',
			'Pregunta expresa y comprensible sobre protección internacional.',
			'Asignación de abogado e intérprete cuando sean preceptivos.'
		],
		responde:
			'Equipos de identificación, sanitarios, jurídicos y de interpretación de la Unidad Fronteriza.',
		decision:
			'Verificar identidad y nacionalidad sin convertir la falta de documentos en presunción de culpabilidad, y detectar cualquier vulnerabilidad antes de seguir adelante.',
		garantia:
			'Asignación de abogado e intérprete cuando sean preceptivos; el triaje europeo puede llegar a siete días, pero ese plazo no autoriza por sí mismo prolongar una simple detención policial.',
		bloqueo:
			'No disponer de intérprete, confundir a un menor con un adulto o no detectar una vulnerabilidad.',
		remedio:
			'Bolsas de intérpretes presenciales y remotos, equipos especializados de infancia y trata, segunda revisión de casos dudosos y registro de errores detectados y corregidos.'
	},
	{
		id: 't3',
		rango: '12h – 24h',
		titulo: 'Asignar la ruta jurídica',
		ocurre: [
			'A. Rechazo en frontera, únicamente si encaja exactamente en el supuesto legal.',
			'B. Devolución por entrada irregular reciente.',
			'C. Procedimiento fronterizo de asilo.',
			'D. Protección de menores, trata o vulnerabilidad.',
			'E. Expediente de expulsión, si no puede acreditarse el supuesto de devolución reciente.',
			'F. Procedimiento penal independiente, si existen indicios de delito.'
		],
		responde: 'Equipo de clasificación jurídica de la Unidad Fronteriza.',
		decision:
			'Elegir la vía A-F que corresponde exactamente a la situación acreditada, no la más rápida.',
		garantia:
			'La clasificación es siempre revisable; ninguna vía se asigna de forma automática o colectiva.',
		bloqueo: 'Utilizar la vía rápida equivocada y que un tribunal anule la resolución.',
		remedio:
			'Lista de comprobación jurídica, control de calidad por un segundo funcionario en casos dudosos y publicación de la tasa y causas de anulaciones.'
	},
	{
		id: 't4',
		rango: '24h – 48h',
		titulo: 'Resolver y preparar la ejecución',
		ocurre: [
			'La autoridad habilitada dicta, cuando proceda, la resolución individual de devolución.',
			'Se notifica con abogado e intérprete.',
			'Se solicita a Marruecos o al país correspondiente la aceptación o documentación necesaria.',
			'Se activa el transporte y el punto de entrega.',
			'Si existe solicitud de asilo, se inicia el procedimiento fronterizo que corresponda.',
			'Si es menor o vulnerable, se formaliza la puesta a disposición del sistema competente.',
			'Si la persona desea regresar voluntariamente, se verifica que la decisión sea informada, se registra y se facilita una salida segura.'
		],
		responde: 'Autoridad administrativa habilitada, con enlace consular y con Marruecos.',
		decision:
			'Dictar la resolución motivada y activar en paralelo el transporte y la aceptación del país receptor, para no dictar resoluciones que no puedan materializarse.',
		garantia:
			'Notificación siempre con abogado e intérprete; verificación de que cualquier salida voluntaria sea realmente informada.',
		bloqueo:
			'Tener una resolución válida pero no un país que acepte a la persona, documentación o transporte.',
		remedio:
			'Enlace permanente con Marruecos, equipos consulares de guardia, ventanas de entrega preacordadas, transporte reservado y rutas alternativas legalmente disponibles.'
	},
	{
		id: 't5',
		rango: '48h – 60h',
		titulo: 'Revisión obligatoria de casos bloqueados',
		ocurre: [
			'Un equipo distinto revisa todos los expedientes no ejecutados y asigna a cada bloqueo un código público agregado: identidad no confirmada, falta de respuesta consular, país receptor no acepta, asilo solicitado, minoría o vulnerabilidad, asistencia jurídica pendiente, falta de transporte, defecto documental, recurso o medida judicial, u otro motivo motivado.'
		],
		responde: 'Equipo de revisión distinto al que tramitó el expediente originalmente.',
		decision:
			'Asignar un código de bloqueo público y un responsable nominal de guardia a cada expediente no ejecutado.',
		garantia:
			'Ningún expediente bloqueado queda sin responsable ni sin causa publicada de forma agregada.',
		bloqueo: 'Que los expedientes permanezcan en una cola sin responsable.',
		remedio: 'Alerta automática, reasignación obligatoria y responsable nominal de guardia.'
	},
	{
		id: 't6',
		rango: '60h – 72h',
		titulo: 'Salida legal obligatoria',
		ocurre: [
			'Antes del vencimiento, cada expediente debe quedar en uno de estos estados: devolución ejecutada; salida voluntaria ejecutada; devolución suspendida por causa legal; procedimiento fronterizo de asilo activo; menor o persona vulnerable derivada; petición motivada de internamiento presentada al juez; o libertad con medida menos restrictiva.'
		],
		responde:
			'El juez, oído el Ministerio Fiscal, para toda petición de internamiento; la autoridad habilitada para el resto de salidas.',
		decision:
			'Si se solicita CIE, el juez valora proporcionalidad, riesgo de incomparecencia, falta de domicilio o documentación, antecedentes, salud y alternativas menos restrictivas, y decide de forma individual.',
		garantia:
			'Al cumplirse 72 horas, un fallo administrativo no permite por sí solo prolongar la custodia: nadie permanece detenido porque falte una firma o una plaza.',
		bloqueo:
			'Este es el límite del sistema: no existe una séptima hora. Si ningún estado se ha alcanzado, la consecuencia legal es la puesta en libertad, no la prórroga.',
		remedio:
			'El reloj visible desde el tramo 1 y las alertas de los tramos anteriores (12h, 36h, 48h, 60h) están diseñadas precisamente para que este momento no llegue sin una decisión ya tomada.'
	}
];
