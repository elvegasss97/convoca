# 44 — Revisión 0044-R2 (concurrencia, ACL, normalización, datos históricos)

**Estado: SOLO REVISIÓN. Nada de esto se ha aplicado en Supabase/Vercel/producción, ni en staging. No se ha movido `0044` a `supabase/migrations/`. No hay commit ni PR.**

Continúa `seguridad/41_post_review_hardening_plan.md` (plan original, R1) y la candidata `seguridad/42_migracion_candidata_0044.sql` / `seguridad/43_rollback_0044_candidata.sql`. Esta revisión (R2) somete la propia candidata a un escrutinio adicional pedido explícitamente antes de llevarla a staging: concurrencia real, superficie de ACL, normalización de `p_community`, datos históricos, y una prueba de round-trip completa del rollback. `seguridad/42` y `seguridad/43` ya quedan actualizados con el resultado de esta revisión (no son un "R2 aparte": son la candidata única, ya corregida).

**Entorno de prueba:** Postgres desechable y aislado (contenedor Docker `public.ecr.aws/supabase/postgres:17.6.1.155` — la misma imagen que usa `supabase start`/`supabase db diff` en este repo), con las 43 migraciones reales del repo aplicadas en orden, datos sintéticos, y `auth.uid()` simulado mediante la misma GUC (`request.jwt.claim.sub`) que usa PostgREST en producción — es la implementación real de `auth.uid()` de este stack, no un stub. Completamente desconectado del proyecto Supabase enlazado (`supabase/.temp/linked-project.json`) — nunca se tocó ese proyecto. Contenedor destruido al terminar esta revisión.

---

## 1. Concurrencia y carrera en el rate limiter

**Confirmado empíricamente: la carrera existe y es trivial de explotar.**

La R1 hacía `INSERT write_rate_limits` → `COUNT` ventana → `RAISE` si supera el límite, sin ningún tipo de bloqueo. Bajo `READ COMMITTED` (el nivel por defecto de Postgres), una transacción no ve las filas insertadas-pero-no-comprometidas-todavía de otra transacción concurrente. Con conexiones simuladas mediante `docker exec` secuenciales (con overhead de arranque de proceso) el problema no se manifestaba — parecía funcionar. La prueba válida requiere conexiones **ya establecidas** disparando el `INSERT` al mismo tiempo real: se usó `pgbench -c N -j N -t 1` con un script `.sql` de una sola sentencia (mismo patrón de "una sentencia = una transacción implícita" que ya usa la app).

**Resultado con el diseño original (sin lock), límite de ráfaga 3/min:**

| Prueba | Resultado |
|---|---|
| 10 `reports` concurrentes, mismo usuario (10 conexiones pre-establecidas, disparadas a la vez) | **10/10 aceptados** — el límite de 3/min quedó completamente sin efecto |

**Corrección aplicada:** `pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(action))` como primera sentencia de `enforce_write_rate_limit()`, antes del `INSERT`. Es de ámbito de **transacción** (`_xact_`, no de sesión): se libera automáticamente al `COMMIT`/`ROLLBACK` de la propia inserción que lo adquirió, sin desbloqueo manual y sin riesgo de dejarlo colgado. Se usa la variante de dos claves de 32 bits (`hashtext` de usuario y de acción por separado, no concatenados) precisamente para que sean dos claves independientes dentro del mismo espacio de locks, en vez de una única clave combinada — así una colisión de hash en una de las dos dimensiones no acopla accidentalmente usuarios o acciones que no deberían bloquearse entre sí.

**Resultado tras la corrección (repetido 3 veces, sin fallos):**

| Prueba | Resultado esperado | Resultado obtenido |
|---|---|---|
| 10 `reports` concurrentes, mismo usuario (×3 rondas) | 3 OK, 7 FAIL | **3 OK, 7 FAIL** en las 3 rondas |
| Usuario1 (10 `reports`) y Usuario2 (10 `reports`) lanzados a la vez | 3 OK cada uno, sin interferencia | **3 OK / 3 OK**, independientes |
| Usuario1: 10 `reports` + 5 `concern_proposals` a la vez | 3 OK / 1 OK, sin bloqueo cruzado, total ~100ms | **3 OK / 1 OK en 110ms** (no serializado entre acciones) |

Cumple los 4 requisitos pedidos: mismo usuario+acción no puede saltarse el límite con concurrencia; usuarios distintos no se bloquean; acciones distintas no se bloquean (ni siquiera entre sí del mismo usuario); no hay lock global (los locks activos en cualquier momento son como máximo tantos como pares `(usuario, acción)` en vuelo simultáneamente).

**Nota relacionada, fuera de alcance de esta revisión:** `set_attendance()` (`0014_fix_attendance_rate_limit.sql`) usa el mismo patrón `INSERT → COUNT → RAISE` sin ningún lock, y por tanto tiene previsiblemente la misma carrera (no se ha probado empíricamente porque no forma parte de `0044` ni se pidió tocarlo). Se deja constancia aquí como hallazgo colateral para una futura revisión — no se modifica `0014` en esta revisión.

---

## 2. ACL de `write_rate_limits`

**Confirmado: la tabla nacía con una concesión completa a `anon`/`authenticated` sin usar.**

`pg_default_acl` en este proyecto tiene una regla de privilegios por defecto sobre el esquema `public` que concede automáticamente `arwdDxtm` (todos los privilegios de tabla) a `anon`, `authenticated` y `service_role` en **cualquier tabla nueva** — confirmado por consulta directa a `pg_default_acl`, no es una suposición. `write_rate_limits`, al crearse, heredó esa concesión completa igual que cualquier otra tabla del proyecto.

**Antes del `REVOKE` explícito**, la única barrera real era RLS-habilitada-sin-políticas (deniega todo a quien no sea el propietario), que en la práctica sí bloqueaba: un `SELECT` directo como `authenticated` devolvía 0 filas (sin error) y un `INSERT` directo fallaba con `new row violates row-level security policy`. Funcionalmente correcto, pero como capa única es frágil: si en el futuro alguien añadiera cualquier política a esta tabla por otro motivo, la concesión de tabla de fondo seguiría ahí, completamente abierta.

**Con `REVOKE ALL ON public.write_rate_limits FROM PUBLIC, anon, authenticated` añadido:**

| Prueba | Antes del REVOKE | Después del REVOKE |
|---|---|---|
| `SELECT` directo como `authenticated` | 0 filas (RLS, sin error) | `ERROR: permission denied for table write_rate_limits` |
| `INSERT` directo como `authenticated` | `ERROR: new row violates row-level security policy` | `ERROR: permission denied for table write_rate_limits` |
| `SELECT` directo como `anon` | (no probado en R1) | `ERROR: permission denied for table write_rate_limits` |
| Los 3 triggers `BEFORE INSERT` (`enforce_*_rate_limit`) siguen insertando en `write_rate_limits` a través de `enforce_write_rate_limit()` | — | **Sí, sin cambios** — la función es `SECURITY DEFINER`, propiedad de `supabase_admin`; ejecuta con los privilegios del propietario, no del invocador, así que el `REVOKE` sobre `anon`/`authenticated` no le afecta |

Defensa en profundidad real ahora: dos capas independientes (ACL cerrada + RLS sin políticas), en vez de depender solo de la segunda.

---

## 3. Normalización de `p_community`

**Confirmado un defecto real de la R1**, no solo una mejora cosmética: la normalización (`trim` + `''` → `NULL`) ocurría **después** de la validación contra el catálogo, solo en el momento de insertar. Efecto práctico: `' Cataluña '` (con espacios incidentales de un cliente, por ejemplo un `<select>` con contenido pegado) se **rechazaba** como si fuera una categoría inventada, en vez de aceptarse como el valor válido que realmente es; y `''` se validaba contra el catálogo como si fuera un valor real (aunque en la práctica `''` no está en la lista, así que también se rechazaba, en vez de tratarse como "sin valor").

**Corrección:** `p_community := nullif(trim(p_community), '');` movido al principio del bloque, antes del `if ... not in (...)`.

**Catálogo verificado carácter a carácter contra `src/lib/data/regions.ts`:** 19 entradas exactas — 17 comunidades autónomas + Ciudad de Ceuta + Ciudad de Melilla. Confirmado que `0044` ya usaba el listado correcto (el error de "20" solo estaba en el comentario de `0043`, nunca en el código ejecutable) — el comentario ya queda corregido en `seguridad/42`.

**Pruebas (contra el catálogo real, dentro de una ronda `open` sintética):**

| Entrada | Resultado |
|---|---|
| `NULL` | Aceptado |
| `''` | Aceptado, guardado como `NULL` |
| `'   '` (solo espacios) | Aceptado, guardado como `NULL` |
| `'  Cataluña  '` (espacios alrededor de un valor válido) | Aceptado, guardado como `'Cataluña'` (normalizado) |
| Las 19 entradas exactas del catálogo, una a una | **Las 19 aceptadas sin error** |
| `'categoria_inventada'` / `'Reino de Redania'` | Rechazado: `Selecciona una comunidad autónoma válida.` |

---

## 4. Datos históricos — precheck de solo lectura

**Diseñado y ejecutado solo en local/disposable, con datos sintéticos** (no hay acceso a staging/producción desde este entorno, y no estaba autorizado tocarlos). Clasifica `concern_listening_survey_responses.community` en `VALID` / `NULL` / `INVALID` contra el catálogo de 19, sin modificar ninguna fila (dos `SELECT`, ningún `UPDATE`/`DELETE`).

La consulta clasificó 6 filas en total presentes en la tabla en ese momento: 5 insertadas directamente para esta prueba (simulando datos anteriores a cualquier validación, saltándose la RPC a propósito) más 1 fila ya existente de una prueba anterior en la misma sesión (§3, normalización de `p_community`). Resultado: `2 VALID / 1 NULL / 3 INVALID` (`'Madrid'`, `'catalunya'`, `'zona_inventada_ataque'`) — clasificación correcta en los tres casos, incluida la distinción entre una variante de capitalización/acentuación (`'catalunya'`) y un valor no territorial (`'Madrid'` sin el prefijo `'Comunidad de'`) frente a un valor claramente ajeno.

La consulta completa queda preparada en el propio `seguridad/44` (bloque de abajo) para poder ejecutarse contra staging/producción **en un paso posterior, explícitamente autorizado** — no se ejecuta contra esos entornos como parte de esta revisión.

```sql
-- LISTO PARA staging/producción cuando se autorice — NO ejecutar todavía.
-- READ-ONLY: dos SELECT, cero escrituras.
with clasificado as (
	select
		id, round_id, community,
		case
			when community is null then 'NULL'
			when community in (
				'Andalucía', 'Aragón', 'Principado de Asturias', 'Islas Baleares', 'Canarias',
				'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
				'Extremadura', 'Galicia', 'Comunidad de Madrid', 'Región de Murcia',
				'Comunidad Foral de Navarra', 'País Vasco', 'La Rioja', 'Ciudad de Ceuta', 'Ciudad de Melilla'
			) then 'VALID'
			else 'INVALID'
		end as clasificacion
	from public.concern_listening_survey_responses
)
select clasificacion, count(*) as filas from clasificado group by clasificacion order by clasificacion;
```

**Si el resultado real en staging/producción muestra `INVALID > 0`**, la decisión de qué hacer con esas filas (dejarlas tal cual, ya que `0044` solo cambia la validación hacia adelante y no exige retroactividad; o sanearlas) queda pendiente de ese resultado real — no se puede prejuzgar con datos sintéticos. `0044` en sí **no requiere** ningún saneamiento previo: al ser `CREATE OR REPLACE`, solo afecta a llamadas nuevas, nunca reescribe filas existentes.

---

## 5. `get_attendance_counts` — estados de `events` y `p_event_ids = NULL`

**11 estados reales** (`0003_events.sql`): `draft, pending_review, published, identity_verified, organization_verified, documentation_reviewed, modified, cancelled, completed, hidden, rejected`.

**Decisión: mantener el denylist** (`status not in ('draft','pending_review','hidden','rejected')`), no cambiar a allowlist. Motivo verificado, no supuesto: es la **misma expresión, carácter a carácter**, que ya usan `events_select_public` (política RLS, `0003`) y `set_attendance` (`0014`) para "visible públicamente" — la regla canónica del proyecto, ya duplicada en esos dos sitios antes de `0044`. Un allowlist en `get_attendance_counts` sería una tercera forma de expresar la misma regla, con riesgo real de desincronizarse silenciosamente de las otras dos si alguna cambia. El riesgo simétrico (un estado nuevo añadido sin actualizar los 3 sitios queda público por defecto, "fail-open") ya existe hoy en `events_select_public`/`set_attendance` — `0044` no lo introduce, solo iguala el tercer sitio a los otros dos. Se documenta como riesgo residual con un control de baseline propuesto (§10 de este documento) que lo detecta si diverge.

**Prueba con `p_event_ids = NULL` (el vector original: antes enumeraba todos los eventos, públicos o no):**

| Llamada (como `anon`) | Resultado |
|---|---|
| `get_attendance_counts()` (sin argumentos) | Solo el evento `published`, con sus conteos reales — **cero filas de los 4 eventos no públicos** |
| `get_attendance_counts(<array con los 4 IDs no públicos>)`, IDs obtenidos de antemano por un rol con privilegios (simulando que un atacante ya los conoce) | **0 filas** — ni siquiera conociendo el UUID exacto se obtiene nada |
| `get_attendance_counts(array['<id del evento publicado>'])` | Cuenta correcta, sin regresión frente al comportamiento original para eventos públicos |

---

## 6. Semántica del rate limit

**Confirmado: el `RAISE EXCEPTION` revierte también el `INSERT` en `write_rate_limits`**, porque ambos ocurren dentro de la misma sentencia/transacción implícita disparada por el `INSERT` original del cliente. Prueba directa: tras 10 intentos concurrentes con solo 3 aceptados, `select count(*) from write_rate_limits where action='reports'` da exactamente `3`, no `10` — la tabla nunca refleja intentos rechazados, solo aceptados. Confirmado también en secuencia (4 intentos, el 4º falla, la tabla queda en 3).

**Ventanas confirmadas como rolling (no fijas):** la condición es `called_at > now() - interval '1 minute'`/`'1 day'`, relativa al instante de la propia consulta, sin alinearse a ningún límite de reloj/calendario — es rolling por construcción, no por configuración. Prueba empírica: 3 intentos con `called_at` forzado a "hace 2 minutos" no cuentan para la ventana corta (un intento nuevo inmediatamente después se acepta), y el límite diario (15) se disparó correctamente al insertar directamente 15 filas repartidas en las últimas horas y luego intentar una 16ª.

**Límites mantenidos sin cambios** (`reports`/`channel_reports`: 3/min + 15/día; `concern_proposals`: 1/min + 5/día) — no se pidió ni se justificó cambiarlos.

**Mensaje corregido:** ambos casos (ráfaga y diario) usan ahora el mismo texto neutral — `'Has alcanzado el límite temporal para esta acción. Inténtalo de nuevo más tarde.'` — sin mencionar "mañana" para una ventana que en realidad es rolling de 24h desde el último intento aceptado, no desde medianoche.

---

## 7. Rollback — actualización y prueba de round-trip

`seguridad/43_rollback_0044_candidata.sql` queda actualizado para revertir también el advisory lock, el `REVOKE ALL` de ACL (implícito: el `DROP TABLE` se lleva la ACL entera consigo, no requiere un `GRANT` de vuelta porque la tabla no existía antes de `0044`) y la normalización de `p_community` — deja `set_concern_listening_survey_response` y `get_attendance_counts` exactamente en el texto que tenían tras `0043`.

**Prueba de round-trip completa, en el entorno desechable:**

1. Contenedor nuevo, limpio. Aplicadas las 43 migraciones reales del repo (`PRE`).
2. `pg_dump --schema-only --schema=public` de `PRE` (6136 líneas).
3. Aplicada `0044` (versión R2 completa: §1 sin cambios, §2 con normalización, §3 con advisory lock + REVOKE ALL) — sin errores.
4. Aplicado el rollback actualizado — sin errores.
5. `pg_dump --schema-only --schema=public` de `PRE + 0044 + rollback` (`POST_ROLLBACK`).
6. `diff PRE POST_ROLLBACK` (ignorando las dos líneas `\restrict`/`\unrestrict` que `pg_dump` genera con un token aleatorio distinto en cada ejecución, sin relación con el contenido del esquema): **diff vacío — esquema idéntico, incluidos los comentarios internos de la función (`-- Paso 1: ...` etc.)**.
7. Verificación adicional específica: `select jobname from cron.job` no incluye `purge-old-write-rate-limits` tras el rollback (solo quedan los dos jobs que ya existían en `PRE`); `to_regclass('public.write_rate_limits')` es `NULL`; no quedan triggers `enforce_*_rate_limit` en `pg_trigger`.

**Revierte correctamente:** las 2 funciones modificadas (a su texto exacto anterior), la tabla nueva, los 3 triggers, el cron job de purga, la función de purga, la función del trigger, y el ACL (por eliminación completa del objeto que lo llevaba).

---

## 8. Batería de tests disposable — resumen de resultados

Todos ejecutados en el mismo entorno desechable, con `0044`-R2 aplicada sobre las 43 migraciones reales.

**Attendance:**
- `p_event_ids = NULL` → solo el evento público, con conteos correctos — **PASS**
- IDs explícitos de los 4 estados no públicos (`draft`, `pending_review`, `hidden`, `rejected`) → 0 filas — **PASS**
- ID explícito del evento público → conteo correcto (1 going, 1 interested) — **PASS**

**Community:**
- Las 19 entradas del catálogo, una a una → todas aceptadas sin error — **PASS**
- `NULL`, `''`, `'   '` → aceptados, guardados como `NULL` — **PASS**
- Valor inventado → rechazado, ninguna fila con categoría inventada llega a persistirse — **PASS**

**Rate limits:**
- `reports`: intentos 1-3 aceptados, 4º rechazado (secuencial) — **PASS**
- `channel_reports`: mismo patrón — **PASS**
- `concern_proposals`: intento 1 aceptado, 2º rechazado — **PASS**
- Usuarios independientes (concurrentes, sin interferencia) — **PASS**
- Acciones independientes del mismo usuario (concurrentes, sin bloqueo cruzado) — **PASS**
- Expiración de ventana corta (intentos de hace 2 min no cuentan) — **PASS**
- Límite diario (15/día, 16º intento rechazado) — **PASS**
- Concurrencia real sin bypass (10 conexiones simultáneas reales, 3 rondas) — **PASS**
- Acceso directo a `write_rate_limits` bloqueado (`SELECT`/`INSERT` como `anon`/`authenticated`) tras el `REVOKE` — **PASS**

Ningún test falló en la versión final de `0044`-R2. Los tests de concurrencia y ACL sí fallaron contra la versión R1 sin corregir (documentado en §1 y §2) — es la evidencia de que el problema era real, no una hipótesis.

---

## 9. `SECURITY DEFINER` / grants — auditoría de todo lo creado o modificado

| Objeto | Owner | `SECURITY DEFINER` | `search_path` | `EXECUTE` concedido a |
|---|---|---|---|---|
| `get_attendance_counts` | rol de migración (`postgres` en el proyecto real) | sí | `public` (fijo) | `anon, authenticated, service_role` — igual que antes de `0044` (`CREATE OR REPLACE` conserva grants) |
| `set_concern_listening_survey_response` | rol de migración | sí | `public` (fijo) | `authenticated, service_role` (sin `anon`) — igual que antes de `0044` |
| `enforce_write_rate_limit` (función del trigger) | rol de migración | sí | `public` (fijo) | **Solo `service_role`** — `REVOKE` explícito de `public, anon, authenticated` (conservado de R1) |
| `purge_old_write_rate_limits` | rol de migración | sí | `public` (fijo) | **Solo `service_role`** — mismo `REVOKE` explícito |

Los 4 tienen `search_path` fijado explícitamente a `public` (previene *search_path hijacking*, mismo patrón que el resto de funciones del proyecto). Ningún grant preexistente de `get_attendance_counts` ni `set_concern_listening_survey_response` se pierde ni se amplía — `CREATE OR REPLACE FUNCTION` conserva los grants existentes mientras no cambie la firma, y no cambia. La tabla `write_rate_limits` tiene RLS habilitada, sin políticas propias, y ahora además ACL cerrada (§2) — los triggers `SECURITY DEFINER` la usan sin verse afectados por ese cierre, porque ejecutan con los privilegios del propietario de la función, no del invocador.

---

## 10. Security Baseline — controles propuestos (no aplicados al script real)

**No se ha modificado ningún archivo de `scripts/security/` ni `security-baseline/`** — los entregables autorizados de esta revisión son únicamente `seguridad/41`, `42`, `43` y este `44` (ver §11). Lo que sigue es la propuesta lista para copiar cuando se decida aplicarla.

**Ya cubierto sin cambios, por los checks existentes, en cuanto `0044` se mueva a `supabase/migrations/`:**
- `check-migrations-structure.mjs` (control B1) ya exige que toda tabla nueva tenga `enable row level security` en el mismo PR — cubre `write_rate_limits` sin ningún cambio.
- `check-security-definer.mjs` (control B9) ya exige un override explícito por nombre para cualquier función `SECURITY DEFINER` nueva o modificada — cubre las 4 funciones de `0044` sin ningún cambio.

**Propuesta de adición 1 — registrar los 3 triggers nuevos en el manifest B9b** (`security-baseline/manifests/critical-triggers.json`), para que además de exigir el override genérico de B9, el check identifique estos triggers por nombre igual que ya hace con `profiles_prevent_role_self_update`:

```json
{
	"trigger": "enforce_reports_rate_limit",
	"function": "enforce_write_rate_limit",
	"table": "public.reports",
	"definedIn": "supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql",
	"why": "Único mecanismo que impide que una cuenta autenticada sature la cola de moderación con reportes. Ver seguridad/44_revision_0044_r2.md §1 para la carrera de concurrencia que corrige el advisory lock."
},
{
	"trigger": "enforce_channel_reports_rate_limit",
	"function": "enforce_write_rate_limit",
	"table": "public.channel_reports",
	"definedIn": "supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql",
	"why": "Mismo mecanismo que enforce_reports_rate_limit, para reportes de canal."
},
{
	"trigger": "enforce_concern_proposals_rate_limit",
	"function": "enforce_write_rate_limit",
	"table": "public.concern_proposals",
	"definedIn": "supabase/migrations/0044_post_review_abuse_and_visibility_hardening.sql",
	"why": "Mismo mecanismo, límite más estricto (1/min, 5/día) para propuestas ciudadanas."
}
```

**Propuesta de adición 2 — 4 aserciones de texto nuevas**, específicas de los hallazgos concretos de `41`/`44` (no genéricas, porque B1/B9 ya cubren lo genérico), como *tripwire* barato en `check-migrations-structure.mjs` o un script `check-0044-*.mjs` dedicado — comprobación de texto sobre el contenido de la migración, sin levantar ningún stack:

1. La definición de `write_rate_limits` en las migraciones debe contener `revoke all on public.write_rate_limits from public, anon, authenticated` (o equivalente) — detecta si alguien quita el `REVOKE` en un cambio futuro.
2. La definición de `enforce_write_rate_limit` debe contener `pg_advisory_xact_lock` — detecta si alguien reintroduce el patrón `INSERT→COUNT` sin lock.
3. La definición de `set_concern_listening_survey_response` debe seguir conteniendo el catálogo cerrado de 19 comunidades (`p_community not in (` con las 19 literales) — detecta si el catálogo se relaja accidentalmente.
4. La definición de `get_attendance_counts` debe seguir conteniendo `status not in` con los 4 estados no públicos — detecta si el filtro se pierde en un refactor futuro.

Se propone como **script manual bajo demanda** antes de promover a producción (igual que ya se hizo para `0043`), no integrado en `pnpm security:baseline` de cada PR — una verificación funcional real (llamar de verdad a las funciones con una sesión simulada) requeriría un stack local completo, mismo esfuerzo que el propio `0044`-R2 ya hizo aquí una vez; repetirlo en cada push sería lento y desproporcionado para lo que detecta.

---

## Resumen ejecutivo

| Área | R1 | R2 |
|---|---|---|
| Concurrencia del rate limiter | Carrera real confirmada (10/10 bypass) | Corregida con `pg_advisory_xact_lock`, verificada en 3 escenarios × 3 rondas |
| ACL de `write_rate_limits` | Abierta a `anon`/`authenticated` (mitigada solo por RLS-sin-políticas) | `REVOKE ALL` explícito, verificado que no rompe los triggers |
| Normalización de `p_community` | Ocurría después de validar (rechazaba valores válidos con espacios) | Movida antes de validar, 19/19 valores aceptados |
| Datos históricos | No evaluado | Precheck read-only diseñado y probado en local; listo para staging/producción, no ejecutado ahí |
| Estados de `events` | Denylist, sin justificar explícitamente | Denylist confirmado como decisión correcta (coherencia con RLS/`set_attendance`), `p_event_ids=NULL` probado sin fugas |
| Semántica del rate limit | Rollback-on-exception y rolling window, no verificados explícitamente | Ambos confirmados empíricamente; mensaje corregido (sin "mañana") |
| Rollback | Existía, no probado | Actualizado y probado en round-trip completo — diff vacío contra el `PRE` |
| Tests disposable | No ejecutados | Batería completa ejecutada, todo `PASS` en la versión final |
| `SECURITY DEFINER`/grants | No auditado formalmente | Auditado — sin grants rotos ni ampliados |
| Security baseline | Sin propuesta concreta | 2 propuestas listas (manifest B9b + 4 aserciones de texto), no aplicadas al repo |

No se ha movido `0044` a `supabase/migrations/`. No se ha tocado staging. No se ha tocado producción. No se ha hecho deploy. No se ha hecho commit. No se ha abierto PR.

# 0044-R2 — CANDIDATA VALIDADA PARA STAGING
