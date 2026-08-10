# CONVOCA

## Qué es CONVOCA

CONVOCA es una plataforma de participación ciudadana: un sitio donde
cualquiera puede publicar y encontrar convocatorias (manifestaciones,
concentraciones, asambleas, jornadas reivindicativas...), y donde la
ciudadanía puede valorar propuestas de políticas públicas concretas,
priorizar medidas y participar en procesos de escucha abierta sobre temas
como vivienda o sanidad.

## Qué problema intenta resolver

La brecha entre la ciudadanía y el proceso de definición de políticas
públicas: hoy es difícil encontrar información estructurada sobre
propuestas concretas, comparar medidas alternativas, o dejar constancia
agregada de una opinión de forma que se pueda auditar después. CONVOCA no
pretende resolver esa brecha por sí sola — es una herramienta, no una
solución completa.

## Qué NO es

- No es un sistema de votación electoral oficial.
- No sustituye ningún proceso institucional de participación.
- No garantiza resultados vinculantes para ninguna administración.
- No es una muestra representativa de la población: la participación es
  abierta y voluntaria, nunca se presenta como una encuesta con
  metodología estadística.

## Estado del proyecto

**Software en desarrollo activo.** No representa a ninguna administración
pública ni partido político. La instancia oficial en `convoca.cloud` es un
despliegue real con base de datos real, pero el proyecto sigue
evolucionando — antes de tratar cualquier funcionalidad como
definitivamente estable, revisa el historial de `supabase/migrations/` y
`/seguridad`.

## Funcionalidades principales

- **Convocatorias**: publicación, mapa, moderación y verificación de
  convocatorias ciudadanas.
- **Pulso Ciudadano**: valoración de preocupaciones por nivel de
  importancia, sobre categorías reales (vivienda, sanidad, empleo,
  educación...).
- **Soluciones**: propuestas de políticas públicas estructuradas, con
  medidas, presupuesto, calendario y riesgos.
- **Participación sobre medidas**: valorar cada medida (a favor / en
  contra / con cambios), priorizar hasta tres, y explicar por qué de
  forma privada.
- **Escucha abierta**: procesos de recogida de prioridades y
  profundización cualitativa sobre un tema, con protección de grupos
  pequeños en los resultados agregados.
- **Próximo bloque**: votación sobre qué tema abordar a continuación,
  cerrada mientras la votación está abierta.
- **Moderación**: revisión de convocatorias y reportes por parte de
  personal autorizado, sin acceso innecesario a quién reportó qué.
- **Privacidad por diseño**: los resultados agregados nunca exponen una
  respuesta individual — ni por umbral demasiado bajo, ni por acceso
  directo a la fila, ni por columnas que identifiquen a quien participó.

No se prometen garantías absolutas de seguridad ni de neutralidad
política del proyecto por el simple hecho de tener el código abierto.

## Stack

- [SvelteKit](https://svelte.dev/) + TypeScript
- [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, RLS,
  Edge Functions)
- PostgreSQL con Row Level Security como mecanismo real de autorización
  (no solo en el cliente)
- [Vercel](https://vercel.com/) como despliegue actual de la instancia
  oficial — no es un requisito del proyecto, cualquier host compatible
  con SvelteKit sirve.

## Arquitectura

Resumen de alto nivel en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):
navegador → SvelteKit (sin sesión de servidor) → Supabase (Auth,
PostgREST, RPC) → PostgreSQL con RLS → una única Edge Function para
borrado de cuenta.

## Requisitos

- Node.js 22.x
- pnpm 11.9.0 (`packageManager` fijado en `package.json`)
- Un proyecto Supabase propio (gratuito) para desarrollo local — nunca
  la instancia oficial de CONVOCA

## Instalación

```sh
pnpm install
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena tus propios valores. Hay
plantillas adicionales para otros entornos: `.env.staging.example`,
`.env.production.example`. **Ninguna plantilla contiene valores reales.**

## Supabase propio

Cada instalación de CONVOCA — desarrollo local, staging o una instancia
propia — debe usar su propio proyecto de Supabase. El código nunca asume
ni referencia el proyecto de la instancia oficial: toda la configuración
de infraestructura pasa por variables `PUBLIC_*`.

## Migraciones

`supabase/migrations/` contiene el historial completo de esquema (43
migraciones al momento de escribir esto), aplicable desde cero a un
proyecto Supabase propio:

```sh
supabase link --project-ref <tu-project-ref>
supabase db push
```

No se aplican contra ningún proyecto de la instancia oficial de CONVOCA
desde este repositorio.

## Desarrollo

```sh
pnpm dev
```

## Tests

```sh
pnpm test
pnpm check   # type-checking
pnpm lint    # prettier + eslint
```

## Security Baseline P0

CONVOCA ejecuta un conjunto de controles de seguridad automatizados en
cada Pull Request y en cada push a `main` (`.github/workflows/security-baseline.yml`,
scripts en `scripts/security/`). Comprueba, entre otras cosas: RLS
habilitada en todas las tablas, funciones `SECURITY DEFINER` nuevas con
revisión defensiva explícita, ausencia de secretos en el diff y en el
historial, reproducibilidad de las migraciones desde cero contra una
réplica desechable, y doble auditoría de dependencias.

**No necesita ningún acceso a la infraestructura de producción o staging
de CONVOCA** — corre íntegramente contra réplicas de Postgres desechables
creadas por el propio workflow. Puedes ejecutarla en local:

```sh
pnpm security:baseline
```

## Modelo de seguridad

Resumen prudente, no exhaustivo — el detalle completo, incluidas
correcciones históricas, está en `/seguridad`:

- Autorización real en PostgreSQL vía Row Level Security, no solo en el
  cliente.
- Funciones `SECURITY DEFINER` con `search_path` explícito y revisión
  obligatoria antes de fusionarse.
- Escaneo de secretos en cada cambio y sobre el historial completo.
- Los resultados agregados de participación aplican protección de grupos
  pequeños (supresión de la distribución completa cuando alguna categoría
  tiene muy pocas respuestas) para dificultar la reconstrucción de una
  respuesta individual por resta.

Esto **no** significa que el sistema sea invulnerable — ningún control
elimina el riesgo por completo, y no se afirma lo contrario en ningún
punto de este proyecto.

## Despliegue

Genérico: cualquier plataforma compatible con SvelteKit (adapter
configurable) más un proyecto Supabase propio. Vercel es un ejemplo, el
que usa hoy la instancia oficial — no un requisito del proyecto.

## Seguridad

Para reportar una vulnerabilidad, lee [`SECURITY.md`](SECURITY.md) —
**nunca la reportes como un Issue público.**

## Contribuir

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licencia

[AGPL-3.0-only](LICENSE). Atribuciones de terceros vendorizados en
[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

## Demo / producción oficial

[convoca.cloud](https://convoca.cloud) es la instancia oficial pública —
un dominio intencionalmente público, no un requisito para ejecutar tu
propia instancia.
