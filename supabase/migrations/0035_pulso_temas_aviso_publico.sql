-- 0035_pulso_temas_aviso_publico.sql
--
-- Añade un aviso público específico por tema, distinto del aviso genérico
-- ya mostrado en la página de detalle ("Borrador elaborado por Convoca...").
-- Necesario porque el encargo de Sanidad exige un aviso textual concreto
-- ("Esta es una propuesta abierta de Convoca. No es una ley aprobada...")
-- que no debe sustituir ni alterar el aviso genérico ya desplegado para
-- Vivienda. Columna nulable y aditiva: la fila de Vivienda queda con
-- public_notice = null y no cambia nada en su página.
alter table public.topics add column public_notice text;
comment on column public.topics.public_notice is
	'Aviso público específico del tema (p. ej. "no es una ley aprobada..."). Nulo = se muestra solo el aviso genérico existente.';
