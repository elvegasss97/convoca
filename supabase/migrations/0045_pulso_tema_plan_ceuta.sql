-- 0045_pulso_tema_plan_ceuta.sql
--
-- Contenido de "Plan Ceuta — Control, respuesta y convivencia" como nuevo
-- tema de Pulso Ciudadano → Propuestas de Convoca, al mismo nivel que
-- Vivienda y Sanidad. Fuente: Plan-Ceuta-Borrador-0.1.md (fuente principal
-- del contenido narrativo) y Plan-Ceuta-Modelo-Economico-Borrador-0.1.xlsx
-- (modelo económico — reproducido en `src/lib/data/ceutaEconomicModel.ts`,
-- NO en esta migración: el presupuesto interactivo Bajo/Central/Alto y la
-- fórmula del CIE de Plan Ceuta usan un componente bespoke con datos
-- tipados, exactamente el mismo patrón ya usado por Sanidad
-- (`SanidadPresupuesto.svelte` + `sanidadBudgetData.ts`) en vez de las
-- tablas genéricas `topic_budget_*`, que ninguno de los dos temas usa hoy).
--
-- No usa ningún schema nuevo: reutiliza exactamente las tablas ya creadas
-- para Vivienda/Sanidad (0027-0041), con la misma RLS ya vigente (lectura
-- pública cuando el tema no está en borrador, escritura solo
-- moderación/administración) — cero políticas nuevas.
--
-- Aditiva e idempotente: todo el contenido queda dentro de un único bloque
-- `do $$ ... $$` que comprueba primero si ya existe un tema con el slug
-- 'plan-ceuta-2026' y no hace nada si ya existe (mismo criterio de guarda
-- que 0040/0041). No modifica ni borra ninguna fila de Vivienda, Sanidad
-- ni de ningún otro tema. No se aplica en producción desde aquí.
--
-- Categoría: 'seguridad', ya un valor válido del check existente en
-- `topics.category` (0027) — no requiere ampliar ningún check ni tipo.
--
-- Riesgos y calendario: se insertan en las tablas genéricas ya existentes
-- (`topic_risks` con `category` texto libre, igual que Vivienda vía 0041;
-- `topic_timeline_phases` con `items text[]`) porque los componentes
-- genéricos (`RiesgosComprobacion.svelte`, `CalendarioVisual.svelte`) ya
-- soportan exactamente esta forma de contenido sin cambios — confirmado
-- leyendo ambos componentes antes de escribir esta migración.

do $$
declare
	v_topic_id uuid;
	v_round_id uuid;
	v_axis_frontera uuid;
	v_axis_decision uuid;
	v_axis_retorno uuid;
	v_axis_asilo uuid;
	v_axis_infra uuid;
	v_axis_ceuta uuid;
begin
	if exists (select 1 from public.topics where slug = 'plan-ceuta-2026') then
		return;
	end if;

	-- -------------------------------------------------------------------
	-- 1. Tema
	-- -------------------------------------------------------------------
	insert into public.topics (
		id, slug, title, summary, category, status, problem_intro, version,
		document_title, investment_range, reference_goal, public_notice,
		governance_narrative, budget_narrative, evaluation_rules,
		success_indicators, created_at, updated_at
	) values (
		gen_random_uuid(),
		'plan-ceuta-2026',
		'Plan Ceuta — Control, respuesta y convivencia',
		'Una propuesta ciudadana de CONVOCA para que Ceuta tenga una frontera que se anticipa, un sistema que identifica cada nueva llegada y una Administración que decida a tiempo qué vía legal corresponde a cada caso — sin detener a nadie por su aspecto y sin abandonar a la ciudad cuando el sistema se desborda.',
		'seguridad',
		'open',
		E'Ceuta no puede depender de que una crisis extraordinaria se resuelva mediante improvisación, de la disponibilidad de una sola autoridad política o de que Marruecos decida cooperar en cada momento.\n\nLa respuesta tampoco puede consistir en detener indiscriminadamente a quien no lleve documentación. Eso sería ilegal, dañaría a ciudadanos y residentes legítimos y convertiría el origen o la apariencia de una persona en una sospecha.\n\nEl Plan Ceuta propone un contrato operativo verificable: prevenir e interceptar con seguridad las entradas irregulares; registrar y evaluar individualmente cada nueva llegada; ejecutar con rapidez las devoluciones legalmente posibles; proteger a quien solicite asilo, sea menor o presente vulnerabilidad; y evitar que Ceuta soporte sola el desbordamiento.\n\nLa meta no es prometer "expulsar a todos en 72 horas". Las 72 horas son el límite que obliga a que el sistema deje de improvisar. Antes de que venza ese tiempo, cada caso debe haber llegado a una de estas salidas: retorno o devolución legalmente ejecutada; salida voluntaria, realmente informada y registrada; procedimiento de protección internacional activado; derivación al sistema de protección de menores o de víctimas vulnerables; solicitud judicial motivada de internamiento, cuando sea necesaria y proporcional; o puesta en libertad con una medida menos restrictiva, cuando el internamiento no proceda. Nadie podrá permanecer en simple custodia policial más allá del plazo legal porque el expediente esté atascado, falte una firma o no exista una plaza disponible.\n\nDato contrastado: el Ministerio del Interior cifró en 72.000 las entradas irregulares registradas en Ceuta el 30 de julio de 2026. El 4 de agosto afirmó que más de 70.000 personas ya habían salido de la ciudad y que continuaban los trámites respecto de las restantes. Esa cifra acredita la magnitud excepcional de la crisis, pero la comunicación oficial disponible no desglosa todavía con precisión cuántas personas regresaron voluntariamente, fueron readmitidas o devueltas mediante resolución, solicitaron protección internacional, eran menores, permanecen en Ceuta o quedaron sometidas a otro procedimiento. CONVOCA no presentará las más de 70.000 salidas como si todas hubieran sido expulsiones forzosas: la primera obligación del plan es exigir un balance final, desglosado y auditable.\n\nEl 8 de julio de 2026 el Tribunal Supremo confirmó que el régimen especial de "rechazo en frontera" de Ceuta y Melilla no puede aplicarse automáticamente a quienes intentan entrar a nado; fuera de ese supuesto legal debe utilizarse el procedimiento individual correspondiente. El Gobierno sostuvo que redes de tráfico de personas difundieron una interpretación interesada de esa sentencia como incentivo para las llegadas, y reconoció un repunte en los días posteriores — CONVOCA trata esto como la posición oficial, no como una causalidad definitivamente probada por una investigación independiente.',
		'0.1',
		'Plan Ceuta — Borrador 0.1',
		'46,6–156,7 M€ de inversión inicial según escenario (Bajo–Alto); 88,1 M€ en el escenario Central recomendado para revisión',
		'Cada expediente resuelto, suspendido por causa legal, derivado o presentado al juez con petición motivada antes de que venzan 72 horas desde la interceptación — sin prórroga por simple fallo administrativo.',
		'Esta es una propuesta ciudadana abierta a revisión de CONVOCA. No es una ley aprobada, una orden operativa ni una solución definitiva. Distingue los hechos comprobados, las medidas propuestas y las decisiones que todavía necesitan datos, validación económica o una reforma normativa. El borrador 0.1 incorpora un modelo económico reproducible, pero no sustituye los inventarios, anteproyectos, RPT, estudios de mercado ni resoluciones de financiación exigibles.',
		E'Quién dirige: Consejo de Ministros (estrategia, financiación, refuerzos, cooperación interministerial y reformas de alcance estatal); Ministerio del Interior (dirección del dispositivo, Policía, Guardia Civil, fronteras, expedientes, retorno y red de CIE).\n\nQuién ejecuta: Delegación del Gobierno en Ceuta (coordinación territorial y ejercicio o delegación válida de competencias administrativas); Guardia Civil (custodia y vigilancia de costa y frontera, intercepción y control de inmigración irregular en su ámbito); Policía Nacional (identificación, extranjería, asilo, instrucción y ejecución de devoluciones y expulsiones).\n\nQuién controla: Justicia, CGPJ, TSJ y Fiscalía — medios judiciales y fiscales, autorización y control del internamiento, recursos y protección de garantías, respetando su autonomía e independencia.\n\nQuién apoya: Ministerio de Inclusión y Migraciones (CETI, atención humanitaria y sistema de acogida dentro de sus competencias); Ministerio de Exteriores (cooperación con Marruecos y países de origen, consulados y documentación); Salvamento Marítimo y Sanidad (rescate, atención urgente, salud pública y derivación asistencial); Ciudad de Ceuta (servicios locales, Policía Local dentro de sus funciones, limpieza, asistencia social, comercio y protección de menores en su ámbito); Fuerzas Armadas (apoyo autorizado en logística, ingeniería, vigilancia técnica, transporte, comunicaciones, sanidad y necesidades públicas graves — nunca decisiones de extranjería, identificaciones ordinarias o expedientes, que corresponden siempre a las autoridades civiles y policiales competentes); Unión Europea y agencias (apoyo operativo, asilo, fronteras, financiación, solidaridad y supervisión conforme a sus normas).',
		E'CONVOCA incorpora en este borrador un modelo económico reproducible en euros constantes de julio de 2026 (anexo de cálculo: Plan-Ceuta-Modelo-Economico-Borrador-0.1.xlsx). El modelo permite cambiar capacidades, volúmenes, plantillas, costes unitarios, calendario y financiación sin reescribir el plan.\n\nLo que queda cerrado para este borrador es la estructura del presupuesto, el escenario central de trabajo y la banda de incertidumbre. Lo que sigue abierto a validación es el coste contractual final, porque depende del inventario de activos y vacantes, la ubicación y el anteproyecto del CIE, las rutas reales de retorno, la RPT, el mercado y la financiación europea efectivamente concedida.\n\nReglas financieras: separar inversión única, gasto anual y reserva contingente. Mostrar coste bruto antes de cualquier ayuda europea. No contar como ahorro ni como resultado un retorno que todavía no se haya ejecutado. No duplicar activos, personal o contratos existentes. No reducir asistencia, defensa, salud, protección de menores o control judicial para aparentar un coste menor. Vincular cada aumento de plantilla, plaza o infraestructura a un indicador de carga y resultado. Someter desviaciones relevantes a explicación pública y revisión independiente. Mantener el libro de cálculo, sus fórmulas y sus fuentes como anexo público versionado.\n\nLa inversión de 19,43 M€ ya declarada para El Tarajal, cofinanciada al 90 % mediante asistencia de emergencia europea, se trata como activo existente: el plan solo presupuestará la brecha que revele el inventario, nunca volverá a cargar el activo completo. La financiación europea (FAMI/IGFV) se presenta siempre como sensibilidad, nunca como ingreso concedido: el presupuesto debe poder sostenerse sin anticiparla. La reserva anual de emergencia es un techo contingente que no se suma al gasto esperado mientras no se active y ejecute.',
		E'Reglas contra el maquillaje de resultados: una orden no ejecutada no contará como devolución. Una salida voluntaria no contará como expulsión forzosa. Una respuesta automática no contará como entrevista o asistencia jurídica. Una persona no detectada no podrá desaparecer del denominador mediante una estimación interesada. Reducir las solicitudes de asilo dificultando su acceso no contará como mejora. Llenar un CIE no contará como éxito. No publicar una vulneración no hará que deje de existir.\n\nCondiciones para pasar de este borrador 0.1 a una versión 1: revisión de una persona especialista en extranjería y asilo; revisión de operatividad por perfiles de Policía, Guardia Civil, salvamento, protección de menores y gestión de emergencias; revisión independiente de derechos fundamentales; contraste con la Ciudad de Ceuta y profesionales locales; validación técnica independiente de la memoria económica preliminar; datos oficiales finales de la crisis; comprobación de que todas las fuentes siguen vigentes; respuesta expresa a las diez decisiones abiertas identificadas en el borrador (capacidad y ubicación exacta del CIE, validación contractual de la banda económica, plantilla definitiva de la Unidad Fronteriza, umbrales de los niveles de alerta, instalaciones notificadas para el procedimiento fronterizo europeo, encaje jurídico definitivo de la barrera marítima, autoridades con competencia delegada, refuerzo judicial y fiscal necesario, protocolo bilateral operativo con Marruecos, y balance final auditado de la crisis del 30 de julio).',
		array[
			'Tiempo desde la primera señal hasta la activación del nivel de alerta.',
			'Porcentaje de personas interceptadas o localizadas con expediente abierto en dos horas.',
			'Porcentaje con identificación y triaje inicial completados.',
			'Tiempo hasta abogado e intérprete.',
			'Porcentaje con ruta jurídica asignada en 24 horas.',
			'Devoluciones resueltas y devoluciones realmente ejecutadas.',
			'Porcentaje de casos ejecutados antes de 72 horas.',
			'Casos que alcanzan las 60 y 72 horas, con motivo.',
			'Solicitudes judiciales de CIE, autorizaciones, denegaciones y alternativas acordadas.',
			'Estancia media y percentiles en CIE; porcentaje que termina en retorno ejecutado.',
			'Solicitudes de asilo, tiempos, recursos y resoluciones corregidas.',
			'Menores y personas vulnerables derivados al recurso adecuado dentro de plazo.',
			'Aceptaciones y rechazos de readmisión por país y causa.',
			'Incidentes de seguridad, agresiones, daños y tiempo de respuesta, comparados con periodos equivalentes.',
			'Gasto comprometido y ejecutado por medida, junto con quejas y vulneraciones confirmadas.'
		],
		'2026-08-14T00:00:00Z',
		'2026-08-14T00:00:00Z'
	)
	returning id into v_topic_id;

	-- -------------------------------------------------------------------
	-- 2. Ejes de medidas (filtros del mapa de medidas)
	-- -------------------------------------------------------------------
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Prevención y frontera', 1) returning id into v_axis_frontera;
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Decisión administrativa', 2) returning id into v_axis_decision;
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Retorno', 3) returning id into v_axis_retorno;
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Asilo y protección', 4) returning id into v_axis_asilo;
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Infraestructuras', 5) returning id into v_axis_infra;
	insert into public.topic_measure_axes (id, topic_id, title, sort_order) values
		(gen_random_uuid(), v_topic_id, 'Protección de Ceuta', 6) returning id into v_axis_ceuta;

	-- -------------------------------------------------------------------
	-- 3. Las ocho medidas
	-- -------------------------------------------------------------------
	insert into public.topic_measures (
		topic_id, axis_id, title, summary, problem_addressed, explanation,
		responsible_scope, estimated_cost, estimated_cost_min, estimated_cost_max,
		timeframe, risks, safeguard, indicators, sort_order
	) values
	(
		v_topic_id, v_axis_decision,
		'Mando único permanente y alerta temprana',
		'Un Mando Integrado de Frontera de Ceuta, operativo 24 horas, con cuatro niveles públicos de preparación y simulacros trimestrales de saturación.',
		'La sentencia se conoció el 8 de julio y el propio Gobierno reconoció un repunte posterior. Una crisis no debe esperar a que la entrada masiva ya esté ocurriendo para activar coordinación, personal y recursos.',
		E'Qué propone CONVOCA:\n- Crear un Mando Integrado de Frontera de Ceuta, operativo las 24 horas y dirigido por Interior.\n- Integrar en una misma estructura a Guardia Civil, Policía Nacional, Salvamento Marítimo, Protección Civil, Delegación del Gobierno, servicios sanitarios, protección de menores, Ciudad de Ceuta y enlaces de Defensa, Exteriores y Migraciones.\n- Establecer cuatro niveles públicos de preparación, con umbrales operativos reservados cuando sea necesario por seguridad: normalidad, vigilancia reforzada, preemergencia, emergencia.\n- Analizar, con autorización y límites legales, señales de organización de cruces, campañas de desinformación y actividad de redes de tráfico.\n- Mantener enlace permanente con Marruecos, Europol, Frontex y la Agencia de Asilo de la UE cuando corresponda.\n- Realizar simulacros trimestrales de saturación, incluyendo una caída de comunicaciones o una retirada repentina de cooperación marroquí.\n- Publicar un informe posterior a cada activación relevante en un máximo de quince días, excluyendo únicamente la información cuya reserva esté justificada.\n\nCalendario: primeras 72 horas, designación de mando y responsables de guardia · primeros 30 días, protocolo, niveles de alerta y directorio común · antes de 90 días, primer ejercicio de estrés completo · cada trimestre, simulacro o prueba parcial.\n\nSi falla: activación automática del nivel superior, dirección temporal por el sustituto designado e investigación externa del fallo con responsables, cronología y correcciones públicas.',
		'Ministerio del Interior y Secretaría de Estado de Seguridad. Participan Delegación del Gobierno, Ciudad de Ceuta y los organismos integrados dentro de sus competencias.',
		'Inversión inicial (escenario Central): 4,5 M€ · Coste anual maduro: 2,8 M€',
		2.7, 7.0,
		'Primeras 72 horas: designación de mando',
		'Si falla: activación automática del nivel superior, dirección temporal por el sustituto designado e investigación externa del fallo, con responsables, cronología y correcciones públicas.',
		'La vigilancia de redes no permitirá criminalizar comunidades, opiniones o conversaciones lícitas. Toda investigación intrusiva requerirá la base legal y el control correspondientes.',
		array['Tiempo entre primera señal y cambio de nivel.','Tiempo de movilización de refuerzos.','Cobertura efectiva de turnos.','Capacidad probada por hora.','Fallos detectados en simulacros.','Recomendaciones corregidas dentro de plazo.'],
		1
	),
	(
		v_topic_id, v_axis_frontera,
		'Frontera terrestre y marítima segura, redundante y compatible con el salvamento',
		'Defensa por capas (vigilancia, radar, drones, patrullas, rescate) que no dependa de una sola barrera, con las Fuerzas Armadas limitadas a apoyo técnico y logístico.',
		'Una barrera terrestre no cubre por sí sola los accesos a nado. Una barrera marítima aislada también puede ser rebasada, fallar, desplazar la ruta o aumentar el riesgo de ahogamiento.',
		E'Qué propone CONVOCA:\n- Evaluar jurídicamente y mediante ingeniería marítima la barrera neumática y las boyas ya instaladas.\n- Diseñar una defensa por capas: vigilancia visual y térmica; radar y sensores adecuados; drones con protocolos de privacidad; patrullas costeras y embarcaciones de rescate; iluminación y comunicaciones redundantes; equipos de intervención y salvamento preposicionados; coordinación inmediata con el lado marroquí.\n- Asegurar que toda barrera tenga zonas y procedimientos de rescate, mantenimiento preventivo y retirada rápida ante condiciones peligrosas.\n- Conservar pruebas del punto y modo de acceso sin retrasar la atención vital.\n- Mantener rutas legales de acceso al asilo efectivas y conocidas.\n- Limitar el papel ordinario de las Fuerzas Armadas a vigilancia técnica, ingeniería, transporte, comunicaciones, apoyo marítimo, alojamiento, sanidad y logística bajo dirección gubernamental. Las decisiones de extranjería, identificaciones ordinarias y expedientes corresponderán a las autoridades civiles y policiales competentes.\n\nCalendario: inmediato, inspección diaria y cobertura de rescate · 30 días, informe jurídico y de seguridad de la barrera · 90 días, mapa de puntos ciegos y redundancias · anual, auditoría técnica y de derechos.\n\nSi falla: no se insistirá en una única barrera. Se activarán medios móviles, refuerzo marítimo, cooperación internacional y el circuito ordinario de devolución. Toda lesión grave o muerte desencadenará revisión independiente del protocolo.',
		'Guardia Civil y Ministerio del Interior, con Salvamento Marítimo y el apoyo técnico que se acuerde con Defensa y otros organismos.',
		'Inversión inicial (escenario Central): 17,4 M€ · Coste anual maduro: 4,6 M€',
		8.9, 28.7,
		'Inmediato: inspección diaria de la barrera',
		'Si falla: no se insistirá en una única barrera; se activarán medios móviles, refuerzo marítimo, cooperación internacional y el circuito ordinario de devolución.',
		'«Cero entradas» no contará como éxito si aumenta las muertes, desplaza el peligro a otra ruta o bloquea el acceso efectivo a protección internacional.',
		array['Intentos detectados antes de alcanzar zona de riesgo.','Tiempo de respuesta.','Rescates, lesiones y fallecimientos.','Disponibilidad de sensores y embarcaciones.','Interrupciones de servicio.','Expedientes que pierden validez por falta de prueba del acceso.'],
		2
	),
	(
		v_topic_id, v_axis_decision,
		'Unidad Fronteriza 24/7: un expediente, un reloj y un responsable',
		'Una Unidad Fronteriza Integrada que reúne identificación, abogados, intérpretes, sanidad y asilo en un mismo circuito, con alertas a las 12, 36, 48 y 60 horas.',
		'Las 72 horas se consumen si identificación, abogado, intérprete, sanidad, asilo, autoridad resolutoria y transporte trabajan en cadenas separadas o solo en horario de oficina.',
		E'Qué propone CONVOCA:\n- Crear una Unidad Fronteriza Integrada 24/7 en Ceuta.\n- Reunir en ella: Policía de Extranjería y Fronteras; autoridad administrativa habilitada de guardia; abogados de asistencia jurídica; intérpretes presenciales y remotos; personal sanitario; especialistas en infancia, trata y vulnerabilidad; personal de protección internacional; enlace consular y con Marruecos; transporte y logística; enlace judicial para remisión de solicitudes, sin interferir en la independencia del juez.\n- Asignar a cada persona un expediente único y un reloj visible desde la interceptación.\n- Fijar alertas internas a las 12, 36, 48 y 60 horas.\n- Prohibir expedientes sin responsable nominal de turno.\n- Mantener formularios y circuitos de contingencia si cae el sistema informático.\n- Realizar una evaluación de impacto de protección de datos, accesos por rol y conservación limitada.\n\nCalendario: 7 días, turno provisional continuo · 30 días, espacio, plantilla mínima, plataforma de seguimiento y protocolos · 90 días, prueba de carga y auditoría de seguridad y privacidad.\n\nSi falla: se reasignará el expediente, se activará personal de reserva y se utilizará el circuito manual firmado. Los incumplimientos del límite se publicarán con su causa y corrección; no se borrarán del indicador.',
		'Ministerio del Interior y Delegación del Gobierno, con Justicia, Inclusión, Sanidad, Ciudad de Ceuta y colegios profesionales dentro de sus competencias.',
		'Inversión inicial (escenario Central): 8,5 M€ · Coste anual maduro: 8,9 M€',
		5.0, 13.0,
		'7 días: turno provisional continuo',
		'Si falla: reasignación del expediente, personal de reserva y circuito manual firmado. Los incumplimientos se publican con su causa y corrección, nunca se borran del indicador.',
		'La rapidez no permitirá copiar resoluciones genéricas, omitir entrevistas, ignorar una solicitud de asilo ni convertir un algoritmo en autoridad decisoria.',
		array['Porcentaje con expediente abierto en dos horas.','Porcentaje con ruta jurídica asignada en 24 horas.','Tiempo hasta abogado e intérprete.','Porcentaje de expedientes resueltos antes de 60 y 72 horas.','Errores de identidad o duplicados.','Accesos indebidos a datos.','Casos liberados por simple fallo administrativo.'],
		3
	),
	(
		v_topic_id, v_axis_decision,
		'Cadena profesional de decisión, suplencia y control',
		'Delegación de la firma de devoluciones en varios responsables profesionales con suplencias, para que ninguna autoridad sea un punto único de fallo.',
		'Si todas las devoluciones dependen materialmente de que una única autoridad política firme o organice miles de expedientes, esa persona se convierte en un punto único de fallo.',
		E'Qué propone CONVOCA:\n- Publicar una resolución de delegación de competencias, adaptada a Ceuta y revisada por los servicios jurídicos, en varios responsables profesionales de Policía Nacional y Extranjería y Fronteras.\n- Tomar como precedente la resolución publicada en 2026 por la Subdelegación del Gobierno en A Coruña, que delegó en titulares de comisarías la competencia para ordenar devoluciones.\n- Establecer varios responsables habilitados por turno, con suplencias predeterminadas.\n- Exigir que cada resolución indique expresamente la delegación utilizada.\n- Mantener la posibilidad legal de avocación para casos concretos, dejando rastro y motivación.\n- Crear un escalado interno obligatorio: alerta a las 36 horas; revisión jurídica a las 48; decisión o remisión judicial preparada antes de las 60; informe inmediato por cualquier incumplimiento a las 72.\n- Publicar mensualmente tiempos, retrasos y causa agregada.\n- Evaluar, tras un año, si resulta necesario modificar el Reglamento de Extranjería para atribuir directamente determinadas decisiones fronterizas a una autoridad profesional estable, con supervisión administrativa y judicial.\n\nCalendario: 15 días, informe jurídico y mapa de competencias · 30 días, delegación y suplencias publicadas · 6 meses, auditoría de funcionamiento · 12 meses, decisión sobre reforma reglamentaria.\n\nSi falla: actuará el suplente ya habilitado y se elevará el incidente al superior competente. Si existe una decisión política general de no aplicar el sistema, el control será parlamentario, judicial cuando proceda y electoral; ningún organigrama puede sustituir por completo la responsabilidad política.',
		'Delegación del Gobierno, ministerios competentes e Interior. Cualquier reforma normativa corresponderá al Gobierno y, si exige ley, a las Cortes Generales.',
		'Inversión inicial (escenario Central): 0,4 M€ · Coste anual maduro: 0,7 M€',
		0.2, 0.7,
		'15 días: informe jurídico y mapa de competencias',
		'Si falla: actúa el suplente ya habilitado y se eleva el incidente al superior competente; la inacción injustificada debe investigarse conforme a las obligaciones de tramitación y resolución de la Administración.',
		'Delegar no significa automatizar ni imponer cuotas. La autoridad delegada deberá examinar y motivar cada caso. Un programa podrá alertar y ordenar información, nunca decidir una devolución.',
		array['Expedientes por autoridad habilitada.','Horas sin firmante disponible.','Porcentaje de decisiones fuera del plazo interno.','Delegaciones revocadas y motivo.','Avocaciones realizadas.','Expedientes anulados por incompetencia del órgano.'],
		4
	),
	(
		v_topic_id, v_axis_retorno,
		'Retorno y readmisión ejecutables, no solo resoluciones en papel',
		'Un equipo hispano-marroquí permanente de readmisión, con tres circuitos separados según nacionalidad y transporte reservado antes de dictar resoluciones.',
		'Una orden de devolución no sirve si no se conoce la identidad, el país no acepta a la persona, no se acredita que llegó desde Marruecos o no existe transporte.',
		E'Qué propone CONVOCA:\n- Crear un equipo hispano-marroquí permanente de readmisión con responsables, teléfonos operativos, puntos de entrega y franjas horarias pactadas.\n- Reactivar y hacer operativo el Comité Mixto previsto en el acuerdo bilateral de 1992.\n- Separar tres circuitos: 1) nacionales marroquíes, confirmación documental o consular y retorno mediante el canal bilateral aplicable; 2) nacionales de terceros países llegados desde Marruecos, solicitud formal de readmisión, prueba de procedencia y cumplimiento del plazo de diez días previsto en el acuerdo, con sus excepciones; 3) personas que deban retornar a otro país, identificación consular, documento de viaje y admisión asegurada por el Estado de destino.\n- Desplegar equipos consulares móviles y videoconferencia segura para identificación.\n- Reservar transporte, escoltas y capacidad de entrega antes de dictar resoluciones que no puedan materializarse.\n- Ofrecer retorno voluntario asistido cuando sea apropiado, sin presión indebida y diferenciándolo en las estadísticas del retorno forzoso.\n- Solicitar apoyo europeo operativo y financiero cuando la presión lo justifique.\n- Publicar las causas de no ejecución, no solo el número de órdenes dictadas.\n\nCalendario: inmediato, enlace bilateral de guardia · 30 días, protocolo escrito y pruebas de entrega · 90 días, acuerdos consulares con los principales países de origen pendientes · semestral, revisión del Comité Mixto y de los bloqueos.\n\nSi falla: si Marruecos suspende o reduce la cooperación, se activarán la vía diplomática europea, la documentación con países de origen, el apoyo de Frontex cuando proceda y las alternativas legales menos restrictivas. Una persona no podrá permanecer internada indefinidamente: alcanzado el máximo legal o desaparecida la perspectiva real de retorno, deberá finalizar el internamiento.',
		'Ministerios del Interior y de Asuntos Exteriores, Policía Nacional, autoridades marroquíes y representaciones consulares.',
		'Inversión inicial (escenario Central): 1,9 M€ · Coste anual maduro: 8,9 M€',
		1.0, 3.5,
		'Inmediato: enlace bilateral de guardia',
		'Si falla: vía diplomática europea, documentación con países de origen, apoyo de Frontex y alternativas menos restrictivas. Nunca internamiento indefinido.',
		'No se devolverá a una persona a un territorio donde exista un riesgo prohibido por el principio de no devolución. La cooperación diplomática no podrá sustituir la evaluación individual.',
		array['Resoluciones dictadas y ejecutadas, separadas.','Tiempo entre resolución y salida.','Aceptación por nacionalidad y país receptor.','Solicitudes al amparo del acuerdo dentro de diez días.','Devoluciones frustradas y causa.','Retornos voluntarios y forzosos, sin mezclarlos.','Coste medio por salida ejecutada.'],
		5
	),
	(
		v_topic_id, v_axis_asilo,
		'Asilo, menores y vulnerabilidad sin colapsar el circuito',
		'Triaje europeo con protección inmediata de menores y vulnerables, sin bloquear devoluciones claras ni rechazar indebidamente a quien necesita protección.',
		'Un sistema rápido puede cometer dos errores opuestos: bloquear devoluciones claras por falta de capacidad para examinar solicitudes o rechazar indebidamente a quien necesita protección.',
		E'Qué propone CONVOCA:\n- Aplicar el triaje europeo con identificación, controles de seguridad, salud y vulnerabilidad.\n- Tramitar en frontera las solicitudes que cumplan los requisitos del nuevo Reglamento europeo.\n- Garantizar abogado durante la formalización y toda la fase administrativa.\n- Intentar resolver los supuestos claros dentro del primer plazo nacional de cuatro días, sin transformar ese objetivo en una denegación automática.\n- Mantener capacidad para el procedimiento fronterizo completo, cuyo máximo europeo es de doce semanas incluyendo el recurso cuando corresponda.\n- Designar instalaciones adecuadas para la residencia durante el procedimiento, diferenciando residencia obligatoria de detención.\n- No internar automáticamente a solicitantes de asilo ni a familias.\n- Activar inmediatamente la protección de menores no acompañados; no podrán ingresar en CIE.\n- Reforzar a Fiscalía, equipos de determinación de edad, protección infantil y recursos de traslado a otras comunidades conforme al marco vigente.\n- Crear circuitos específicos para trata, embarazo, enfermedad grave, discapacidad, tortura, violencia y salud mental.\n- Pedir apoyo de la Agencia de Asilo de la UE y activar los mecanismos europeos de solidaridad o crisis cuando concurran sus requisitos.\n\nCalendario: inmediato, equipos especializados de guardia · 30 días, capacidad mínima y separación física de circuitos · 90 días, evaluación de calidad, recursos y resoluciones revocadas · anual, auditoría externa de derechos y resultados.\n\nSi falla: se activará personal de refuerzo, derivación nacional, apoyo europeo y ampliación temporal de instalaciones de procedimiento. Si no pueden cumplirse las garantías del procedimiento fronterizo, se aplicará la vía ordinaria que corresponda; no se mantendrá a las personas en un limbo jurídico.',
		'Ministerio del Interior, Dirección General de Protección Internacional, Fiscalía, Ciudad de Ceuta en protección de menores, Ministerio de Inclusión, órganos judiciales y organismos europeos dentro de sus competencias.',
		'Inversión inicial (escenario Central): 11,0 M€ · Coste anual maduro: 3,6 M€',
		6.0, 18.0,
		'Inmediato: equipos especializados de guardia',
		'Si falla: personal de refuerzo, derivación nacional, apoyo europeo y ampliación temporal de instalaciones. Nunca se deja a las personas en un limbo jurídico.',
		'El número bajo de solicitudes de asilo no será un indicador de éxito. Tampoco se presumirá fraude por pedir protección tras una entrada irregular.',
		array['Tiempo de registro y formalización de asilo.','Tiempo de primera resolución.','Casos que agotan doce semanas.','Recursos estimados y anulaciones.','Menores identificados y tiempo hasta recurso adecuado.','Vulnerabilidades detectadas.','Accesos a abogado, intérprete y sanidad.','Separaciones familiares corregidas.'],
		6
	),
	(
		v_topic_id, v_axis_infra,
		'Infraestructura completa: primera atención, procedimiento y CIE permanente modular en Ceuta',
		'CATE consolidado, instalación de procedimiento fronterizo separada, y un CIE modular de 250 plazas (ampliable a 400) como hipótesis, condicionado a un estudio de necesidad de 90 días.',
		'Ceuta tiene acogida temporal, pero carece de un CIE propio. Cuando una devolución no puede ejecutarse en 72 horas y un juez autoriza internamiento, es necesario encontrar plaza y trasladar a la persona a la península. Construir únicamente un CIE tampoco resuelve la crisis: si no existe identificación, resolución, país receptor o transporte, el edificio se llena y, al agotarse el máximo legal de 60 días, la persona debe salir del centro.',
		E'Qué propone CONVOCA:\nA. Capacidad inmediata de primera atención: consolidar un CATE o instalación equivalente con módulos de identificación, sanidad, entrevistas, abogados, intérpretes y separación de vulnerabilidades; definir por escrito el régimen jurídico de cada zona; prohibir convertir de hecho una instalación de atención en un CIE sin orden ministerial, condiciones equivalentes y autorización judicial individual.\nB. Instalación de procedimiento fronterizo: espacios adecuados para tramitación de asilo y retorno fronterizo bajo el marco europeo, separando alojamiento, entrevistas, asistencia jurídica, salud, infancia y seguridad; evitar que familias o solicitantes permanezcan en dependencias policiales inadecuadas.\nC. Capacidad provisional de internamiento en emergencia: Interior podrá habilitar capacidad temporal conforme al artículo 5.2 del Reglamento de los CIE, con instalaciones y servicios similares a un CIE, cada ingreso con resolución judicial individual, fecha de cierre, inspección independiente y publicación de ocupación y condiciones.\nD. CIE estatal permanente, modular y controlado judicialmente en Ceuta: estudio de necesidad y viabilidad en 90 días; capacidad elegida según internamientos simultáneos judicialmente autorizados en escenarios ordinario, intenso y excepcional, nunca según el total bruto de llegadas; módulos independientes y ampliables; asistencia sanitaria y social suficiente, comedor, patios, visitas, comunicaciones, espacios de culto, salas confidenciales para abogados, interpretación, accesibilidad y contacto con organizaciones de supervisión; diseño como establecimiento no penitenciario, aunque exista privación de libertad; designación y refuerzo del órgano judicial de control antes de la apertura; publicación de la orden ministerial de creación con memoria, capacidad y régimen exigibles; no se admitirán ingresos hasta que instalaciones, plantilla, servicios y control judicial estén realmente operativos.\n\nFórmula para decidir capacidad: la memoria no utilizará «72.000 entradas = 72.000 plazas». Calculará personas adultas cuya devolución no se ejecuta en 72 horas, porcentaje para el que la Policía solicita internamiento, porcentaje autorizado por el juez, duración mediana y percentiles de estancia, probabilidad real de ejecución del retorno, ocupación simultánea en distintos escenarios, margen de mantenimiento y contingencia, y disponibilidad y coste de alternativas menos restrictivas. La capacidad final permanece como decisión abierta hasta disponer de estos datos.\n\nCalendario: 0-30 días, auditoría de CATE, CETI, salas y capacidad de traslado · 0-90 días, estudio de necesidad, suelo, impacto, alternativas, plantilla y coste del CIE · 3-9 meses, decisión política, información pública, elección del terreno y anteproyecto si el estudio es favorable · 9-18 meses, proyecto, evaluación, financiación y licitación · 18-60 meses, construcción, contratación, inspección y puesta en servicio, sujeto al proyecto real. No se anunciará una fecha exacta de apertura hasta disponer de proyecto, terreno, presupuesto y contrato: el precedente de Algeciras muestra que una infraestructura así puede tardar años.\n\nSi falla: si se retrasa la obra, capacidad provisional legal, traslados planificados y refuerzo de Algeciras. Si se dispara el coste, revisión de alcance, licitación por fases y publicación de desviaciones, sin reducir asistencia básica para mantener el número de plazas. Si queda infrautilizado, módulos adaptables y reducción de operación, sin crear incentivos para internar más. Si se vulneran derechos, actuación inmediata del juez de control, suspensión del módulo afectado, inspección independiente y plan corrector. Si no mejora los retornos, revisión de la medida: el problema estará en documentación, cooperación o procedimiento y no se justificará ampliar plazas sin resolverlo.',
		'Ministerio del Interior y Dirección General de la Policía. Ceuta podrá ofrecer suelo y participar en planificación, pero no crear por sí sola un CIE. Justicia y el poder judicial organizarán el control dentro de sus competencias.',
		'Inversión inicial (escenario Central): 36,9 M€, de los que 27,9 M€ corresponden al CIE (250 plazas) y 9,0 M€ a CATE/primera atención · Coste anual maduro: 14,8 M€',
		19.0, 73.8,
		'0-90 días: estudio de necesidad y viabilidad del CIE',
		'Si falla: capacidad provisional legal y refuerzo de Algeciras si se retrasa la obra; revisión de alcance y publicación de desviaciones si se dispara el coste; actuación inmediata del juez de control si se vulneran derechos.',
		'Más ocupación del CIE no contará como éxito. El indicador será si el internamiento fue necesario, legal, breve, digno y útil para una devolución realmente ejecutable.',
		array['Personas mantenidas en dependencias inadecuadas.','Traslados a península y coste.','Solicitudes judiciales, autorizaciones y denegaciones.','Ocupación y estancia media.','Retornos ejecutados desde CIE.','Liberaciones al alcanzar el plazo o desaparecer el motivo.','Quejas, inspecciones y vulneraciones.','Coste de obra y operación frente a presupuesto.','Uso de alternativas menos restrictivas.'],
		7
	),
	(
		v_topic_id, v_axis_ceuta,
		'Seguridad, convivencia, reparación y transparencia para Ceuta',
		'Refuerzo de servicios y seguridad, canal único de emergencias, ayudas a comercios afectados y un panel público con dieciséis categorías de datos.',
		'Una entrada masiva puede saturar calles, sanidad, limpieza, comercios, protección de menores y seguridad. El miedo también puede provocar bulos, agresiones o patrullas vecinales que sustituyan ilegalmente a la Policía.',
		E'Qué propone CONVOCA:\n- Reforzar patrullas profesionales según incidencias y datos, no mediante controles raciales.\n- Crear un canal único para emergencias, delitos, personas desaparecidas, necesidades humanitarias y daños.\n- Investigar y perseguir agresiones, robos, daños, amenazas y delitos de odio con independencia de quién sea la víctima o el autor.\n- Impedir patrullas o batidas privadas que intimiden o agredan.\n- Reforzar temporalmente limpieza, sanidad, transporte, albergue, traducción y servicios sociales.\n- Compensar daños acreditados y habilitar ayudas temporales a comercios o autónomos directamente afectados, con reglas y auditoría.\n- Informar en varios idiomas sobre salidas voluntarias, derechos, obligaciones y recursos.\n- Publicar un panel diario mientras exista emergencia y semanal en situación estabilizada, con dieciséis categorías de datos: intentos detectados; personas interceptadas o localizadas; rescates, lesiones y fallecimientos; personas identificadas y con triaje completo; devoluciones resueltas; devoluciones ejecutadas; salidas voluntarias; readmisiones por circuito; solicitudes de protección internacional; menores y derivaciones protectoras; peticiones de CIE, autorizaciones y denegaciones judiciales; ocupación de CATE, procedimiento fronterizo, CETI y CIE; casos que superaron plazos y motivo; incidentes delictivos denunciados y esclarecidos, con contexto comparable; quejas por actuación pública y resultado; gasto comprometido, ejecutado y por finalidad. Cada cifra incluirá definición, periodo, fuente, fecha de actualización y limitaciones. Los datos de salidas voluntarias no se mezclarán con expulsiones o devoluciones forzosas.\n\nCalendario: inmediato, seguridad y servicios extraordinarios · 7 días, panel básico · 30 días, mecanismo de daños y ayudas · 90 días, balance independiente de la respuesta.\n\nSi falla: refuerzo estatal adicional, mando de crisis, publicación de la brecha de servicio y plan de recuperación con fecha. Si se detectan datos falsos o manipulados, se conservará la versión anterior, se explicará la corrección y se activará auditoría externa.',
		'Gobierno de España, Ciudad de Ceuta, Delegación del Gobierno, Policía Nacional, Guardia Civil, Policía Local y servicios competentes.',
		'Inversión inicial (escenario Central): 4,0 M€ · Coste anual maduro: 2,6 M€',
		2.0, 6.5,
		'Inmediato: seguridad y servicios extraordinarios',
		'Si falla: refuerzo estatal adicional, mando de crisis, publicación de la brecha de servicio y plan de recuperación con fecha.',
		'No se atribuirá colectivamente a los migrantes cualquier delito cometido en la ciudad. Tampoco se ocultarán incidentes reales para proteger una narrativa política.',
		array['Restablecimiento de servicios.','Delitos e incidentes comparables con periodos previos.','Tiempos de respuesta policial y sanitaria.','Daños acreditados y ayudas pagadas.','Agresiones y delitos de odio.','Exactitud y puntualidad del panel.','Quejas resueltas.','Percepción de seguridad medida con metodología pública.'],
		8
	);

	-- -------------------------------------------------------------------
	-- 4. Cinco compromisos públicos
	-- -------------------------------------------------------------------
	insert into public.topic_commitments (topic_id, title, description, sort_order) values
	(v_topic_id, 'Prevenir y salvar vidas',
		'La primera respuesta será anticipar la llegada, impedir cruces peligrosos dentro de la ley y rescatar a quien se encuentre en riesgo. Ningún objetivo de control justificará abandonar una obligación de salvamento.', 1),
	(v_topic_id, 'Registro individual de todas las nuevas llegadas localizadas',
		'Toda persona interceptada o localizada con base legal será identificada, reseñada y sometida al triaje correspondiente. El indicador se calculará sobre las personas efectivamente interceptadas o localizadas, no sobre una estimación imposible de verificar.', 2),
	(v_topic_id, 'Una ruta decidida antes de que venza la custodia policial',
		'Antes de las 72 horas, cada expediente deberá estar ejecutado, suspendido por una causa legal, derivado al procedimiento correspondiente o presentado al juez con una petición motivada. No se ocultarán los casos que incumplan el plazo.', 3),
	(v_topic_id, 'El sistema no dependerá de una única firma',
		'Existirá una cadena publicada de autoridades habilitadas, servicio de guardia permanente, suplencias y escalado automático. Cada decisión seguirá siendo individual, motivada y revisable.', 4),
	(v_topic_id, 'Ceuta protegida y cuentas públicas',
		'El Estado reforzará la seguridad, los servicios y la recuperación económica de la ciudad. Publicará datos sobre llegadas, expedientes, salidas, capacidad, costes, incidentes y posibles vulneraciones, sin exponer datos personales.', 5);

	-- -------------------------------------------------------------------
	-- 5. Calendario general — cinco fases (renderiza con el componente
	--    genérico CalendarioVisual.svelte, rama de lista simple, igual que
	--    hoy con Sanidad)
	-- -------------------------------------------------------------------
	insert into public.topic_timeline_phases (topic_id, title, description, items, sort_order) values
	(v_topic_id, 'Fase 0 · Primeras 72 horas — Activar el sistema',
		'Mando único, refuerzo de costa y rescate, apertura de capacidad de triaje, servicio administrativo, jurídico, sanitario y de interpretación 24/7, expediente y reloj individual, enlace continuo con Marruecos, y devolución, derivación o remisión judicial antes del límite.',
		array['Mando único','Refuerzo de costa y rescate','Apertura de capacidad de triaje','Servicio administrativo, jurídico, sanitario y de interpretación 24/7','Expediente y reloj individual','Enlace continuo con Marruecos','Devolución, derivación o remisión judicial antes del límite'],
		1),
	(v_topic_id, 'Fase 1 · Primeros 30 días — Ordenar lo excepcional',
		'Balance completo de la crisis, delegación y suplencias publicadas, protocolo de la Unidad Fronteriza, panel público, auditoría de CATE, CETI, transporte y plazas de CIE disponibles, informe jurídico y marítimo de las nuevas barreras, convenio de refuerzo con abogados e intérpretes, y plan de recuperación de servicios y comercios.',
		array['Balance completo de la crisis','Delegación y suplencias publicadas','Protocolo de la Unidad Fronteriza','Panel público','Auditoría de CATE, CETI, transporte y plazas de CIE disponibles','Informe jurídico y marítimo de las nuevas barreras','Convenio de refuerzo con abogados e intérpretes','Plan de recuperación de servicios y comercios'],
		2),
	(v_topic_id, 'Fase 2 · Días 31 a 90 — Poner a prueba el sistema',
		'Simulacro de saturación, estudio del CIE permanente, dimensionamiento de plantilla, protocolo bilateral de readmisión y transporte, capacidad estable de procedimiento fronterizo, refuerzo judicial y fiscal evaluado, y memoria económica inicial.',
		array['Simulacro de saturación','Estudio del CIE permanente','Dimensionamiento de plantilla','Protocolo bilateral de readmisión y transporte','Capacidad estable de procedimiento fronterizo','Refuerzo judicial y fiscal evaluado','Memoria económica inicial'],
		3),
	(v_topic_id, 'Fase 3 · Meses 4 a 18 — Consolidar y decidir',
		'Consolidación de personal y turnos, acuerdos consulares, evaluación de una reforma competencial, terreno, proyecto, financiación y licitación del CIE si supera los controles previos, y evaluación semestral del sistema.',
		array['Consolidación de personal y turnos','Acuerdos consulares','Evaluación de una reforma competencial','Terreno, proyecto, financiación y licitación del CIE si supera los controles previos','Evaluación semestral del sistema'],
		4),
	(v_topic_id, 'Fase 4 · Meses 18 a 60 — Construir, si procede',
		'Construcción y dotación del CIE permanente si fue aprobado, contratación y formación previa a apertura, designación judicial de control, inspección de instalaciones, prueba operativa sin internos, y apertura por módulos y evaluación temprana.',
		array['Construcción y dotación del CIE permanente si fue aprobado','Contratación y formación previa a apertura','Designación judicial de control','Inspección de instalaciones','Prueba operativa sin internos','Apertura por módulos y evaluación temprana'],
		5);

	-- -------------------------------------------------------------------
	-- 6. Dieciséis riesgos (renderiza con RiesgosComprobacion.svelte /
	--    RiskMap.svelte genéricos, con filtro por categoría)
	-- -------------------------------------------------------------------
	insert into public.topic_risks (topic_id, title, description, signals, mitigation, decision_trigger, category, sort_order) values
	(v_topic_id, 'Nueva llegada superior a la capacidad', 'El sistema recibe más entradas de las que puede procesar en el plazo previsto.', 'Aumento coordinado de intentos y saturación por hora.', 'Niveles de alerta, simulacros y reserva de personal.', 'Mando de emergencia, refuerzo nacional y europeo, capacidad temporal legal y revisión posterior.', 'Saturación', 1),
	(v_topic_id, 'Marruecos deja de cooperar', 'El país vecino reduce o suspende la aceptación de readmisiones.', 'Solicitudes sin respuesta o cierre de puntos de entrega.', 'Protocolo bilateral y Comité Mixto activo.', 'Escalado diplomático y europeo, consulados de origen y rutas alternativas; nunca internamiento indefinido.', 'Cooperación con Marruecos', 2),
	(v_topic_id, 'La barrera marítima resulta insegura o jurídicamente insuficiente', 'El elemento de contención falla en la práctica o su encaje legal es cuestionado.', 'Lesiones, rescates repetidos o resoluciones anuladas.', 'Informe jurídico, ingeniería y supervisión.', 'Modificar o retirar el elemento, reforzar medios móviles y usar devolución individual.', 'Legalidad', 3),
	(v_topic_id, 'Una autoridad no firma o bloquea expedientes', 'La ausencia de un responsable disponible paraliza decisiones.', 'Colas sin decisión y alertas de 36-60 horas.', 'Delegación múltiple y suplencias predeterminadas.', 'Reasignación, avocación motivada, revisión disciplinaria y rendición política de cuentas.', 'Personal', 4),
	(v_topic_id, 'Faltan abogados o intérpretes', 'La falta de asistencia jurídica o de interpretación retrasa las entrevistas.', 'Entrevistas aplazadas.', 'Bolsas de guardia y contratación de reserva.', 'Interpretación remota segura y equipos desplazados; no se omite la garantía.', 'Personal', 5),
	(v_topic_id, 'Saturación judicial', 'Los juzgados no dan abasto para resolver las peticiones de internamiento a tiempo.', 'Audiencias pendientes cerca de las 72 horas.', 'Guardias, refuerzo y expediente digital completo.', 'Plazas y equipos temporales; libertad o alternativa si no hay autorización dentro de plazo.', 'Capacidad judicial', 6),
	(v_topic_id, 'No hay plaza de CIE', 'Un internamiento autorizado judicialmente no puede ejecutarse por falta de espacio.', 'Peticiones autorizables sin instalación disponible.', 'Reserva y traslado a la red existente.', 'Capacidad provisional conforme a ley; nunca usar el CETI como CIE encubierto.', 'Saturación', 7),
	(v_topic_id, 'Error de identidad o edad', 'Se determina incorrectamente la identidad, nacionalidad o minoría de edad de una persona.', 'Documentos contradictorios o recursos estimados.', 'Segunda revisión y especialistas.', 'Suspender ejecución, corregir expediente, proteger provisionalmente y auditar la causa.', 'Derechos', 8),
	(v_topic_id, 'Custodia superior al plazo', 'Una persona permanece detenida más allá de las 72 horas sin una salida legal.', 'Expedientes sin estado final a las 60 horas.', 'Reloj visible y escalado interno.', 'Puesta a disposición judicial o fin de la custodia; investigación del incumplimiento.', 'Derechos', 9),
	(v_topic_id, 'Perfilado racial o controles indiscriminados', 'Se identifica a personas por su apariencia, idioma o nacionalidad presumida, no por indicios objetivos.', 'Identificaciones concentradas sin motivo objetivo.', 'Formación, registro de causa y supervisión.', 'Anulación de prácticas, investigación, reparación y publicación agregada.', 'Derechos', 10),
	(v_topic_id, 'Violencia o patrullas vecinales', 'Grupos no autorizados sustituyen ilegalmente a la Policía o agreden a personas migrantes.', 'Grupos organizados, amenazas o agresiones.', 'Presencia policial e información.', 'Intervención profesional, investigación penal y protección de víctimas.', 'Seguridad', 11),
	(v_topic_id, 'Filtración o abuso de datos biométricos', 'Datos sensibles de identificación se acceden o difunden indebidamente.', 'Accesos anómalos.', 'Mínimos datos, roles, cifrado y registro.', 'Bloqueo, notificación, investigación y revisión de permisos.', 'Privacidad', 12),
	(v_topic_id, 'Coste y retraso del CIE', 'La obra del CIE se desvía de plazo o presupuesto.', 'Desviación de obra o hitos incumplidos.', 'Proyecto por fases y control externo.', 'Revisión de alcance, responsabilidades y contingencia operativa sin rebajar derechos.', 'Desviaciones económicas', 13),
	(v_topic_id, 'El CIE no aumenta los retornos', 'El internamiento no se traduce en más devoluciones ejecutadas.', 'Muchas liberaciones sin ejecución.', 'Analizar antes la perspectiva real de retorno.', 'Centrar recursos en documentación, consulados y acuerdos; no ampliar plazas por inercia.', 'Desviaciones económicas', 14),
	(v_topic_id, 'La ruta se desplaza a Melilla u otra costa', 'El refuerzo en Ceuta traslada la presión migratoria a otro punto sin resolver el problema.', 'Descenso en Ceuta y repunte vecino.', 'Coordinación nacional.', 'Redistribuir medios sin desproteger Ceuta y revisar efectos secundarios.', 'Desplazamiento de rutas', 15),
	(v_topic_id, 'Desinformación y redes de tráfico', 'Bulos o campañas organizadas incentivan cruces peligrosos o alarma social.', 'Mensajes virales y captación.', 'Inteligencia legal y comunicación preventiva.', 'Desmontaje rápido de bulos, investigación de redes y aviso en idiomas relevantes.', 'Seguridad', 16);

	-- -------------------------------------------------------------------
	-- 7. Fuentes oficiales (corte de información: 14 de agosto de 2026)
	-- -------------------------------------------------------------------
	insert into public.topic_sources (topic_id, label, url, note, sort_order) values
	(v_topic_id, 'Ministerio del Interior — balance del 4 de agosto de 2026', 'https://www.interior.gob.es/opencms/es/detalle/articulo/Grande-Marlaska-agradece-el-reconocimiento-y-el-apoyo-de-sus-homologos-europeos-a-la-respuesta-de-Espana-ante-la-crisis-de-Ceuta/', 'Crisis y respuesta institucional', 1),
	(v_topic_id, 'Ministerio del Interior — barrera neumática y respuesta del 1 de agosto', 'https://www.interior.gob.es/opencms/es/detalle/articulo/Interior-instala-una-barrera-neumatica-en-el-espigon-que-separa-Ceuta-de-Marruecos/', 'Crisis y respuesta institucional', 2),
	(v_topic_id, 'Ministerio del Interior — comunicado del 30 de julio', 'https://www.interior.gob.es/opencms/es/detalle/articulo/Comunicado-sobre-la-situacion-en-la-ciudad-autonoma-de-Ceuta/', 'Crisis y respuesta institucional', 3),
	(v_topic_id, 'Presidencia del Gobierno — comparecencia en Ceuta, 31 de julio de 2026', 'https://www.lamoncloa.gob.es/presidente/intervenciones/Documents/2026/20260731-transcripcion-comparecencia-pg-visita-ceuta.pdf', 'Crisis y respuesta institucional', 4),
	(v_topic_id, 'Tribunal Supremo — nota sobre las llegadas a nado, 8 de julio de 2026', 'https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Noticias-Judiciales/El-Tribunal-Supremo-confirma-que-la-ley-no-permite-las--devoluciones-en-caliente--de-los-migrantes-que-pretenden-entrar-a-nado-en-Ceuta-y-Melilla', 'Rechazo en frontera, devolución e identificación', 5),
	(v_topic_id, 'Ley Orgánica 4/2000 de Extranjería — texto consolidado', 'https://www.boe.es/buscar/act.php?id=BOE-A-2000-544', 'Rechazo en frontera, devolución e identificación', 6),
	(v_topic_id, 'Reglamento de Extranjería — Real Decreto 1155/2024, artículo 23', 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099', 'Rechazo en frontera, devolución e identificación', 7),
	(v_topic_id, 'Tribunal Constitucional — Sentencia 172/2020', 'https://hj.tribunalconstitucional.es/HJ/es/Resolucion/Show/26498', 'Rechazo en frontera, devolución e identificación', 8),
	(v_topic_id, 'Ley Orgánica 4/2015 de Seguridad Ciudadana — artículo 16', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-3442', 'Rechazo en frontera, devolución e identificación', 9),
	(v_topic_id, 'Reglamento (UE) 2024/1356 de triaje', 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2024-80745', 'Asilo y triaje europeo', 10),
	(v_topic_id, 'Instrucción de Interior de 11 de junio de 2026 sobre procedimientos de protección', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-12855', 'Asilo y triaje europeo', 11),
	(v_topic_id, 'Reglamento (UE) 2024/1348 sobre procedimiento común de protección internacional', 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32024R1348', 'Asilo y triaje europeo', 12),
	(v_topic_id, 'Reglamento (UE) 2024/1349 sobre retorno fronterizo', 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32024R1349', 'Asilo y triaje europeo', 13),
	(v_topic_id, 'Reglamento de los CIE — Real Decreto 162/2014', 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-2749', 'CIE, cooperación y competencias', 14),
	(v_topic_id, 'Orden INT/63/2026 de creación del nuevo CIE de Algeciras', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2827', 'CIE, cooperación y competencias', 15),
	(v_topic_id, 'Consejo de Ministros — presupuesto base de la obra del CIE de Algeciras', 'https://www.lamoncloa.gob.es/consejodeministros/referencias/paginas/2020/refc20201110.aspx', 'CIE, cooperación y competencias', 16),
	(v_topic_id, 'Acuerdo España-Marruecos de readmisión de 1992', 'https://www.boe.es/buscar/doc.php?id=BOE-A-1992-8976', 'CIE, cooperación y competencias', 17),
	(v_topic_id, 'Delegación de competencias de devolución en comisarías de A Coruña, 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-5120', 'CIE, cooperación y competencias', 18),
	(v_topic_id, 'Ley Orgánica 2/1986 de Fuerzas y Cuerpos de Seguridad', 'https://www.boe.es/buscar/act.php?id=BOE-A-1986-6859', 'CIE, cooperación y competencias', 19),
	(v_topic_id, 'Ley Orgánica 5/2005 de Defensa Nacional', 'https://www.boe.es/buscar/act.php?id=BOE-A-2005-18933', 'CIE, cooperación y competencias', 20),
	(v_topic_id, 'Ley Orgánica 6/1985 del Poder Judicial', 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-12666', 'CIE, cooperación y competencias', 21),
	(v_topic_id, 'INE — IPC general, última información disponible a julio de 2026', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802&idp=1254735976607&menu=ultiDatos', 'Economía, personal e infraestructuras', 22),
	(v_topic_id, 'Ministerio del Interior — operación cofinanciada de El Tarajal', 'https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/fondos-de-la-union-europea/marco-financiero-2021-2027/organismos-beneficiarios/s.g.-de-planificacion-y-gestion-de-infraestructuras-y-medios-para-la-seguridad', 'Economía, personal e infraestructuras', 23),
	(v_topic_id, 'Ministerio del Interior — Programa Nacional IGFV 2021-2027', 'https://www.interior.gob.es/opencms/pdf/servicios-al-ciudadano/fondos-de-la-union-europea/Marco-Financiero-2021-2027/Programa-Nacional-IGFV-v1.1.pdf', 'Economía, personal e infraestructuras', 24),
	(v_topic_id, 'Reglamento (UE) 2021/1147 — FAMI', 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2021-80971', 'Economía, personal e infraestructuras', 25),
	(v_topic_id, 'Reglamento (UE) 2021/1148 — IGFV', 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2021-80972', 'Economía, personal e infraestructuras', 26),
	(v_topic_id, 'Ministerio de Inclusión — planificación económica de acogida y atención humanitaria 2023-2024', 'https://sede.inclusion.gob.es/documents/387478/1684654/Modificaci%C3%B3n%2B29_9%2BResoluci%C3%B3n%2Bplanificaci%C3%B3n%2BAC%2BAH.pdf/1979b2be-2486-68fc-fd7f-03e598e071d6?t=1698998315149', 'Economía, personal e infraestructuras', 27),
	(v_topic_id, 'Ministerio del Interior — avance del Plan Estratégico de Subvenciones 2024-2026, abril de 2026', 'https://www.interior.gob.es/opencms/pdf/servicios-al-ciudadano/ayudas-y-subvenciones/Informe_avance_PES_2024_2026_abril_2026.pdf', 'Economía, personal e infraestructuras', 28),
	(v_topic_id, 'Consejo de Ministros — adquisición de ocho patrulleras de Vigilancia Aduanera', 'https://www.lamoncloa.gob.es/consejodeministros/referencias/paginas/2022/refc20220711_cc.aspx', 'Economía, personal e infraestructuras', 29),
	(v_topic_id, 'Ministerio del Interior — evaluación intermedia del FAMI', 'https://www.interior.gob.es/opencms/pdf/servicios-al-ciudadano/Fondo-de-Asilo-Migracion-e-Integracion/Informe-de-evaluacion-intermedia-del-FAMI.pdf', 'Economía, personal e infraestructuras', 30),
	(v_topic_id, 'BOE — Real Decreto-ley 14/2025 sobre retribuciones públicas de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-24445', 'Economía, personal e infraestructuras', 31),
	(v_topic_id, 'Ministerio de Hacienda — costes y retribuciones del personal público', 'https://www.hacienda.gob.es/es-ES/CDI/Paginas/CostePersonalPensiones/CostePersonalPensiones.aspx', 'Economía, personal e infraestructuras', 32),
	(v_topic_id, 'BOE — Real Decreto 950/2005 sobre retribuciones de las Fuerzas y Cuerpos de Seguridad del Estado', 'https://www.boe.es/buscar/doc.php?id=BOE-A-2005-13122', 'Economía, personal e infraestructuras', 33);

	-- -------------------------------------------------------------------
	-- 8. Datos destacados (dato contrastado)
	-- -------------------------------------------------------------------
	insert into public.topic_data_points (topic_id, label, value, explanation, time_scope, sort_order) values
	(v_topic_id, 'Entradas irregulares registradas en Ceuta', '72.000', 'Cifra dada por el Ministerio del Interior. No desglosa todavía cuántas personas regresaron voluntariamente, fueron readmitidas, solicitaron asilo, eran menores o permanecen en Ceuta.', '30 de julio de 2026', 1),
	(v_topic_id, 'Personas que ya habían salido de Ceuta', '+70.000', 'Según el balance oficial del Ministerio del Interior. CONVOCA no presenta esta cifra como equivalente a expulsiones forzosas: incluye salidas voluntarias, readmisiones y otros procedimientos sin desglosar.', '4 de agosto de 2026', 2),
	(v_topic_id, 'Plazo legal máximo antes de una salida obligatoria', '72 horas', 'Límite que obliga a que cada expediente llegue a una salida legal: devolución ejecutada, salida voluntaria informada, asilo activado, protección de menores, petición judicial de internamiento o libertad.', 'Vigente', 3),
	(v_topic_id, 'Capacidad del CIE en el escenario Central', '250 plazas, ampliables a 400', 'Hipótesis de planificación económica, no una decisión aprobada. La capacidad jurídica final se decidirá según internamientos simultáneos autorizables y perspectiva real de retorno.', 'Escenario Central del modelo económico 0.1', 4);

	-- -------------------------------------------------------------------
	-- 9. Versión y ronda de participación
	-- -------------------------------------------------------------------
	insert into public.topic_versions (topic_id, version_label, note, published_at) values
	(v_topic_id, '0.1', 'Borrador 0.1, abierto a revisión jurídica, técnica, operativa y ciudadana. Corte de información: 14 de agosto de 2026.', '2026-08-14T00:00:00Z');

	insert into public.participation_rounds (topic_id, version_label, status, opens_at) values
	(v_topic_id, '0.1', 'open', '2026-08-14T00:00:00Z')
	returning id into v_round_id;
end $$;
