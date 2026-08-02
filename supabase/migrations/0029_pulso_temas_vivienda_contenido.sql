-- 0029_pulso_temas_vivienda_contenido.sql
--
-- Ampliación mínima y aditiva para poder cargar el contenido real del Plan
-- Vivienda 2036 sin perder información ni hardcodearla en componentes:
--
--   1. `topic_data_points` gana `explanation` y `time_scope`: el contenido
--      proporcionado para cada tarjeta de dato trae cifra + explicación +
--      ámbito temporal + fuente, pero la tabla solo tenía label/value/fuente.
--   2. `topics` gana `budget_narrative`: texto largo opcional para el
--      desglose económico completo (líneas presupuestarias, escenarios,
--      distribución temporal, fuentes de financiación), igual que
--      `problem_intro` ya sirve de texto largo para "el problema".
--
-- Sin filas semilla, sin contenido político — igual que 0026/0027/0028.

alter table public.topic_data_points
	add column explanation text,
	add column time_scope text;

comment on column public.topic_data_points.explanation is
	'Explicación breve de la cifra (distinta del valor mostrado en la tarjeta).';
comment on column public.topic_data_points.time_scope is
	'Ámbito temporal de la cifra (p. ej. "2022-2024" o "Estimación publicada en 2024").';

alter table public.topics
	add column budget_narrative text;

comment on column public.topics.budget_narrative is
	'Desglose económico largo del tema (líneas presupuestarias, escenarios, distribución temporal). Se muestra expandible, igual que problem_intro.';
