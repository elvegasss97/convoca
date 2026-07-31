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

| Elemento | Ubicación |
|---|---|
| Contrato de servicio (`AuthService`, `User`, `UserSession`, `OrganizerPrivateProfile`) | `src/lib/auth/types.ts` |
| Implementación mock (localStorage) | `src/lib/auth/authService.ts` |
| "Hash" de contraseña (SHA-256 puro en JS, sin backend) | `src/lib/auth/mockHash.ts` |
| Estado de sesión reactivo compartido | `src/lib/auth/session.svelte.ts` |
| Generador de ids sin `crypto.randomUUID` | `src/lib/utils/id.ts` |

La propia implementación ya se documenta a sí misma como insegura (comentarios
`⚠️ NO ES SEGURO` en las cabeceras de `authService.ts` y `mockHash.ts`), pero
sigue siendo código que se ejecuta en el navegador de cualquier visitante.

#### localStorage: claves usadas y qué contienen

Todas bajo el prefijo `convoca:mock:v1:*` (namespace en
`src/lib/utils/persistedArray.ts`), más una clave de sesión aparte:

| Clave | Contenido | Sensibilidad |
|---|---|---|
| `convoca:mock:v1:auth-accounts` | Cuentas: email, rol, **hash + sal de contraseña** | Alta (aunque el hash sea "solo mock") |
| `convoca:mock:v1:auth-session` | Sesión activa: usuario, token, expiración | Alta |
| `convoca:mock:v1:auth-organizer-profiles` | Perfil privado del organizador (nombre legal de la organización) | Media |
| `convoca:mock:v1:events` | Convocatorias (incluidas en borrador/pendientes) | Media |
| `convoca:mock:v1:event-updates` | Actualizaciones de organizador | Baja |
| `convoca:mock:v1:reports` | Reportes de convocatorias | Media |
| `convoca:mock:v1:audit-logs` | Registro de decisiones de moderación | Media |
| `convoca:mock:v1:organizers` | Perfil público de organizador | Baja (es público por diseño) |
| `convoca:my-attendance` | Asistencia ("voy"/"me interesa") del propio navegador | Media (aunque no identifica a nadie más) |

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
`cities.ts`. Se usan como *seed* inicial de los servicios mock
(`src/lib/services/*.ts`) y no tienen ninguna marca `PUBLIC_ENABLE_DEMO_DATA`
todavía — la Fase 2 la añade.

#### Funciones solo-desarrollo

| Función | Archivo | Guard actual |
|---|---|---|
| Botón "Reset datos (dev)" (borra localStorage y recarga) | `src/lib/components/dev/DevResetButton.svelte`, montado desde `src/routes/+layout.svelte` | `{#if import.meta.env.DEV}` |
| Credenciales de demo visibles + autorrelleno | `src/routes/login/+page.svelte` | `{#if import.meta.env.DEV}` |

#### Rutas por rol

| Ruta | Rol requerido | Guard actual | Dónde |
|---|---|---|---|
| `/organizador` | `organizer` o `admin` | `+page.ts` → `redirect(303, /login?redirect=...)` si no cumple | `src/routes/organizador/+page.ts` |
| `/moderacion` | `moderator` o `admin` | igual que arriba | `src/routes/moderacion/+page.ts` |
| `/cuenta` | cualquier sesión | igual | `src/routes/cuenta/+page.ts` |
| `/crear` | ninguno para rellenar; sí para enviar (con guardado de borrador) | comprobación en el propio componente | `src/routes/crear/+page.svelte` |

**Importante:** estos guards viven en `+page.ts` (código de **cliente**,
la app corre con `ssr = false`, ver `src/routes/+layout.ts`). Protegen la
*navegación dentro de la interfaz*, pero no protegen nada a nivel de datos:
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
- `src/lib/mock/*.ts` — pasan a usarse **solo como *seed* de
  desarrollo/staging** (Fase 2), nunca importados por código que se
  ejecute cuando `PUBLIC_ENABLE_DEMO_DATA=false`.

---

## Estado de las fases siguientes

Ver las secciones más abajo, que se añaden a medida que se ejecuta cada
fase. Cada una indica explícitamente qué se implementó, qué se verificó
en vivo (contra qué infraestructura) y qué queda pendiente.
