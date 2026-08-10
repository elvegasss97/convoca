# Política de seguridad

## Versiones soportadas

CONVOCA no publica versiones etiquetadas ni mantiene ramas de soporte a
largo plazo. Solo se da soporte de seguridad a `main` — la última versión
del código, que es también la que ejecuta la instancia oficial en
[convoca.cloud](https://convoca.cloud) una vez desplegada.

## Qué se considera una vulnerabilidad

Cualquier fallo que permita, sin autorización:

- leer, modificar o borrar datos de otra persona (incluida cualquier
  respuesta de participación, voto, o dato de identidad);
- eludir una política de RLS o la autorización de una función
  `SECURITY DEFINER`;
- identificar a quien reportó una convocatoria o un canal, o a quien
  respondió una pregunta agregada, por debajo del umbral de protección
  diseñado;
- ejecutar código o consultas arbitrarias contra la base de datos;
- escalar privilegios (de `anon`/`authenticated` a acciones reservadas a
  moderación o administración).

Un fallo de disponibilidad, un error de interfaz sin impacto en datos, o
un problema que ya está documentado y clasificado como corregido en
`/seguridad` **no** se considera una vulnerabilidad activa a efectos de
este documento.

## Cómo reportarla

**No abras un Issue público.** Un Issue público es visible para cualquiera
antes de que exista una corrección.

- **Canal preferido:** [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability),
  disponible desde la pestaña "Security" de este repositorio una vez sea
  público. Permite reportar y discutir el hallazgo en privado con quien
  mantiene el proyecto, sin exponerlo mientras no hay corrección.
- Si por cualquier motivo ese canal no está disponible, contacta a través
  del perfil de GitHub de quien mantiene el repositorio, indicando que se
  trata de un reporte de seguridad.

### Información mínima que debe incluir un reporte

- Versión o commit afectado.
- Pasos de reproducción, lo más concretos posible.
- Impacto estimado (qué se podría llegar a hacer, no solo qué se observó).
- **Si se probó contra `convoca.cloud` o contra una instancia propia** —
  ver el límite explícito más abajo.

### Qué entornos pueden ser objeto de pruebas

- **Una instancia propia** (tu propio clon, tu propio proyecto Supabase):
  sin restricciones, es exactamente para eso.
- **`convoca.cloud`**: **solo verificación pasiva, no destructiva.** Nunca
  uses datos reales de terceros, nunca intentes escalar privilegios de
  verdad contra la instancia real, nunca automatices ataques de fuerza
  bruta o denegación de servicio contra ella.

## Política de divulgación coordinada

Disclosure coordinado estándar: se corrige primero en privado, se
despliega la corrección, y solo entonces se puede hacer público el
detalle técnico — con un plazo de gracia razonable tras el despliegue
antes de publicar. No se fija aquí un número exacto de días: para un
proyecto mantenido por una única persona, el plazo se acuerda caso por
caso con quien reporta.

## Expectativas de respuesta

Este es un proyecto mantenido por una única persona, no una organización
con un equipo de seguridad dedicado. Se hará lo posible por confirmar la
recepción de un reporte en un plazo razonable y comunicar el avance, pero
**no se comprometen aquí plazos (SLA) concretos** que no se puedan
sostener de verdad.

## Qué no se debe reportar aquí

Sugerencias de mejora sin impacto de seguridad, dudas generales de uso, o
peticiones de funcionalidad — para eso, usa un Issue normal.
