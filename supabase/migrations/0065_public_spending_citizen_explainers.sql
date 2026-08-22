-- 20260822213000_public_spending_citizen_explainers.sql
--
-- Añade una lectura introductoria común a las siete fichas de gasto público.
-- El contenido se mantiene estructurado en Supabase para explicar, antes del
-- detalle técnico, de dónde sale el dinero, adónde va y qué significa cada
-- cifra principal.

begin;

alter table public.public_spending_investigations
	add column citizen_intro text,
	add column funding_origin text,
	add column funding_destination text,
	add column citizen_takeaway text;

update public.public_spending_investigations as investigation
set
	citizen_intro = copy.citizen_intro,
	funding_origin = copy.funding_origin,
	funding_destination = copy.funding_destination,
	citizen_takeaway = copy.citizen_takeaway
from (
	values
		(
			'acogida-proteccion-internacional-2026-2027',
			'Esta ficha no describe 670 millones ya repartidos ni un pago de 150 € a cada persona. Describe cuánto calcula la Administración que costará mantener durante un año las distintas plazas y servicios del sistema de acogida.',
			'La cifra nace en la planificación estatal de la Secretaría de Estado de Migraciones para el periodo de julio de 2026 a junio de 2027. El BOE indica que estos servicios pueden recibir cofinanciación de los fondos europeos FSE+ o FAMI.',
			'El dinero se asignará a entidades autorizadas que presten alojamiento, valoración inicial, atención a personas vulnerables y apoyo a la autonomía. No se entrega como una paga general a cada persona acogida.',
			'Los 670,46 M€ son un máximo planificado para todo el sistema. Los 150 € son una tarifa técnica reservada a 55 plazas de atención reforzada.'
		),
		(
			'renoinn-2-renovables-innovadoras-2026',
			'El IDAE no paga toda la inversión: aporta una parte del coste a 524 proyectos seleccionados. Cada beneficiario debe completar la financiación, ejecutar lo aprobado y justificarlo después.',
			'Los 433,44 M€ son fondos europeos NextGenerationEU canalizados por el Plan de Recuperación, Transformación y Resiliencia y gestionados por el IDAE.',
			'Se reparten entre proyectos de agrivoltaica, renovables integradas en infraestructuras, bombas de calor, autoconsumo colectivo y fotovoltaica flotante. La resolución identifica beneficiario, municipio e importe de cada proyecto.',
			'La ayuda pública es de 433,44 M€; la inversión completa prevista asciende a 1.186,19 M€; y los 234,03 M€ de agrivoltaica forman parte de esos 433,44 M€, no se suman aparte.'
		),
		(
			'hidrogeno-renovable-auctions-as-a-service-2026',
			'No son 274,30 millones pagados de una vez. Es el máximo que podrán cobrar cuatro proyectos conforme produzcan y certifiquen hidrógeno cien por cien renovable.',
			'La convocatoria se financia con fondos europeos NextGenerationEU del Plan de Recuperación y la gestiona el IDAE. Los proyectos habían sido seleccionados en una subasta europea, pero quedaron en reserva al agotarse aquel presupuesto.',
			'El apoyo va a cuatro plantas situadas en Arteixo, Villarrobledo, Puertollano y Zaragoza. La ayuda se calcula por cada kilogramo certificado y se liquida por periodos durante la operación.',
			'274,30 M€ es el techo de la ayuda. El importe finalmente pagado dependerá de cuánto hidrógeno renovable produzca y certifique cada planta.'
		),
		(
			'variante-jaca-a21-a23-2026',
			'Aquí la cifra no es una bolsa de ayudas: es el precio de un contrato de obra pública ya adjudicado para construir 8,05 kilómetros de variante y conectar las autovías A-21 y A-23.',
			'La cifra nace del contrato público licitado por el Ministerio de Transportes. La plataforma de contratación publica el importe sin IVA y el Ministerio comunica también su equivalente aproximado con IVA.',
			'El contrato se adjudicó a la UTE formada por Sacyr Construcción y Papsa Infraestructuras para ejecutar la obra. El coste efectivo se irá concretando con la ejecución, las certificaciones y la liquidación final.',
			'111,83 M€ sin IVA y aproximadamente 135,3 M€ con IVA son dos formas de expresar la misma adjudicación, no dos gastos distintos.'
		),
		(
			'subvenciones-sociales-directas-2026',
			'El real decreto pone nombre y cantidad máxima a cada ayuda, pero todavía no equivale a un extracto bancario. Las entidades deben solicitarla y recibir después una resolución o un convenio.',
			'Las ayudas se cargan a partidas del Ministerio de Derechos Sociales en los Presupuestos Generales del Estado de 2023 prorrogados para 2026.',
			'El dinero se dirige a entidades sociales y administraciones para inclusión, lucha contra la pobreza, discapacidad, familias, bienestar animal, consumo y Agenda 2030. La mayor partida individual son 30 M€ para programas contra la pobreza en Canarias.',
			'Los 50,58 M€ son la suma de los máximos previstos. Hasta que se dicten las resoluciones o convenios no deben leerse como dinero ya pagado.'
		),
		(
			'empleo-reconstruccion-andalucia-extremadura-2026',
			'El programa reserva 50 millones para que municipios afectados contraten a personas desempleadas en trabajos de reconstrucción. El anexo reparte topes, pero cada ayuntamiento debe pedir la ayuda.',
			'La financiación es estatal y sale de créditos específicos del presupuesto de gastos del Servicio Público de Empleo Estatal (SEPE).',
			'Los destinatarios directos son las corporaciones locales incluidas en el anexo. Con la subvención podrán pagar salarios y cotizaciones de contratos de tres a seis meses para obras y servicios de recuperación.',
			'El total disponible son 50 M€. Los máximos municipales orientan el reparto, pero la cuantía definitiva dependerá de cada solicitud y resolución.'
		),
		(
			'renovacion-equipamiento-hosteleria-2026',
			'Es un programa de ayudas para cambiar maquinaria y equipos por otros de menor consumo energético. Los 15 millones son el límite total del programa, no una cantidad reservada para una sola empresa.',
			'El dinero procede de los Presupuestos Generales del Estado asignados a la Secretaría de Estado de Turismo: 1 M€ en 2026 y 14 M€ en 2027.',
			'Podrán recibirlo establecimientos de alojamiento, restauración y bebidas que cumplan los requisitos. La ayuda cubre entre 5.000 y 11.000 € por establecimiento, sin IVA y por orden de solicitud completa.',
			'Hay 15 M€ disponibles para todo el país. Cada establecimiento puede obtener entre 5.000 y 11.000 €, y cobrará después de acreditar el gasto.'
		)
) as copy (slug, citizen_intro, funding_origin, funding_destination, citizen_takeaway)
where investigation.slug = copy.slug;

do $$
begin
	if (
		select count(*)
		from public.public_spending_investigations
		where citizen_intro is null
			or funding_origin is null
			or funding_destination is null
			or citizen_takeaway is null
	) > 0 then
		raise exception 'Todas las investigaciones deben tener explicación ciudadana antes de publicar la migración';
	end if;
end;
$$;

alter table public.public_spending_investigations
	alter column citizen_intro set not null,
	alter column funding_origin set not null,
	alter column funding_destination set not null,
	alter column citizen_takeaway set not null,
	add constraint public_spending_investigations_citizen_intro_not_blank
		check (btrim(citizen_intro) <> ''),
	add constraint public_spending_investigations_funding_origin_not_blank
		check (btrim(funding_origin) <> ''),
	add constraint public_spending_investigations_funding_destination_not_blank
		check (btrim(funding_destination) <> ''),
	add constraint public_spending_investigations_citizen_takeaway_not_blank
		check (btrim(citizen_takeaway) <> '');

create table public.public_spending_explainer_figures (
	investigation_slug text not null references public.public_spending_investigations (slug) on update cascade on delete cascade,
	figure_id text not null,
	display_value text not null check (btrim(display_value) <> ''),
	question text not null check (btrim(question) <> ''),
	explanation text not null check (btrim(explanation) <> ''),
	sort_order smallint not null check (sort_order > 0),
	created_at timestamptz not null default now(),
	primary key (investigation_slug, figure_id),
	unique (investigation_slug, sort_order),
	constraint public_spending_explainer_figures_id_format check (
		figure_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
	)
);

comment on table public.public_spending_explainer_figures is
	'Cifras clave de cada ficha traducidas a preguntas ciudadanas. Se leen junto a la introducción de public_spending_investigations.';
comment on column public.public_spending_explainer_figures.display_value is
	'Valor ya formateado editorialmente porque puede representar dinero, tiempo, cantidad o rango.';

alter table public.public_spending_explainer_figures enable row level security;

revoke all on public.public_spending_explainer_figures from public, anon, authenticated;
grant select on public.public_spending_explainer_figures to anon, authenticated;

create policy "public_spending_explainer_figures_select_published_parent"
	on public.public_spending_explainer_figures for select
	to anon, authenticated
	using (
		exists (
			select 1
			from public.public_spending_investigations investigation
			where investigation.slug = public_spending_explainer_figures.investigation_slug
				and investigation.publication_status = 'published'
		)
	);

insert into public.public_spending_explainer_figures (
	investigation_slug, figure_id, display_value, question, explanation, sort_order
)
values
	(
		'acogida-proteccion-internacional-2026-2027', 'total-planificado', '670,46 M€',
		'¿Cuánto se ha previsto para todo el año?',
		'Es la suma de las siete modalidades de atención entre julio de 2026 y junio de 2027. Es planificación, no dinero ya pagado.', 1
	),
	(
		'acogida-proteccion-internacional-2026-2027', 'tarifa-reforzada', '150 €',
		'¿Qué significa la cifra que circuló?',
		'Es el precio de referencia por plaza y día para atención de vulnerabilidad reforzada. Solo se aplica a 55 plazas y lo recibe la entidad que presta el servicio.', 2
	),
	(
		'acogida-proteccion-internacional-2026-2027', 'bloque-reforzado', '3,01 M€',
		'¿Cuánto pesa ese caso dentro del total?',
		'Es el resultado de 55 plazas × 365 días × 150 €. Representa aproximadamente el 0,45 % de los 670,46 M€ planificados.', 3
	),
	(
		'renoinn-2-renovables-innovadoras-2026', 'ayuda-publica', '433,44 M€',
		'¿Cuánto dinero público se ha concedido?',
		'Es la ayuda total para los 524 proyectos seleccionados. Concedido no significa todavía pagado ni proyecto terminado.', 1
	),
	(
		'renoinn-2-renovables-innovadoras-2026', 'inversion-total', '1.186,19 M€',
		'¿Cuánto cuestan en conjunto los proyectos?',
		'Es la inversión total prevista: incluye los 433,44 M€ de ayuda y la financiación que deben completar los beneficiarios.', 2
	),
	(
		'renoinn-2-renovables-innovadoras-2026', 'agrivoltaica', '234,03 M€',
		'¿Qué parte va a agrivoltaica?',
		'Es una parte de la ayuda total: corresponde a 118 de los 524 proyectos. No es una cantidad adicional.', 3
	),
	(
		'hidrogeno-renovable-auctions-as-a-service-2026', 'ayuda-maxima', '274,30 M€',
		'¿Cuánto podrían cobrar como máximo?',
		'Es la suma de los cuatro topes concedidos. El pago real dependerá de la producción renovable que se certifique.', 1
	),
	(
		'hidrogeno-renovable-auctions-as-a-service-2026', 'proyectos', '4 proyectos',
		'¿Entre cuántas plantas se reparte?',
		'ATLAS, QUIXOTGEN, P-HYNET y ZARAGOZAH2V, situadas en A Coruña, Albacete, Ciudad Real y Zaragoza.', 2
	),
	(
		'hidrogeno-renovable-auctions-as-a-service-2026', 'periodo-pago', 'Hasta 10 años',
		'¿Cuándo se paga la ayuda?',
		'Se va devengando por hidrógeno producido y certificado durante los primeros años de operación; no se entrega entera al inicio.', 3
	),
	(
		'variante-jaca-a21-a23-2026', 'adjudicacion-sin-iva', '111.827.525,49 €',
		'¿Cuál es el precio adjudicado sin IVA?',
		'Es el importe contractual que figura en la Plataforma de Contratación del Sector Público.', 1
	),
	(
		'variante-jaca-a21-a23-2026', 'adjudicacion-con-iva', '≈ 135,3 M€',
		'¿Por qué aparece otra cifra mayor?',
		'Es la misma adjudicación con el IVA incluido y redondeada en la comunicación oficial del Ministerio.', 2
	),
	(
		'variante-jaca-a21-a23-2026', 'plazo-obra', '54 meses',
		'¿Cuánto tiempo se prevé para la obra?',
		'Es el plazo contractual. Hubo 15 ofertas; los pagos y el coste final se conocerán conforme avance la ejecución.', 3
	),
	(
		'subvenciones-sociales-directas-2026', 'maximo-total', '50,58 M€',
		'¿Cuánto suman todas las ayudas previstas?',
		'Es la suma de los importes máximos nominados en el real decreto, no la suma de transferencias ya realizadas.', 1
	),
	(
		'subvenciones-sociales-directas-2026', 'canarias-pobreza', '30 M€',
		'¿Cuál es la mayor partida individual?',
		'Va destinada a la Comunidad Autónoma de Canarias para el programa de lucha contra la pobreza y prestaciones básicas de servicios sociales.', 2
	),
	(
		'subvenciones-sociales-directas-2026', 'plazo-solicitud', '15 sep. 2026',
		'¿Qué falta antes de concederlas?',
		'Las entidades deben presentar la solicitud y después recibir la resolución o firmar el convenio correspondiente.', 3
	),
	(
		'empleo-reconstruccion-andalucia-extremadura-2026', 'presupuesto', '50 M€',
		'¿Cuánto dinero hay para todo el programa?',
		'Es el límite conjunto de los créditos específicos del SEPE para esta medida extraordinaria.', 1
	),
	(
		'empleo-reconstruccion-andalucia-extremadura-2026', 'municipios', '696 municipios',
		'¿Dónde puede llegar?',
		'El anexo incluye 543 municipios andaluces y 153 extremeños con una cuantía máxima orientativa.', 2
	),
	(
		'empleo-reconstruccion-andalucia-extremadura-2026', 'anexo-redondeo', '49.999.998 €',
		'¿Por qué el anexo no suma exactamente 50 M€?',
		'Faltan 2 € por el redondeo de las cantidades municipales. No es otro presupuesto ni un recorte adicional.', 3
	),
	(
		'renovacion-equipamiento-hosteleria-2026', 'programa-total', '15 M€',
		'¿Cuánto puede gastar como máximo el programa?',
		'Es el límite para todas las solicitudes del país: 1 M€ corresponde a 2026 y 14 M€ a 2027.', 1
	),
	(
		'renovacion-equipamiento-hosteleria-2026', 'ayuda-establecimiento', '5.000–11.000 €',
		'¿Cuánto puede recibir cada establecimiento?',
		'Es el rango de la subvención por local, sin IVA. Una empresa puede pedirla para más de un establecimiento si cumple los requisitos.', 2
	),
	(
		'renovacion-equipamiento-hosteleria-2026', 'reparto-anual', '1 M€ + 14 M€',
		'¿Cómo se reparte entre años?',
		'El presupuesto reserva 1 M€ para 2026 y 14 M€ para 2027. No son dos programas diferentes.', 3
	);

-- Corrige fechas editoriales que no coincidían con las fuentes primarias.
update public.public_spending_investigations
set published_on = case slug
	when 'renoinn-2-renovables-innovadoras-2026' then '2026-07-31'::date
	when 'subvenciones-sociales-directas-2026' then '2026-07-30'::date
	when 'empleo-reconstruccion-andalucia-extremadura-2026' then '2026-07-30'::date
	when 'renovacion-equipamiento-hosteleria-2026' then '2026-07-30'::date
	else published_on
end
where slug in (
	'renoinn-2-renovables-innovadoras-2026',
	'subvenciones-sociales-directas-2026',
	'empleo-reconstruccion-andalucia-extremadura-2026',
	'renovacion-equipamiento-hosteleria-2026'
);

update public.public_spending_sources
set
	title = case source_id
		when 'boe-rd-642-2026' then 'Real Decreto 642/2026, de 29 de julio'
		when 'boe-rd-608-2026' then 'Real Decreto 608/2026, de 22 de julio'
		when 'boe-rd-638-2026' then 'Real Decreto 638/2026, de 29 de julio'
		else title
	end,
	source_date_label = case source_id
		when 'idae-renoinn-noticia' then '31 de julio de 2026'
		when 'boe-rd-642-2026' then '30 de julio de 2026'
		when 'boe-rd-608-2026' then '30 de julio de 2026'
		when 'boe-rd-638-2026' then '30 de julio de 2026'
		else source_date_label
	end
where source_id in (
	'idae-renoinn-noticia',
	'boe-rd-642-2026',
	'boe-rd-608-2026',
	'boe-rd-638-2026'
);

commit;
