# Contribuir a CONVOCA

Gracias por el interés. Esto es deliberadamente sencillo — no hace falta
ningún proceso de admisión previo para abrir un Issue o un PR.

## Flujo

1. Haz un fork del repositorio.
2. Crea una rama descriptiva a partir de `main`.
3. Instala dependencias: `pnpm install`.
4. Haz tu cambio.
5. Ejecuta localmente antes de abrir el PR:
   ```sh
   pnpm test
   pnpm check
   pnpm lint
   pnpm security:baseline
   ```
6. Si tu cambio toca `supabase/migrations/`, aplícalo contra **tu propio
   proyecto Supabase**, nunca contra la instancia oficial de CONVOCA, y
   confirma que `supabase db push` reconstruye el esquema desde cero sin
   errores.
7. Abre el PR contra `main`. La Security Baseline P0 correrá
   automáticamente en CI — no necesita ningún secreto ni acceso a
   infraestructura privada para hacerlo.
8. Espera la revisión. Cambios que toquen categorías sensibles (ver abajo)
   necesitan una revisión defensiva explícita antes de fusionarse, no solo
   la aprobación habitual.

## Qué no incluir nunca en un PR

- Secretos, tokens, claves o credenciales de ningún tipo — reales o de
  ejemplo con forma de reales.
- Datos de participación ciudadana reales, exports o dumps de cualquier
  base de datos.
- Tests que se conecten a `convoca.cloud` o a cualquier proyecto Supabase
  que no sea tuyo.

## Cambios de seguridad requieren justificación

Cualquier PR que module RLS, cree o modifique una función
`SECURITY DEFINER`, toque `supabase/functions/` (Edge Functions), o
cambie qué columnas expone una función pública, debe explicar en la
descripción del PR:

- por qué es necesario;
- qué se comprobó (idealmente contra una réplica desechable propia, no
  solo por lectura de código);
- qué pasaría si el cambio estuviera mal.

Una función `SECURITY DEFINER` nueva o modificada debe pasar el gate
correspondiente de la Security Baseline (`check-security-definer.mjs`) —
si el CI lo marca como pendiente de revisión, el mensaje del propio check
indica exactamente qué trailer de commit hace falta añadir una vez hecha
esa revisión.

## Qué esperar como respuesta

Este proyecto lo mantiene una única persona. La revisión puede tardar —
no forma parte de un proceso de gobernanza formal todavía. Si tu cambio
es significativo, considera abrir primero un Issue para discutir el
enfoque antes de invertir tiempo en la implementación completa.

## Reportar vulnerabilidades

**No en un Issue ni un PR.** Lee [`SECURITY.md`](SECURITY.md).
