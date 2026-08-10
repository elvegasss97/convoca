# Arquitectura

Resumen de alto nivel. Para el detalle real, el código es la fuente de
verdad — esto es una guía de orientación, no una especificación exhaustiva.

## Flujo general

```
navegador
  │
  ▼
SvelteKit (sin sesión de servidor — ssr = false en las rutas relevantes)
  │
  ▼
Supabase
  ├── Auth (correo/contraseña, Google OAuth)
  ├── PostgREST (lectura/escritura de tablas vía API REST autogenerada)
  └── RPC (funciones de PostgreSQL invocadas como procedimientos)
        │
        ▼
      PostgreSQL
        ├── Row Level Security (RLS) en cada tabla — autorización real,
        │     no solo en el cliente
        ├── Funciones SECURITY DEFINER para agregados públicos y
        │     escrituras validadas
        └── Triggers (p. ej. alta automática de perfil al registrarse)
  │
  ▼
Edge Function `delete-account` (única función que usa un privilegio
elevado — `service_role` —, solo tras validar la sesión del usuario que
la invoca)
```

## Cliente

- SvelteKit, sin `hooks.server.ts` ni sesión de servidor — deliberado, no
  un descuido: simplifica el modelo de amenazas porque no hay estado de
  sesión que proteger en el servidor.
- Un único cliente de Supabase (`src/lib/supabase/client.ts`),
  instanciado solo con la clave pública (`publishable key`/`anon key`).
- Los guards de ruta por rol (`/organizador`, `/moderacion`, `/cuenta`)
  viven en `+page.ts` — protegen la navegación de la interfaz, no son el
  mecanismo real de autorización de datos.

## Backend

No existe un backend propio más allá de:

- Las funciones de PostgreSQL (`supabase/migrations/`) que exponen la API
  de lectura/escritura real.
- Una única Edge Function (`supabase/functions/delete-account/`).

Todo lo demás es Supabase gestionado: Auth, PostgREST, Storage.

## Base de datos

- PostgreSQL con RLS habilitada en cada tabla que contiene datos de
  usuario.
- Autorización por rol vía `is_moderator_or_admin()` y la columna `role`
  de `profiles`, nunca por un campo que el cliente controle.
- Funciones agregadas de participación (`get_concern_results` y
  similares) aplican protección de grupos pequeños: si una categoría
  tiene muy pocas respuestas, se suprime la distribución completa de esa
  agrupación, no solo la celda afectada — evita que un total público
  conocido permita reconstruir por resta un valor que debería quedar
  oculto.
- El historial completo de cambios de esquema vive en
  `supabase/migrations/`, aplicable desde cero a cualquier proyecto
  Supabase propio.

## CI / seguridad

- `.github/workflows/security-baseline.yml` corre en cada PR y en cada
  push a `main`. No necesita ningún secreto ni acceso a infraestructura
  real — todos los checks contra base de datos usan una réplica de
  Postgres desechable (Docker), nunca un proyecto Supabase real.
- Los scripts viven en `scripts/security/` — son el propio control, no
  solo su descripción.

## Qué NO vive en el repositorio

- Ningún dato de participación ciudadana, convocatoria real, o cuenta de
  usuario — todo eso vive exclusivamente en la base de datos de cada
  instancia (staging, producción, o la tuya propia), nunca en el código.
- Ninguna credencial ni identificador de infraestructura real de la
  instancia oficial de CONVOCA.
