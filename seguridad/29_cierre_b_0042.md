# 29 — Cierre del Bloque B: reconciliación de migraciones + aplicación de 0042

**Estado:** Bloque B cerrado y validado según su alcance. Informe factual de cierre — no introduce ningún cambio nuevo de código, SQL, Supabase, Vercel ni staging.

---

## 1. Objetivo del Bloque B

Poner al día, de forma segura y verificada, el historial de migraciones de producción (`supabase_migrations.schema_migrations`) y aplicar la migración de endurecimiento de permisos `0042`, que estaba diseñada y validada en staging desde antes de este bloque pero nunca se había podido versionar ni aplicar por vía oficial (`supabase db push`) debido a que el tracking de migraciones en producción estaba desactualizado y la cadena local no era reproducible desde cero.

## 2. Qué corregía 0042

Migración `supabase/migrations/0042_security_hardening_review3.sql`, no destructiva (solo `GRANT`/`REVOKE` y `CREATE OR REPLACE FUNCTION` sobre 2 funciones existentes, sin tocar tablas, columnas ni filas):

- **23 funciones RPC** con permisos de ejecución corregidos:
  - 12 de escritura privada (participación/voto atribuida a `auth.uid()`): `EXECUTE` revocado de `anon`, concedido solo a `authenticated`.
  - 11 de lectura pública agregada (conteos/promedios usados por páginas públicas sin sesión): `EXECUTE` concedido explícitamente a `anon` y `authenticated`, sin depender de `PUBLIC`.
- **H-02:** validación de catálogo cerrado de `option_code` en `set_concern_listening_priorities` y `set_concern_listening_detail` (categoría "Vivienda"), con `search_path` endurecido a `''` y rechazo explícito (fail-closed) de cualquier categoría no soportada. La categoría "Sanidad" usa un mecanismo distinto (migración `0037`) y no fue tocada por `0042`.

## 3. Estado previo relevante

Antes de este bloque: `0042` existía únicamente como archivo candidato (`seguridad/08_migracion_candidata_0042.sql`), validada funcionalmente en `convoca-staging` pero nunca versionada como migración real ni aplicada a producción. El tracking de migraciones en producción (`schema_migrations`) estaba desactualizado desde la migración `0025` — las migraciones `0026`-`0041` existían de hecho en el esquema y los datos de producción, pero sin registro en la tabla de control, por haber llegado ahí fuera del flujo de `supabase db push`.

## 4. Reconciliación previa de migraciones

Antes de tocar `0042`, se reconstruyó el tracking de producción en fases sucesivas, cada una con gates de solo lectura y snapshots antes de escribir:

- **25 timestamps antiguos:** confirmados como el único contenido real de `schema_migrations` en producción al inicio del bloque (`version` en formato timestamp de 14 dígitos, cubriendo `0001`-`0025` por nombre).
- **Clean-room `0001`→`0041`:** verificado que el historial completo de migraciones locales se puede reconstruir desde una base vacía. Encontrado y diagnosticado un problema de reproducibilidad en `0040`/`0041` (dependían de contenido — un tema y sus medidas/fases — creado vía aplicación, no vía migración).
- **Saneamiento de `0040`/`0041`:** ambos archivos históricos recibieron una guarda `DO $$ IF EXISTS(...) THEN ... END IF; END $$;` que hace su `INSERT` de datos condicional a que el contenido padre exista, sin alterar su efecto donde ese contenido ya existe (staging/producción). Cambio mínimo, revisado, mergeado a `main` tras un `db diff --linked` real que confirmó que el único diff resultante era ACL de plataforma Supabase (irrelevante para este bloque).
- **Reconciliación final 41/41:** con las 25 filas antiguas respaldadas (snapshot completo, todas las columnas) y un backup lógico del esquema ya en su sitio, se ejecutó `supabase migration repair` en dos pasos explícitos (nunca con versión implícita ni `--include-all`): primero se marcaron `0001`-`0041` como `applied` (estado intermedio de 66 filas), después se marcaron las 25 versiones timestamp como `reverted`. Resultado verificado: 41 filas, `0001`-`0041`, `migration list --linked` con `LOCAL == REMOTE` exacto.

## 5. Aplicación de 0042

Con el historial ya coherente, `0042` se materializó como migración real (copia byte a byte de la candidata, verificada por diff y SHA-256), junto con su rollback (`seguridad/18_rollback_0042.sql`, extraído literal de un plan de promoción anterior y revalidado contra la definición real de producción). Tras un último pre-check completo (proyecto enlazado, estado de git, tracking, dry-run, diagnóstico H-02, ACL previo), se aplicó con `supabase db push --linked` — una sola ejecución, sin flags adicionales, exit 0.

## 6. Tabla final de gates

| Gate | Resultado |
|---|---|
| PRE-B2 | PASS |
| `db push` (aplicación de `0042`) | PASS |
| Tracking `42/42` (`0001`→`0042`, LOCAL == REMOTE) | PASS |
| 12 RPC privadas (`anon`=false, `authenticated`=true) | PASS (12/12) |
| 11 RPC públicas (`anon`=true, `authenticated`=true) | PASS (11/11) |
| H-02 (definiciones + histórico) | PASS |
| Estructura/RLS (47 tablas, 47 con RLS, 43 funciones, 93 policies) | PASS |
| Páginas públicas (smoke test, 4/4 HTTP 200) | PASS |
| Dry-run posterior | PASS (vacío — "Remote database is up to date") |

Total ACL verificado tras la aplicación: **23/23** según diseño.

## 7. Rollback

`seguridad/18_rollback_0042.sql` queda disponible, versionado en `main`, validado sintácticamente contra una réplica desechable del esquema — **no se ha ejecutado**. No se detectó ninguna regresión que lo justificara.

## 8. Backups y snapshots existentes

Conservados, fuera del repositorio, con permisos restrictivos:

- Snapshot de `schema_migrations` previo a toda reconciliación (25 filas).
- Snapshot intermedio tras la reconciliación de migraciones (41 filas).
- Snapshot posterior a la aplicación de `0042` (42 filas).
- Backup lógico del esquema `public` (solo estructura, sin datos).

Ninguno de estos archivos se ha incluido en este repositorio ni contiene credenciales, tokens ni connection strings.

## 9. Riesgos residuales — explícitamente fuera del alcance del Bloque B

Los siguientes puntos están identificados y documentados en sus propios planes, pero **no se abordan ni se dan por resueltos en este cierre**:

- **Security Baseline P0** aún no implementada.
- **Modelo de privacidad de participación** aún pendiente de decisión/implementación.
- **Open Source Readiness** aún pendiente.
- Cualquier otro hallazgo o decisión ya registrado en sus respectivos documentos de `seguridad/`, no repetido aquí.

Este documento no declara que CONVOCA sea "100% segura" ni que no queden trabajos pendientes. **Bloque B cerrado y validado según su alcance.**
