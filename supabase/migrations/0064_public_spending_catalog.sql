-- 20260822180000_public_spending_catalog.sql
--
-- Catálogo editorial público de investigaciones sobre gasto. Hasta esta
-- migración, las siete fichas vivían incrustadas en el frontend. Supabase
-- pasa a ser la fuente de verdad: contenido, desglose, trazabilidad y fuentes.
-- Las pistas ciudadanas privadas siguen aisladas en public_spending_submissions.

begin;

create table public.public_spending_investigations (
	slug text primary key,
	title text not null,
	short_title text not null,
	eyebrow text not null,
	stage text not null check (stage in ('planificado', 'regulado', 'concedido', 'adjudicado')),
	amount numeric(18, 2) not null check (amount >= 0),
	amount_approximate boolean not null default false,
	amount_qualifier text not null,
	period text not null,
	published_on date not null,
	reviewed_on date not null,
	category text not null,
	territory text not null,
	manager text not null,
	recipient text not null,
	summary text not null,
	why_it_matters text not null,
	evidence_note text not null,
	featured_metric text not null,
	featured_label text not null,
	breakdown_title text not null,
	breakdown_note text not null,
	breakdown_coverage text not null check (breakdown_coverage in ('complete', 'selected')),
	known_facts text[] not null default array[]::text[],
	unknown_facts text[] not null default array[]::text[],
	accent text not null check (accent ~ '^#[0-9A-Fa-f]{6}$'),
	detail_variant text not null default 'standard' check (detail_variant in ('standard', 'asylum_wall')),
	verification_status text,
	detail_description text,
	disclaimer text,
	publication_status text not null default 'draft' check (publication_status in ('draft', 'published', 'archived')),
	sort_order smallint not null check (sort_order > 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint public_spending_investigations_slug_format check (
		slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
	),
	constraint public_spending_investigations_dates_order check (reviewed_on >= published_on),
	constraint public_spending_investigations_special_detail check (
		(detail_variant = 'standard' and verification_status is null and detail_description is null and disclaimer is null)
		or (detail_variant = 'asylum_wall' and verification_status is not null and detail_description is not null and disclaimer is not null)
	),
	constraint public_spending_investigations_published_fields check (
		publication_status <> 'published' or cardinality(known_facts) > 0
	)
);

create table public.public_spending_breakdown_items (
	investigation_slug text not null references public.public_spending_investigations (slug) on update cascade on delete cascade,
	item_id text not null,
	label text not null,
	short_label text,
	amount numeric(18, 2) not null check (amount >= 0),
	detail text not null,
	place text,
	rate numeric(12, 2) check (rate is null or rate >= 0),
	unit text,
	capacity text,
	description text,
	fill text check (fill is null or fill ~ '^#[0-9A-Fa-f]{6}$'),
	text_color text check (text_color is null or text_color ~ '^#[0-9A-Fa-f]{6}$'),
	rect_x numeric(8, 3),
	rect_y numeric(8, 3),
	rect_width numeric(8, 3),
	rect_height numeric(8, 3),
	compact boolean not null default false,
	sort_order smallint not null check (sort_order > 0),
	created_at timestamptz not null default now(),
	primary key (investigation_slug, item_id),
	unique (investigation_slug, sort_order),
	constraint public_spending_breakdown_item_id_format check (
		item_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
	),
	constraint public_spending_breakdown_rect_complete check (
		(rect_x is null and rect_y is null and rect_width is null and rect_height is null)
		or (rect_x is not null and rect_y is not null and rect_width > 0 and rect_height > 0)
	),
	constraint public_spending_breakdown_rect_bounds check (
		(rect_x is null and rect_y is null)
		or (rect_x >= 0 and rect_y >= 0 and rect_x + rect_width <= 100.001 and rect_y + rect_height <= 100.001)
	)
);

create table public.public_spending_sources (
	investigation_slug text not null references public.public_spending_investigations (slug) on update cascade on delete cascade,
	source_id text not null,
	source_kind text not null check (source_kind in ('primary', 'publication_analyzed')),
	organization text not null,
	title text not null,
	source_date_label text not null,
	url text not null check (url ~* '^https://[^[:space:]]+$'),
	what_it_proves text,
	claim_summary text,
	editorial_use text,
	sort_order smallint not null check (sort_order > 0),
	created_at timestamptz not null default now(),
	primary key (investigation_slug, source_id),
	unique (investigation_slug, sort_order),
	constraint public_spending_sources_id_format check (
		source_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
	),
	constraint public_spending_sources_kind_fields check (
		(source_kind = 'primary' and what_it_proves is not null and claim_summary is null and editorial_use is null)
		or (source_kind = 'publication_analyzed' and what_it_proves is null and claim_summary is not null and editorial_use is not null)
	)
);

create table public.public_spending_trace_steps (
	investigation_slug text not null references public.public_spending_investigations (slug) on update cascade on delete cascade,
	sort_order smallint not null check (sort_order > 0),
	label text not null,
	detail text not null,
	state text not null check (state in ('verified', 'current', 'pending')),
	created_at timestamptz not null default now(),
	primary key (investigation_slug, sort_order)
);

comment on table public.public_spending_investigations is
	'Fichas editoriales publicables del muro de gasto público. Supabase es la fuente de verdad; solo las filas con publication_status=published se exponen públicamente.';
comment on table public.public_spending_breakdown_items is
	'Desglose económico ordenado de cada ficha. Los campos de geometría son opcionales y describen el muro proporcional del caso de acogida.';
comment on table public.public_spending_sources is
	'Fuentes primarias y publicaciones analizadas, separadas explícitamente para no presentar una pieza periodística como prueba oficial del gasto.';
comment on table public.public_spending_trace_steps is
	'Estado ordenado del recorrido del dinero: planificación, concesión, ejecución, pago y justificación según cada caso.';
comment on column public.public_spending_sources.source_kind is
	'primary acredita datos del expediente; publication_analyzed documenta el origen de una afirmación sometida a contraste.';

create unique index public_spending_investigations_sort_order_idx
	on public.public_spending_investigations (sort_order);
create index public_spending_investigations_public_list_idx
	on public.public_spending_investigations (publication_status, sort_order)
	include (slug, reviewed_on);

create trigger public_spending_investigations_set_updated_at
	before update on public.public_spending_investigations
	for each row execute function public.set_updated_at();

alter table public.public_spending_investigations enable row level security;
alter table public.public_spending_breakdown_items enable row level security;
alter table public.public_spending_sources enable row level security;
alter table public.public_spending_trace_steps enable row level security;

-- Las tablas nuevas no se exponen automáticamente en la Data API. Se da
-- SELECT explícito y RLS limita la lectura a fichas publicadas. No hay
-- permisos de escritura para clientes: las revisiones editoriales se aplican
-- mediante migraciones versionadas.
revoke all on public.public_spending_investigations from public, anon, authenticated;
revoke all on public.public_spending_breakdown_items from public, anon, authenticated;
revoke all on public.public_spending_sources from public, anon, authenticated;
revoke all on public.public_spending_trace_steps from public, anon, authenticated;

grant select on public.public_spending_investigations to anon, authenticated;
grant select on public.public_spending_breakdown_items to anon, authenticated;
grant select on public.public_spending_sources to anon, authenticated;
grant select on public.public_spending_trace_steps to anon, authenticated;

create policy "public_spending_investigations_select_published"
	on public.public_spending_investigations for select
	to anon, authenticated
	using (publication_status = 'published');

create policy "public_spending_breakdown_select_published_parent"
	on public.public_spending_breakdown_items for select
	to anon, authenticated
	using (
		exists (
			select 1
			from public.public_spending_investigations investigation
			where investigation.slug = public_spending_breakdown_items.investigation_slug
				and investigation.publication_status = 'published'
		)
	);

create policy "public_spending_sources_select_published_parent"
	on public.public_spending_sources for select
	to anon, authenticated
	using (
		exists (
			select 1
			from public.public_spending_investigations investigation
			where investigation.slug = public_spending_sources.investigation_slug
				and investigation.publication_status = 'published'
		)
	);

create policy "public_spending_trace_select_published_parent"
	on public.public_spending_trace_steps for select
	to anon, authenticated
	using (
		exists (
			select 1
			from public.public_spending_investigations investigation
			where investigation.slug = public_spending_trace_steps.investigation_slug
				and investigation.publication_status = 'published'
		)
	);

insert into public.public_spending_investigations (
	slug, title, short_title, eyebrow, stage, amount, amount_approximate,
	amount_qualifier, period, published_on, reviewed_on, category, territory,
	manager, recipient, summary, why_it_matters, evidence_note, featured_metric,
	featured_label, breakdown_title, breakdown_note, breakdown_coverage,
	known_facts, unknown_facts, accent, detail_variant, verification_status,
	detail_description, disclaimer, publication_status, sort_order
)
values
(
		'acogida-proteccion-internacional-2026-2027', 'Sistema de acogida de protección internacional', 'Acogida y protección internacional',
		'Una cifra viral, abierta hasta la unidad de cálculo', 'planificado', 670458917,
		false, 'necesidad planificada para doce meses',
		'Julio de 2026 — junio de 2027', '2026-06-19'::date,
		'2026-08-22'::date, 'Política social',
		'España · reparto territorial aún no publicado', 'Secretaría de Estado de Migraciones', 'Entidades de acción concertada; asignaciones concretas posteriores',
		'La resolución cuantifica plazas, personas y precios de referencia. Los 150 € corresponden únicamente a 55 plazas de vulnerabilidad reforzada por día, no a un pago personal generalizado.', 'Permite separar una tarifa técnica del dinero efectivamente recibido y localizar qué parte del recorrido todavía no es pública.', 'La cifra global es planificación estructural. No acredita por sí sola adjudicaciones, pagos ni gasto finalmente justificado.',
		'55 plazas', 'usan la tarifa de 150 €/día',
		'Planificación por fase y tarifa', 'Desglose completo: las siete partidas reconcilian exactamente con el total.',
		'complete', array['Importe, periodo, plazas o personas y precios de referencia por modalidad.', 'La tarifa de 150 € solo se aplica a vulnerabilidad reforzada.', 'El precio sirve para anticipos y como techo de retribución de la entidad.']::text[],
		array['Entidades finalmente asignadas a cada lote o necesidad.', 'Municipios, centros e importe territorializado.', 'Pagos efectivos y costes que terminen siendo justificados.']::text[], '#176056',
		'asylum_wall',
		'Planificación verificada', 'Necesidades estructurales planificadas para la gestión indirecta del sistema de acogida mediante acción concertada.',
		'La cifra total es una planificación de necesidades. No equivale por sí sola a dinero ya pagado o finalmente justificado.', 'published', 1
	),
(
		'renoinn-2-renovables-innovadoras-2026', 'RENOINN 2: renovables innovadoras y almacenamiento', 'RENOINN 2',
		'Resolución definitiva con 524 proyectos identificables', 'concedido', 433440381.54,
		false, 'ayuda concedida definitivamente',
		'Convocatoria resuelta en agosto de 2026', '2026-08-07'::date,
		'2026-08-22'::date, 'Energía y transición ecológica',
		'Proyectos distribuidos por España', 'Instituto para la Diversificación y Ahorro de la Energía (IDAE)', '524 proyectos; el anexo identifica beneficiario, municipio e importe',
		'La resolución definitiva concede 433,44 millones a proyectos de agrivoltaica, fotovoltaica flotante, integración en infraestructuras, autoconsumo colectivo y bombas de calor renovables.', 'Es un buen ejemplo de dinero ya concedido con una lista nominal completa, pero todavía sujeto a ejecución, hitos y justificación.', 'Concedido no significa pagado ni obra terminada. La resolución fija obligaciones de ejecución y control posteriores.',
		'524 proyectos', 'con beneficiario y municipio en el anexo',
		'Ayuda concedida por programa', 'Desglose completo y reconciliado con la resolución definitiva.',
		'complete', array['Beneficiario, proyecto, municipio e importe individual en la resolución definitiva.', '1.225,66 MW de potencia y 2.320,72 MWh de almacenamiento asociados.', 'Inversión total movilizada declarada de 1.186,19 millones de euros.']::text[],
		array['Cuánto se ha abonado efectivamente a cada proyecto a fecha de revisión.', 'Qué proyectos completarán todos los hitos sin reducción o reintegro.', 'Resultado final de las obligaciones de seguimiento y justificación.']::text[], '#238575',
		'standard',
		null, null,
		null, 'published', 2
	),
(
		'hidrogeno-renovable-auctions-as-a-service-2026', 'Hidrógeno renovable: Auctions-as-a-Service', 'Hidrógeno renovable',
		'Cuatro proyectos y un pago condicionado a producir', 'concedido', 274298434,
		false, 'ayuda máxima concedida',
		'Hasta diez años desde la entrada en operación', '2026-08-06'::date,
		'2026-08-22'::date, 'Energía e industria',
		'A Coruña, Albacete, Ciudad Real y Zaragoza', 'IDAE · Ministerio para la Transición Ecológica', 'Cuatro proyectos empresariales nominados en resoluciones definitivas',
		'Los 274,30 millones son el máximo concedido a cuatro plantas. La ayuda se devenga por kilogramo de hidrógeno renovable certificado y se liquida semestralmente durante sus primeros diez años.', 'El titular parece una transferencia inmediata, pero el mecanismo vincula el pago futuro a producción real certificada.', 'La suma es una ayuda máxima. El pago efectivo dependerá de producción, certificación y cumplimiento durante la operación.',
		'4 proyectos', 'con beneficiario, municipio e importe exactos',
		'Ayuda máxima por proyecto', 'Desglose completo de las cuatro resoluciones definitivas.',
		'complete', array['Nombre del proyecto, sociedad beneficiaria, municipio, potencia e importe máximo.', 'El pago se calcula por kilogramos certificados y se realiza semestralmente.', 'La ayuda puede extenderse durante los diez primeros años de operación.']::text[],
		array['Producción certificada que alcanzará finalmente cada planta.', 'Importe semestral efectivamente abonado a cada beneficiario.', 'Posibles reducciones si no se cumplen los hitos o el calendario.']::text[], '#2f6f8f',
		'standard',
		null, null,
		null, 'published', 3
	),
(
		'variante-jaca-a21-a23-2026', 'Variante de Jaca y conexión de las autovías A-21 y A-23', 'Variante de Jaca',
		'Contrato adjudicado con empresa, competencia y plazo', 'adjudicado', 135300000,
		true, 'adjudicación con IVA, cifra oficial redondeada',
		'Plazo de obra: 54 meses', '2026-08-07'::date,
		'2026-08-22'::date, 'Infraestructuras',
		'Jaca (Huesca)', 'Ministerio de Transportes y Movilidad Sostenible', 'UTE Sacyr Construcción–Papsa Infraestructuras',
		'La obra está adjudicada por 111.827.525,49 € sin IVA —135,3 millones con IVA en la comunicación oficial— tras recibir 15 ofertas. El plazo contractual es de 54 meses.', 'La Plataforma de Contratación permite pasar del anuncio político al expediente: adjudicatario, importe base, licitadores y duración.', 'Adjudicado no equivale a pagado ni terminado. Las certificaciones de obra y la liquidación determinarán el coste efectivo.',
		'15 ofertas', 'constan en la adjudicación',
		'Destino contractual identificado', 'La ficha contractual publica un adjudicatario y 111.827.525,49 € sin IVA. Los 135,3 M€ son la cifra oficial con IVA redondeada.',
		'complete', array['Adjudicatario, importe sin IVA, 15 licitadores y plazo de 54 meses.', 'La actuación incluye tres enlaces, tres viaductos y un falso túnel.', 'El valor estimado inicial era 139,63 millones de euros sin IVA.']::text[],
		array['Calendario real de certificaciones y pagos.', 'Modificados, revisiones de precios o incidencias durante la obra.', 'Coste liquidado y fecha efectiva de puesta en servicio.']::text[], '#c86c2d',
		'standard',
		null, null,
		null, 'published', 4
	),
(
		'subvenciones-sociales-directas-2026', 'Subvenciones directas para programas sociales y Agenda 2030', 'Subvenciones sociales directas',
		'Beneficiarios nominativos, pero concesión aún pendiente', 'regulado', 50578440,
		false, 'importe máximo nominado en el real decreto',
		'Programas ejecutables entre 2026 y 2027 según resolución', '2026-08-08'::date,
		'2026-08-22'::date, 'Derechos sociales',
		'España, Canarias, Ceuta y Melilla', 'Ministerio de Derechos Sociales, Consumo y Agenda 2030', 'Entidades y administraciones nominadas una a una en el artículo 3',
		'El real decreto nombra beneficiarios y cuantías que suman 50,58 millones. A la fecha de revisión aún debían presentar la solicitud y obtener resolución o convenio: no es una lista de pagos realizados.', 'Permite ver quién está previsto que reciba cada ayuda directa y, al mismo tiempo, marcar el paso administrativo que todavía falta.', 'Los destinatarios son nominativos, pero la norma exige solicitud antes del 15 de septiembre y una resolución o convenio posterior.',
		'30 M€', 'para lucha contra la pobreza en Canarias',
		'Importe máximo por gran bloque', 'Suma derivada y reconciliada desde todas las cuantías del artículo 3.',
		'complete', array['Beneficiarios e importes máximos individualizados por programa.', 'Plazo de solicitud y mecanismo posterior de resolución o convenio.', 'El pago será anticipado en una transferencia una vez concedida la ayuda.']::text[],
		array['Qué solicitudes serán finalmente resueltas y por qué importe definitivo.', 'Fecha del pago anticipado a cada beneficiario.', 'Gasto elegible finalmente ejecutado y justificado.']::text[], '#8067a8',
		'standard',
		null, null,
		null, 'published', 5
	),
(
		'empleo-reconstruccion-andalucia-extremadura-2026', 'Empleo municipal para reconstrucción en Andalucía y Extremadura', 'Empleo para reconstrucción',
		'696 municipios y un reparto máximo sujeto a solicitud', 'regulado', 50000000,
		false, 'presupuesto total del programa',
		'Contratos de 3 a 6 meses tras cada resolución', '2026-08-08'::date,
		'2026-08-22'::date, 'Empleo y reconstrucción',
		'543 municipios andaluces y 153 extremeños', 'Servicio Público de Empleo Estatal (SEPE)', 'Corporaciones locales incluidas en el anexo',
		'El programa reserva 50 millones para contratar personas desempleadas en tareas de reconstrucción. El anexo calcula máximos por municipio, pero cada ayuntamiento debe solicitar la subvención y recibir resolución.', 'El anexo permite territorializar la previsión hasta el municipio sin confundir ese máximo con una concesión ya pagada.', 'Los 10 M€ adicionales del anexo no se suman a los 50 M€: son un máximo redistribuible con los remanentes del mismo presupuesto.',
		'696 municipios', 'incluidos en el anexo territorial',
		'Asignación garantizada máxima por comunidad', 'El anexo suma 49.999.998 € por redondeo municipal; la fila total y el artículo presupuestario fijan 50 M€.',
		'complete', array['Los 696 municipios, su máximo garantizado y el máximo adicional potencial.', 'La fórmula: mínimo, población, desempleo y coste de daños.', 'Los contratos cubrirán salario y cotizaciones durante tres a seis meses.']::text[],
		array['Qué municipios solicitarán finalmente la ayuda.', 'Importe individual concedido tras redistribuir posibles remanentes.', 'Contratos formalizados, pagos y reconstrucción ejecutada.']::text[], '#b07a2a',
		'standard',
		null, null,
		null, 'published', 6
	),
(
		'renovacion-equipamiento-hosteleria-2026', 'Renovación de equipamiento en establecimientos de hostelería', 'Equipamiento de hostelería',
		'Programa aprobado sin beneficiarios finales todavía', 'regulado', 15000000,
		false, 'presupuesto máximo del programa',
		'1 M€ en 2026 y 14 M€ en 2027', '2026-08-08'::date,
		'2026-08-22'::date, 'Turismo y empresa',
		'España', 'Ministerio de Industria y Turismo', 'Establecimientos con CNAE 55 o 56 que resulten beneficiarios',
		'La norma crea un programa de 15 millones para sustituir equipamiento en hostelería. Cada establecimiento podrá recibir entre 5.000 y 11.000 €, pero todavía no existe una relación final de beneficiarios.', 'Es el estado más temprano del muro: conocemos presupuesto y reglas, no quién cobrará ni cuánto se ejecutará.', 'El pago se realizará después de justificar el gasto. El IVA no forma parte de la ayuda elegible.',
		'5.000–11.000 €', 'por establecimiento elegible',
		'Presupuesto por anualidad', 'Desglose completo del límite presupuestario publicado.',
		'complete', array['Presupuesto por anualidad y rango de ayuda por establecimiento.', 'Actividades elegibles de alojamiento y restauración (CNAE 55 y 56).', 'El pago queda condicionado a justificar previamente el gasto.']::text[],
		array['Número y nombre de establecimientos beneficiarios.', 'Reparto territorial e importe final por empresa.', 'Cuánto del presupuesto se pagará y quedará justificado.']::text[], '#4f7780',
		'standard',
		null, null,
		null, 'published', 7
	);

insert into public.public_spending_breakdown_items (
	investigation_slug, item_id, label, short_label, amount, detail, place, rate,
	unit, capacity, description, fill, text_color, rect_x, rect_y, rect_width,
	rect_height, compact, sort_order
)
values
(
			'acogida-proteccion-internacional-2026-2027', 'acogida-estandar-t1',
			'Acogida estándar · tarifa 1', 'Acogida estándar T1', 218420518,
			'10.493 plazas/día de julio a diciembre; 10.139 de enero a junio', null, 58, 'plaza y día',
			'10.493 plazas/día de julio a diciembre; 10.139 de enero a junio', 'Alojamiento y atención en la fase de acogida estándar, calculados con la tarifa 1.', '#176056',
			'#ffffff', 0, 0,
			32.577, 100, false,
			1
		),
(
			'acogida-proteccion-internacional-2026-2027', 'acogida-estandar-t2',
			'Acogida estándar · tarifa 2', 'Acogida estándar T2', 212426200,
			'12.037 plazas/día de julio a diciembre; 11.236 de enero a junio', null, 50, 'plaza y día',
			'12.037 plazas/día de julio a diciembre; 11.236 de enero a junio', 'Alojamiento y atención en la fase de acogida estándar, calculados con la tarifa 2.', '#279583',
			'#ffffff', 32.577, 0,
			31.683, 100, false,
			2
		),
(
			'acogida-proteccion-internacional-2026-2027', 'valoracion-t1',
			'Valoración inicial y derivación · tarifa 1', 'Valoración inicial T1', 161093350,
			'7.370 plazas/día de julio a diciembre; 8.690 de enero a junio', null, 55, 'plaza y día',
			'7.370 plazas/día de julio a diciembre; 8.690 de enero a junio', 'Primera valoración del perfil y las necesidades antes de derivar a un recurso adecuado.', '#43b29e',
			'#ffffff', 64.26, 0,
			35.74, 67.233, false,
			3
		),
(
			'acogida-proteccion-internacional-2026-2027', 'autonomia',
			'Fase de autonomía', 'Autonomía', 38824655,
			'2.875 personas/día; 2.873 en junio de 2027', null, 37, 'persona y día',
			'2.875 personas/día; 2.873 en junio de 2027', 'Actuaciones orientadas a la autonomía de las personas beneficiarias tras la fase de acogida.', '#e98a3f',
			'#2b2622', 64.26, 67.233,
			17.677, 32.767, true,
			4
		),
(
			'acogida-proteccion-internacional-2026-2027', 'valoracion-t2',
			'Valoración inicial y derivación · tarifa 2', 'Valoración inicial T2', 26275200,
			'2.800 plazas/día de julio a diciembre', null, 51, 'plaza y día',
			'2.800 plazas/día de julio a diciembre', 'Primera valoración y derivación con la tarifa 2 durante el segundo semestre de 2026.', '#f0ac68',
			'#2b2622', 81.937, 67.233,
			11.985, 32.767, true,
			5
		),
(
			'acogida-proteccion-internacional-2026-2027', 'acogida-vulnerable',
			'Acogida de personas vulnerables', 'Vulnerabilidad', 10407744,
			'450 plazas/día de julio a diciembre; 441 de enero a junio', null, 64, 'plaza y día',
			'450 plazas/día de julio a diciembre; 441 de enero a junio', 'Plazas de acogida previstas para personas con necesidades de atención por vulnerabilidad.', '#f6cea0',
			'#2b2622', 93.922, 67.233,
			4.742, 32.767, true,
			6
		),
(
			'acogida-proteccion-internacional-2026-2027', 'acogida-vulnerable-reforzada',
			'Acogida con vulnerabilidad reforzada', 'Reforzada', 3011250,
			'55 plazas/día durante los doce meses', null, 150, 'plaza y día',
			'55 plazas/día durante los doce meses', 'Plazas reservadas para necesidades de atención reforzada. Es el bloque al que corresponde la cifra de 150 €.', '#dc6c25',
			'#ffffff', 98.664, 67.233,
			1.336, 32.767, true,
			7
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'item-01',
			'Agrivoltaica con almacenamiento', null, 234029977.18,
			'118 proyectos.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'item-02',
			'Integración de renovables en infraestructuras', null, 65463421.26,
			'47 proyectos con almacenamiento.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			2
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'item-03',
			'Bombas de calor renovables', null, 51125682.6,
			'56 proyectos.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			3
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'item-04',
			'Autoconsumo colectivo y consumidores vulnerables', null, 45707794.14,
			'274 proyectos y unos 9.000 consumidores vulnerables previstos.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			4
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'item-05',
			'Fotovoltaica flotante con almacenamiento', null, 37113506.36,
			'29 proyectos.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			5
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'item-01',
			'ATLAS · Repsol Renewable and Circular Solutions', null, 133394887.5,
			'50 MW.', 'Arteixo (A Coruña)', null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'item-02',
			'QUIXOTGEN · Doña Urraca Energy', null, 50216284,
			'30 MW.', 'Villarrobledo (Albacete)', null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			2
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'item-03',
			'P-HYNET · Repsol Renewable and Circular Solutions', null, 49791750,
			'12,27 MW.', 'Puertollano (Ciudad Real)', null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			3
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'item-04',
			'ZARAGOZAH2V · Accionaplug', null, 40895512.5,
			'10 MW.', 'Zaragoza', null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			4
		),
(
			'variante-jaca-a21-a23-2026', 'item-01',
			'UTE Sacyr Construcción–Papsa Infraestructuras', null, 111827525.49,
			'Adjudicación sin IVA para 8,05 km de variante y conexión.', 'Jaca (Huesca)', null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'subvenciones-sociales-directas-2026', 'item-01',
			'Tercer sector, familias y programas sociales', null, 40017030,
			'Incluye 30 M€ para Canarias y 2 M€ para cada una de Ceuta y Melilla.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'subvenciones-sociales-directas-2026', 'item-02',
			'Entidades de derechos de las personas con discapacidad', null, 6038000,
			'Programas y estructuras nominados en el real decreto.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			2
		),
(
			'subvenciones-sociales-directas-2026', 'item-03',
			'Real Patronato sobre Discapacidad', null, 2798910,
			'Programas ejecutados por entidades identificadas.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			3
		),
(
			'subvenciones-sociales-directas-2026', 'item-04',
			'Derechos de los animales', null, 807500,
			'Actuaciones nominativas de protección animal.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			4
		),
(
			'subvenciones-sociales-directas-2026', 'item-05',
			'Red de Entidades Locales para la Agenda 2030', null, 600000,
			'Federación Española de Municipios y Provincias.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			5
		),
(
			'subvenciones-sociales-directas-2026', 'item-06',
			'Consumo, juego y alimentación escolar saludable', null, 317000,
			'Programas nominativos en tres ámbitos.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			6
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 'item-01',
			'Andalucía', null, 45364186,
			'543 municipios; hasta 9.072.836 € adicionales dentro del mismo presupuesto.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 'item-02',
			'Extremadura', null, 4635812,
			'153 municipios; hasta 927.164 € adicionales dentro del mismo presupuesto.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			2
		),
(
			'renovacion-equipamiento-hosteleria-2026', 'item-01',
			'Anualidad 2027', null, 14000000,
			'Mayor parte del programa.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			1
		),
(
			'renovacion-equipamiento-hosteleria-2026', 'item-02',
			'Anualidad 2026', null, 1000000,
			'Primera anualidad presupuestaria.', null, null, null,
			null, null, null,
			null, null, null,
			null, null, false,
			2
		);

insert into public.public_spending_sources (
	investigation_slug, source_id, source_kind, organization, title,
	source_date_label, url, what_it_proves, claim_summary, editorial_use, sort_order
)
values
(
			'acogida-proteccion-internacional-2026-2027', 'boe-planificacion', 'primary', 'Boletín Oficial del Estado',
			'Resolución de 18 de junio de 2026 sobre la planificación estructural del sistema de acogida', '19 de junio de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-13362', 'Periodo, plazas o personas planificadas, coste por fase, total de 670.458.917 € y posible cofinanciación europea.',
			null, null, 1
		),
(
			'acogida-proteccion-internacional-2026-2027', 'resolucion-precios', 'primary', 'Secretaría de Estado de Migraciones',
			'Resolución de 4 de junio de 2026 sobre precios de referencia', '4 de junio de 2026', 'https://sede.inclusion.gob.es/documents/387478/1674612/Resoluci%C3%B3n%2BSEM%2BPrecios_ACPI2026.pdf/11a405e7-b982-51bc-81bd-df5cd04085bc?t=1780578012700', 'Los 150 € son un precio de referencia por plaza y día para vulnerabilidad reforzada y sirven para calcular anticipos y la retribución máxima de la entidad.',
			null, null, 2
		),
(
			'acogida-proteccion-internacional-2026-2027', 'procedimiento-accion-concertada', 'primary', 'Sede electrónica del Ministerio de Inclusión',
			'Acción Concertada de Protección Internacional', 'Consulta: 22 de agosto de 2026', 'https://sede.inclusion.gob.es/w/accion-concertada-proteccion-internacional', 'Las entidades y la localización geográfica se concretan después mediante comunicaciones de asignación.',
			null, null, 3
		),
(
			'acogida-proteccion-internacional-2026-2027', 'instrucciones-justificacion', 'primary', 'Secretaría de Estado de Migraciones',
			'Instrucciones de gestión, seguimiento y justificación de la acción concertada', 'Consulta: 22 de agosto de 2026', 'https://sede.inclusion.gob.es/documents/387478/1674612/Instrucciones%2BGesti%C3%B3n%2C%2BSeguimiento%2By%2BJustificaci%C3%B3n%2BAC.pdf/24da74d2-0eee-7896-c176-f2ecff7de22f?t=1783593750640', 'La retribución final depende de costes efectivos, seguimiento y documentación justificativa; la planificación no equivale al pago final.',
			null, null, 4
		),
(
			'acogida-proteccion-internacional-2026-2027', 'uhn-plus-150-euros', 'publication_analyzed',
			'UHN Plus', 'El plan de Pedro Sánchez para los refugiados consta de 670 millones de euros mientras asfixia a los contribuyentes españoles', '19 de junio de 2026',
			'https://www.uhnplus.com/el-plan-de-pedro-sanchez-para-los-refugiados-consta-de-670-millones-mientras-asfixia-a-los-contribuyentes-espanoles/', null, 'Presenta los 150 € como una tarifa diaria por usuario dentro de la acogida de vulnerabilidad reforzada, sin mostrar en ese punto que la planificación la limita a 55 plazas.',
			'Sirve para entender de dónde nace la duda pública. CONVOCA no la usa como prueba del gasto: contrasta su lectura con el BOE y las resoluciones oficiales.', 5
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'idae-renoinn-noticia', 'primary', 'IDAE',
			'El IDAE concede 433,4 millones a 524 nuevos proyectos innovadores', '7 de agosto de 2026', 'https://www.idae.es/noticias/el-idae-concede-4334-millones-524-nuevos-proyectos-con-almacenamiento-de-agrivoltaica', 'Total, número de proyectos, tecnologías, potencia, almacenamiento e inversión movilizada.',
			null, null, 1
		),
(
			'renoinn-2-renovables-innovadoras-2026', 'idae-renoinn-resolucion', 'primary', 'Sede electrónica del IDAE',
			'Resolución definitiva de la segunda convocatoria RENOINN', 'Agosto de 2026', 'https://sede.idae.gob.es/sites/default/files/documentos/2026/Enegias%20Renovables/RENOINN2/_427_resol_see_renoinn_2.pdf', 'Listado nominal de proyectos, beneficiarios, municipios, inversión y ayuda concedida.',
			null, null, 2
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'miteco-hidrogeno', 'primary', 'MITECO',
			'El MITECO destina ayudas a nuevos proyectos para producir hidrógeno renovable', '6 de agosto de 2026', 'https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/agosto/el-miteco-destina-233-millones-a-tres-nuevos-proyectos-para-prod.html', 'Mecanismo de ayuda, calendario y tres de los proyectos resueltos.',
			null, null, 1
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'idae-hidrogeno', 'primary', 'IDAE',
			'El IDAE destina 274 millones a cuatro proyectos para producir H₂ renovable', '6 de agosto de 2026', 'https://www.idae.es/noticias/el-idae-destina-274-millones-cuatro-nuevos-proyectos-para-producir-h2-renovable-en', 'Los cuatro proyectos, ubicaciones, potencias, importes y pago ligado a producción.',
			null, null, 2
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 'idae-hidrogeno-resoluciones', 'primary', 'Sede electrónica del IDAE',
			'Segunda convocatoria AaaS: resoluciones definitivas', 'Agosto de 2026', 'https://sede.idae.gob.es/tramites-servicios/segunda-convocatoria-de-concesion-directa-de-ayudas-proyectos-espanoles-de', 'Acceso a las resoluciones individuales que dan soporte jurídico a cada concesión.',
			null, null, 3
		),
(
			'variante-jaca-a21-a23-2026', 'transportes-jaca', 'primary', 'Ministerio de Transportes',
			'Adjudicadas las obras de la variante de Jaca', '7 de agosto de 2026', 'https://cdn.transportes.gob.es/portal-web-transportes/recursos-web/transportes/media/press_release/260807-np-aragon-adjudicacion-jaca-variante-a-21-y-a-23.pdf', 'Importe con IVA, plazo, longitud y elementos principales de la actuación.',
			null, null, 1
		),
(
			'variante-jaca-a21-a23-2026', 'boe-jaca', 'primary', 'Boletín Oficial del Estado',
			'Anuncio de licitación de la variante de Jaca', 'Enero de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-B-2026-187', 'Objeto, expediente y apertura formal de la licitación.',
			null, null, 2
		),
(
			'variante-jaca-a21-a23-2026', 'placsp-jaca', 'primary', 'Plataforma de Contratación del Sector Público',
			'Expediente adjudicado: variante de Jaca', '7 de agosto de 2026', 'https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=2DxUbxA7tlr10HRJw8TEnQ%3D%3D', 'Adjudicatario, importe sin IVA, número de licitadores y duración contractual.',
			null, null, 3
		),
(
			'subvenciones-sociales-directas-2026', 'boe-rd-642-2026', 'primary', 'Boletín Oficial del Estado',
			'Real Decreto 642/2026, de 4 de agosto', '8 de agosto de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16556', 'Beneficiarios, importes, solicitud, concesión, pago anticipado y justificación.',
			null, null, 1
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 'boe-rd-608-2026', 'primary', 'Boletín Oficial del Estado',
			'Real Decreto 608/2026, de 29 de julio', '8 de agosto de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16553', 'Presupuesto, condiciones, fórmula y anexo completo de importes máximos municipales.',
			null, null, 1
		),
(
			'renovacion-equipamiento-hosteleria-2026', 'boe-rd-638-2026', 'primary', 'Boletín Oficial del Estado',
			'Real Decreto 638/2026, de 4 de agosto', '8 de agosto de 2026', 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-16554', 'Presupuesto, beneficiarios potenciales, cuantías, gasto elegible, justificación y pago.',
			null, null, 1
		);

insert into public.public_spending_trace_steps (
	investigation_slug, sort_order, label, detail, state
)
values
(
			'acogida-proteccion-internacional-2026-2027', 1, 'Necesidad planificada', 'Publicada y cuantificada en el BOE.', 'verified'
		),
(
			'acogida-proteccion-internacional-2026-2027', 2, 'Precio de referencia', 'Unidad y techo documentados.', 'verified'
		),
(
			'acogida-proteccion-internacional-2026-2027', 3, 'Asignaciones', 'Se concretan en comunicaciones posteriores.', 'current'
		),
(
			'acogida-proteccion-internacional-2026-2027', 4, 'Pago', 'No consta todavía para el periodo completo.', 'pending'
		),
(
			'acogida-proteccion-internacional-2026-2027', 5, 'Justificación', 'Pendiente de ejecución y rendición.', 'pending'
		),
(
			'renoinn-2-renovables-innovadoras-2026', 1, 'Convocatoria', 'Programas y condiciones publicados.', 'verified'
		),
(
			'renoinn-2-renovables-innovadoras-2026', 2, 'Concesión definitiva', '524 proyectos e importes resueltos.', 'verified'
		),
(
			'renoinn-2-renovables-innovadoras-2026', 3, 'Ejecución', 'Los proyectos deben cumplir hitos y plazos.', 'current'
		),
(
			'renoinn-2-renovables-innovadoras-2026', 4, 'Pago', 'No equivale automáticamente al total concedido.', 'pending'
		),
(
			'renoinn-2-renovables-innovadoras-2026', 5, 'Justificación', 'Control posterior pendiente.', 'pending'
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 1, 'Selección europea', 'Proyectos elegidos en la subasta.', 'verified'
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 2, 'Concesión definitiva', 'Cuatro máximos individualizados.', 'verified'
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 3, 'Decisión e inversión', 'Deben cumplir los plazos fijados.', 'current'
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 4, 'Pago por producción', 'Semestral y condicionado a H₂ certificado.', 'pending'
		),
(
			'hidrogeno-renovable-auctions-as-a-service-2026', 5, 'Cierre y control', 'Dependerá de la operación real.', 'pending'
		),
(
			'variante-jaca-a21-a23-2026', 1, 'Licitación', 'Expediente y condiciones publicados.', 'verified'
		),
(
			'variante-jaca-a21-a23-2026', 2, 'Adjudicación', 'Empresa e importe ya identificados.', 'verified'
		),
(
			'variante-jaca-a21-a23-2026', 3, 'Formalización y obra', 'Ejecución prevista durante 54 meses.', 'current'
		),
(
			'variante-jaca-a21-a23-2026', 4, 'Certificaciones y pagos', 'Se producirán durante la obra.', 'pending'
		),
(
			'variante-jaca-a21-a23-2026', 5, 'Liquidación', 'Coste final aún no disponible.', 'pending'
		),
(
			'subvenciones-sociales-directas-2026', 1, 'Real decreto', 'Beneficiarios y máximos nominados.', 'verified'
		),
(
			'subvenciones-sociales-directas-2026', 2, 'Solicitud', 'Plazo abierto hasta el 15 de septiembre.', 'current'
		),
(
			'subvenciones-sociales-directas-2026', 3, 'Concesión o convenio', 'Debe dictarse después.', 'pending'
		),
(
			'subvenciones-sociales-directas-2026', 4, 'Pago anticipado', 'Una transferencia tras la concesión.', 'pending'
		),
(
			'subvenciones-sociales-directas-2026', 5, 'Justificación', 'Hasta tres meses después de la actividad.', 'pending'
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 1, 'Real decreto', 'Presupuesto, fórmula y anexo publicados.', 'verified'
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 2, 'Solicitud municipal', 'Cada corporación debe pedir su ayuda.', 'current'
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 3, 'Resolución', 'Fijará la cuantía individual definitiva.', 'pending'
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 4, 'Contratación', 'Contratos de tres a seis meses.', 'pending'
		),
(
			'empleo-reconstruccion-andalucia-extremadura-2026', 5, 'Pago y justificación', 'Aún no disponibles.', 'pending'
		),
(
			'renovacion-equipamiento-hosteleria-2026', 1, 'Real decreto', 'Programa y presupuesto aprobados.', 'verified'
		),
(
			'renovacion-equipamiento-hosteleria-2026', 2, 'Solicitudes', 'Beneficiarios aún por determinar.', 'current'
		),
(
			'renovacion-equipamiento-hosteleria-2026', 3, 'Concesión', 'Importes individuales pendientes.', 'pending'
		),
(
			'renovacion-equipamiento-hosteleria-2026', 4, 'Compra y justificación', 'Debe acreditarse el gasto.', 'pending'
		),
(
			'renovacion-equipamiento-hosteleria-2026', 5, 'Pago', 'Se realizará tras la justificación.', 'pending'
		);

do $$
declare
	v_investigation_count integer;
	v_official_source_count integer;
	v_claim_source_count integer;
	v_asylum_total numeric(18, 2);
begin
	select count(*) into v_investigation_count
	from public.public_spending_investigations
	where publication_status = 'published';
	if v_investigation_count <> 7 then
		raise exception 'Se esperaban 7 investigaciones publicadas; hay %.', v_investigation_count;
	end if;

	select count(*) filter (where source_kind = 'primary'),
		count(*) filter (where source_kind = 'publication_analyzed')
	into v_official_source_count, v_claim_source_count
	from public.public_spending_sources;
	if v_official_source_count <> 15 or v_claim_source_count <> 1 then
		raise exception 'Fuentes inesperadas: % primarias y % publicación analizada.',
			v_official_source_count, v_claim_source_count;
	end if;

	select sum(amount) into v_asylum_total
	from public.public_spending_breakdown_items
	where investigation_slug = 'acogida-proteccion-internacional-2026-2027';
	if v_asylum_total <> 670458917 then
		raise exception 'El desglose de acogida no reconcilia: %.', v_asylum_total;
	end if;

	if not exists (
		select 1 from public.public_spending_sources
		where investigation_slug = 'acogida-proteccion-internacional-2026-2027'
			and source_id = 'uhn-plus-150-euros'
			and source_kind = 'publication_analyzed'
			and url = 'https://www.uhnplus.com/el-plan-de-pedro-sanchez-para-los-refugiados-consta-de-670-millones-mientras-asfixia-a-los-contribuyentes-espanoles/'
	) then
		raise exception 'No se ha sembrado correctamente la publicación de UHN Plus.';
	end if;
end;
$$;

commit;
