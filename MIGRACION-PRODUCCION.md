# Migración de Convoca a producción

> Este documento se actualiza a medida que avanza la migración. La sección
> **"Estado ejecutado"** al final de cada fase refleja lo que de verdad se
> hizo y se comprobó — no lo que estaba planeado. Si algo no se pudo
> verificar en vivo, se dice explícitamente.

## Resumen ejecutivo (antes de empezar)

Convoca es, a fecha de este documento, un **prototipo visual completo con
autenticación y persistencia simuladas**: no hay backend, no hay base de
datos real, y toda la "seguridad" (sesiones, roles, propiedad de eventos)
se aplica solo en el cliente. Es útil para validar el diseño y los flujos,
pero **no debe desplegarse tal cual con usuarios reales**.

---

## FASE 1 — Inventario y estado seguro

### 1. Estado de Git

Al empezar esta fase, `/home/elias/Escritorio/convoca` **no era un
repositorio Git** (no había `.git`, ni commits, ni remoto). No existía
por tanto ningún riesgo de secretos filtrados en historial de commits,
pero tampoco había forma de volver a un estado anterior si algo se rompía
durante la migración.

**Acción tomada:** `git init`, identidad local del repo configurada
(`git config user.name/email`, sin tocar la configuración global de la
máquina), y un primer commit (`Estado inicial del prototipo antes de la
migración a producción`) con el contenido exacto de esta carpeta antes de
tocar nada. Ese commit es el punto de restauración. **No se ha hecho
`push`** a ningún remoto, no hay remoto configurado.

### 2. Inventario de sistemas mock

#### Autenticación mock

| Elemento                                                                               | Ubicación                        |
| -------------------------------------------------------------------------------------- | -------------------------------- |
| Contrato de servicio (`AuthService`, `User`, `UserSession`, `OrganizerPrivateProfile`) | `src/lib/auth/types.ts`          |
| Implementación mock (localStorage)                                                     | `src/lib/auth/authService.ts`    |
| "Hash" de contraseña (SHA-256 puro en JS, sin backend)                                 | `src/lib/auth/mockHash.ts`       |
| Estado de sesión reactivo compartido                                                   | `src/lib/auth/session.svelte.ts` |
| Generador de ids sin `crypto.randomUUID`                                               | `src/lib/utils/id.ts`            |

La propia implementación ya se documenta a sí misma como insegura (comentarios
`⚠️ NO ES SEGURO` en las cabeceras de `authService.ts` y `mockHash.ts`), pero
sigue siendo código que se ejecuta en el navegador de cualquier visitante.

#### localStorage: claves usadas y qué contienen

Todas bajo el prefijo `convoca:mock:v1:*` (namespace en
`src/lib/utils/persistedArray.ts`), más una clave de sesión aparte:

| Clave                                     | Contenido                                                        | Sensibilidad                             |
| ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| `convoca:mock:v1:auth-accounts`           | Cuentas: email, rol, **hash + sal de contraseña**                | Alta (aunque el hash sea "solo mock")    |
| `convoca:mock:v1:auth-session`            | Sesión activa: usuario, token, expiración                        | Alta                                     |
| `convoca:mock:v1:auth-organizer-profiles` | Perfil privado del organizador (nombre legal de la organización) | Media                                    |
| `convoca:mock:v1:events`                  | Convocatorias (incluidas en borrador/pendientes)                 | Media                                    |
| `convoca:mock:v1:event-updates`           | Actualizaciones de organizador                                   | Baja                                     |
| `convoca:mock:v1:reports`                 | Reportes de convocatorias                                        | Media                                    |
| `convoca:mock:v1:audit-logs`              | Registro de decisiones de moderación                             | Media                                    |
| `convoca:mock:v1:organizers`              | Perfil público de organizador                                    | Baja (es público por diseño)             |
| `convoca:my-attendance`                   | Asistencia ("voy"/"me interesa") del propio navegador            | Media (aunque no identifica a nadie más) |

Los **documentos de verificación NUNCA se persisten** en localStorage (decisión
tomada ya en una iteración anterior, ver comentario en
`src/lib/services/organizersService.ts`): viven solo en memoria y desaparecen
al recargar. Correcto para el mock; en producción serán objetos privados en
Supabase Storage, nunca datos de cliente.

#### Cuentas de demostración

Definidas en `src/lib/auth/authService.ts` (`DEMO_ACCOUNTS`, `DEMO_PASSWORD`):

- `organizador@convoca.demo` (rol organizer, vinculada a `org-1`)
- `organizador2@convoca.demo` (rol organizer, vinculada a `org-2`)
- `moderador@convoca.demo` (rol moderator)
- Contraseña compartida: `Convoca123!` (constante `DEMO_PASSWORD`, en claro en el código fuente)

Se muestran en la pantalla `/login` **solo si `import.meta.env.DEV` es
`true`** (botones "Usar" + contraseña visible). `import.meta.env.DEV` es una
constante que Vite resuelve en tiempo de compilación: en un build de
producción (`vite build` sin modo desarrollo) es `false` de forma estática y
Rollup elimina ese bloque entero del bundle — no es una bandera que se pueda
activar manipulando el navegador. Aun así, la Fase 2 sustituye este único
guard por variables `PUBLIC_*` explícitas, tal como se pidió, para que la
intención quede declarada y no dependa implícitamente del modo de Vite.

#### Datos ficticios (eventos, organizadores, reportes...)

`src/lib/mock/*.ts`: `events.ts` (18 convocatorias), `organizers.ts` (12
organizadores), `updates.ts`, `documents.ts`, `reports.ts`, `auditLogs.ts`,
`cities.ts`. Se usan como _seed_ inicial de los servicios mock
(`src/lib/services/*.ts`) y no tienen ninguna marca `PUBLIC_ENABLE_DEMO_DATA`
todavía — la Fase 2 la añade.

#### Funciones solo-desarrollo

| Función                                                  | Archivo                                                                                   | Guard actual                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| Botón "Reset datos (dev)" (borra localStorage y recarga) | `src/lib/components/dev/DevResetButton.svelte`, montado desde `src/routes/+layout.svelte` | `{#if import.meta.env.DEV}` |
| Credenciales de demo visibles + autorrelleno             | `src/routes/login/+page.svelte`                                                           | `{#if import.meta.env.DEV}` |

#### Rutas por rol

| Ruta           | Rol requerido                                                    | Guard actual                                                   | Dónde                             |
| -------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| `/organizador` | `organizer` o `admin`                                            | `+page.ts` → `redirect(303, /login?redirect=...)` si no cumple | `src/routes/organizador/+page.ts` |
| `/moderacion`  | `moderator` o `admin`                                            | igual que arriba                                               | `src/routes/moderacion/+page.ts`  |
| `/cuenta`      | cualquier sesión                                                 | igual                                                          | `src/routes/cuenta/+page.ts`      |
| `/crear`       | ninguno para rellenar; sí para enviar (con guardado de borrador) | comprobación en el propio componente                           | `src/routes/crear/+page.svelte`   |

**Importante:** estos guards viven en `+page.ts` (código de **cliente**,
la app corre con `ssr = false`, ver `src/routes/+layout.ts`). Protegen la
_navegación dentro de la interfaz_, pero no protegen nada a nivel de datos:
hoy no hay ninguna API ni base de datos real que alguien pueda llamar
directamente saltándose la UI. Esta es precisamente la brecha que cierran
las políticas RLS de la Fase 4 — la autorización real tiene que vivir en
Postgres, no solo en el router de SvelteKit.

#### Variables de entorno

**No existía ningún archivo `.env`, `.env.example` ni variables `PUBLIC_*`
en el proyecto.** `.gitignore` ya excluye `.env`/`.env.*` correctamente
(con excepción explícita de `.env.example`), así que el mecanismo de
exclusión estaba listo, pero no había nada que excluir todavía.

#### Secretos potencialmente expuestos

- `DEMO_PASSWORD = 'Convoca123!'` en texto plano en `authService.ts`. No es
  un secreto real (es una contraseña de demostración conocida y compartida
  a propósito), pero debe dejar de poder cargarse en un build de
  producción — la Fase 2 lo ata a `PUBLIC_ENABLE_DEV_TOOLS`.
- No se ha encontrado ninguna clave de API, token, ni credencial real
  (Supabase, terceros, etc.) en el código: el proyecto todavía no habla con
  ningún servicio externo salvo Nominatim/OpenStreetMap (sin autenticación)
  y los tiles de mapa (públicos).
- No hay historial de Git anterior que auditar (ver punto 1).

### 3. Dependencias dependientes de lo mock (para no romper nada al retirarlo)

- `src/lib/services/*.ts` — toda la capa de datos actual lee/escribe los
  arrays en memoria + localStorage. **Fase 3 sustituye estas funciones
  internamente** por llamadas a Supabase, manteniendo la misma firma
  pública para no tener que tocar los componentes Svelte que las consumen.
- `src/lib/auth/authService.ts` — implementa la interfaz `AuthService`
  (`src/lib/auth/types.ts`). **Fase 3 escribe una segunda implementación**
  de esa misma interfaz sobre `@supabase/supabase-js` y cambia un único
  punto de ensamblado; los componentes (`login`, `registro`, `cuenta`,
  `UserMenu`...) no cambian porque solo conocen la interfaz.
- `src/lib/mock/*.ts` — pasan a usarse **solo como _seed_ de
  desarrollo/staging** (Fase 2), nunca importados por código que se
  ejecute cuando `PUBLIC_ENABLE_DEMO_DATA=false`.

---

## FASE 2 — Variables de entorno y separación demo/producción

### 1. Variables introducidas

`.env.example` (versionado) documenta el contrato; `.env` (ignorado por
Git) tiene valores reales de desarrollo:

```
PUBLIC_APP_ENV=development|staging|production
PUBLIC_ENABLE_DEMO_DATA=true|false
PUBLIC_ENABLE_DEV_TOOLS=true|false
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

`src/lib/config/env.ts` centraliza su lectura (vía `$env/static/public`,
sustituido en tiempo de compilación) y expone `APP_ENV`, `IS_PRODUCTION`,
`IS_STAGING`, `IS_DEVELOPMENT`, `ENABLE_DEMO_DATA`, `ENABLE_DEV_TOOLS`.
Defensa en profundidad: `ENABLE_DEMO_DATA`/`ENABLE_DEV_TOOLS` se calculan
como `!IS_PRODUCTION && PUBLIC_ENABLE_..='true'`, así que aunque alguien
configure mal las otras dos variables, `PUBLIC_APP_ENV=production` las
fuerza a `false` de todas formas.

### 2. Aislamiento de datos y cuentas de demostración

Se movieron los datos de demostración fuera de los servicios y se cargan
con `import()` dinámico condicionado a `ENABLE_DEMO_DATA`, con un patrón
`ensureSeeded()`/`seedIfNeeded()` repetido en los cuatro servicios que
antes importaban `$lib/mock/*` de forma estática:

- `src/lib/services/eventsService.ts` (`$lib/mock/events`)
- `src/lib/services/organizersService.ts` (`$lib/mock/organizers`, `$lib/mock/documents`)
- `src/lib/services/updatesService.ts` (`$lib/mock/updates`)
- `src/lib/services/moderationService.ts` (`$lib/mock/reports`, `$lib/mock/auditLogs`)

Todos arrancan ahora con el array vacío (`loadPersisted(KEY, [])`) y solo
se siembran con datos ficticios si `ENABLE_DEMO_DATA` es `true` **y**
todavía no hay nada persistido. Con `ENABLE_DEMO_DATA=false`, la
aplicación arranca completamente vacía, tal como pide la Fase 8 (dato
verificado más abajo).

Las cuentas de demostración (`organizador@convoca.demo`,
`organizador2@convoca.demo`, `moderador@convoca.demo`, contraseña
`Convoca123!`) se aislaron en `src/lib/auth/demoAccounts.ts`, consumido
por `authService.ts` (siembra de cuentas) y `login/+page.svelte` (caja de
"cuentas de demostración" + autorrelleno), ambos gated por
`ENABLE_DEMO_DATA`/`ENABLE_DEV_TOOLS`.

### 3. Hallazgo crítico durante la verificación: el `import()` condicional NO basta

Mi primera implementación asumía que `if (ENABLE_DEMO_DATA) { await
import('./demoAccounts') }`, con `ENABLE_DEMO_DATA` conocido en tiempo de
compilación, bastaba para que el bundler eliminase esa rama entera —
incluidos los datos— del build de producción. **Esto era falso** y solo
se descubrió porque se hizo la comprobación empírica que pide la Fase 8
(build real + `grep` del resultado) en vez de asumir que "debería
funcionar":

1. Se generó un build con `PUBLIC_APP_ENV=production`,
   `PUBLIC_ENABLE_DEMO_DATA=false`.
2. `grep -r "Convoca123" .svelte-kit/output` **encontró la contraseña de
   demostración en texto plano** en un chunk público del cliente
   (`_app/immutable/chunks/CbhJvH212.js`) y en el bundle de servidor.

Causa raíz: Rollup crea un chunk físico para cualquier `import()` con
especificador estático **antes** de saber si la rama que lo contiene es
alcanzable en tiempo de ejecución; el `if` condicional no evita que el
archivo se genere y se publique como un archivo estático más,
descargable por cualquiera que conozca o adivine su URL — se ejecute o
no ese código en el navegador.

**Corrección aplicada:** la sustitución ahora ocurre en tiempo de
_bundling_, no en tiempo de ejecución. `authService.ts` y
`login/+page.svelte` importan un especificador virtual
(`convoca:demo-accounts`, tipado en
`src/lib/auth/demo-accounts-virtual.d.ts`) que `vite.config.ts` alía —
vía `resolve.alias`, leyendo `PUBLIC_APP_ENV` con `loadEnv()` — a
`demoAccounts.ts` (datos reales) o a `demoAccounts.empty.ts` (arrays
vacíos, mismo tipo) según el modo. Con este mecanismo, el chunk que
Rollup genera para producción **es** el archivo vacío: no hay ningún
punto del pipeline en el que el archivo real llegue a existir en el
output de producción.

Se usó un especificador virtual (no `$lib/auth/demoAccounts`) porque un
alias más específico no gana automáticamente sobre uno más genérico que
lo contiene como prefijo: el propio plugin de SvelteKit registra `$lib`
como alias, y en el array final de alias que resuelve Vite, `$lib` queda
antes que cualquier alias más específico añadido después, así que
`$lib/auth/demoAccounts` nunca llegaba a evaluarse. Un especificador sin
ningún solapamiento (`convoca:demo-accounts`) elimina el problema de raíz.

### 4. Verificación en vivo (Fase 8 adelantada para esta parte)

Comprobado con builds reales, no solo con lectura de código:

| Build                                                        | `grep` de `Convoca123!` / correos `*@convoca.demo` en `.svelte-kit/output` |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `PUBLIC_APP_ENV=development`, `PUBLIC_ENABLE_DEMO_DATA=true` | **Presente** (esperado: es un build de desarrollo)                         |
| `PUBLIC_APP_ENV=production`, `PUBLIC_ENABLE_DEMO_DATA=false` | **Ausente** (confirmado tras la corrección del punto 3)                    |

También comprobado con builds reales (no solo lectura de código):
`pnpm check` (0 errores, 15 avisos preexistentes no relacionados con
esta fase, sobre `$state` referenciado localmente en componentes que no
se han tocado), `pnpm lint` (limpio) y `pnpm build` (compila).

### 5. `pnpm test`

No existía ningún test runner. Se añadió `vitest` como dependencia de
desarrollo y un script `test`. Se escribieron pruebas reales (no un
placeholder) para la única lógica de autorización/visibilidad que existe
hoy sin backend — pensada explícitamente como especificación de
comportamiento a reproducir con políticas RLS reales en la Fase 4:

- `src/lib/utils/filterEvents.test.ts`: filtrado por texto, categoría,
  verificación y orden cronológico (función pura).
- `src/lib/services/eventsService.test.ts`: una cuenta no puede editar una
  convocatoria ajena aunque conozca su id (`OwnershipError`); una
  convocatoria en borrador/pendiente/oculta/rechazada nunca aparece en el
  listado público; una publicada sí aparece.

`pnpm test` → 10/10 pruebas en verde.

### 6. Lo que queda pendiente de esta fase (honesto)

- Este seguía siendo, hasta este punto, un sistema **sin backend real**:
  toda la persistencia sigue en `localStorage`, y la propiedad/autorización
  solo se comprueba en el cliente. Eso no cambia hasta la Fase 3 (Supabase)
  y la Fase 4 (RLS) — **no se declara nada de esto listo para producción
  todavía.**
- `organizersService.ts`, `updatesService.ts` y `moderationService.ts` no
  tenían pruebas dedicadas (solo `eventsService.ts` y `filterEvents.ts`);
  ampliar cobertura no era bloqueante para cerrar la Fase 2, pero queda
  pendiente antes de la Fase 8 completa.

---

## FASE 3 (parcial) — Cliente Supabase y esquema de base de datos

Decisión del usuario: proyecto de Supabase Cloud ya creado por él mismo.
Coloca `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` en
`/home/elias/Escritorio/convoca/.env` (ya tiene las claves correctas
esperando su valor; `.env.example` actualizado con nombres y valores
ficticios). La `secret key`/`service_role key` **nunca** debe ir en ese
archivo ni en ninguna variable `PUBLIC_*`.

### 1. Cliente

`src/lib/supabase/client.ts` — cliente único (`ssr = false`, no hace falta
uno de servidor), instanciado solo con la publishable key.
`src/lib/supabase/database.types.ts` — tipos escritos a mano a partir de
las migraciones de abajo (nota en el propio archivo: sustituir por
`supabase gen types typescript --linked` en cuanto haya CLI vinculada, para
que no puedan divergir del esquema real).

### 2. Migraciones creadas (`supabase/migrations/`), pendientes de aplicar

**No las he ejecutado yo contra tu proyecto** — no tengo ninguna forma de
conectar con tu base de datos real desde este entorno (sin credenciales de
servidor, sin CLI vinculada). Aplícalas tú, en este orden, pegando cada
archivo en el **SQL Editor** del panel de Supabase de tu proyecto:

| Archivo                                       | Qué crea                                                                                                                                                                        | ¿Borra algo? |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `0001_extensions_and_helpers.sql`             | `public.profiles` (rol de cada cuenta) + funciones auxiliares para las políticas RLS de las siguientes migraciones + un trigger que impide que una cuenta cambie su propio rol. | No           |
| `0002_organizers.sql`                         | `public.organizers` (perfil público) y `public.organizer_private_profiles` (datos privados).                                                                                    | No           |
| `0003_events.sql`                             | `public.events`, con RLS de propiedad/moderación (Fase 4) y el contador `published_events_count` mantenido automáticamente.                                                     | No           |
| `0004_event_updates.sql`                      | `public.event_updates`.                                                                                                                                                         | No           |
| `0005_reports_and_audit_logs.sql`             | `public.reports` y `public.audit_logs`.                                                                                                                                         | No           |
| `0006_verification_documents_and_storage.sql` | `public.verification_documents` + bucket privado de Storage `verification-documents` + políticas de acceso.                                                                     | No           |
| `0007_new_user_trigger.sql`                   | Trigger que, al registrarte, crea automáticamente tu fila en `profiles`, `organizers` y `organizer_private_profiles` a partir de los metadatos de `signUp(...)`.                | No           |

Todas son `create table` / `create policy` / `create function` /
`create trigger` sobre un proyecto nuevo: no hay ninguna sentencia
`drop`/`delete`/`truncate` en ninguna de las siete, y no hay datos previos
que perder. Ascender una cuenta a moderador/administrador se hace a mano,
después, con `update public.profiles set role = 'moderator' where id = '<uuid>';`
en el mismo SQL Editor (documentado también dentro de `0001_...sql`).

### 3. Bugs encontrados y corregidos en revisión manual (no probados en vivo)

No hay Docker/`psql` disponibles en esta máquina para levantar un Postgres
de prueba, así que estas migraciones están revisadas dos veces por mí a
mano, **no ejecutadas** contra ningún Postgres real todavía. Dos errores
que encontré y corregí en esa revisión:

- La política de lectura de `profiles` y el trigger que protege el rol
  hacían una subconsulta directa contra la propia tabla `profiles` desde
  dentro de una política RLS de `profiles` — el clásico error de
  "infinite recursion detected in policy" de Postgres. Corregido: ambas
  usan ahora la función `is_moderator_or_admin()` (`security definer`,
  que rompe el ciclo).
- Un comentario en `0002_organizers.sql` afirmaba que
  `published_events_count` se mantenía con un trigger que en realidad no
  había escrito. Corregido añadiendo el trigger real en
  `0003_events.sql` en vez de dejar el comentario falso.

**Dado que no se han ejecutado en vivo, pueden seguir teniendo errores que
solo aparecerán al aplicarlas.** Si algo falla al pegarlas en el SQL
Editor, dímelo con el mensaje de error exacto de Postgres y lo corrijo.

### 4. Lo que queda pendiente de Fase 3 (honesto)

- **El código de la app (`authService.ts`, `eventsService.ts`,
  `organizersService.ts`, `updatesService.ts`, `moderationService.ts`)
  todavía no habla con Supabase — sigue leyendo/escribiendo
  `localStorage`, exactamente igual que antes de esta fase.** Este
  esquema es la base sobre la que se conectará, pero la sustitución del
  código en sí es el siguiente paso, no algo ya hecho.
- Cambiar `authService.ts` a Supabase real implica un cambio de contrato:
  con confirmación de correo obligatoria (lo que pide la Fase 3),
  `signUp()` no puede devolver una sesión inmediatamente como hace hoy el
  mock — hay que avisar de "revisa tu correo" en vez de redirigir. Toca
  `src/lib/auth/types.ts` y `src/routes/registro/+page.svelte`, entre
  otros. Todavía no se ha hecho.
- **No se declara nada de esto listo para producción**: sigue habiendo
  autenticación mock en el código que corre hoy, y las políticas RLS de
  este esquema no protegen nada todavía porque el código de la app no las
  usa. Esto se actualizará en cuanto avance la sustitución real del
  código.

---

## Estado de las fases siguientes

Ver las secciones más abajo, que se añaden a medida que se ejecuta cada
fase. Cada una indica explícitamente qué se implementó, qué se verificó
en vivo (contra qué infraestructura) y qué queda pendiente.
