# 41 — Plan de hardening post-revisión (Kimi → Claude, seguimiento)

**Estado: SOLO PLAN. Nada de esto se ha implementado, comiteado, ni tocado en Supabase/Vercel/producción.** Continúa la revisión cruzada resumida en el hilo "REVISIÓN KIMI — HALLAZGOS VERIFICADOS" (post `seguridad/40_open_source_publication.md`).

**Actualización:** antes de llevar la migración candidata `0044` (§E de este documento) a staging, se hizo una revisión adicional sobre la propia candidata — concurrencia real del rate limiter, ACL de la tabla nueva, normalización de `p_community`, datos históricos y una prueba de round-trip del rollback. Ver **`seguridad/44_revision_0044_r2.md`** para el resultado completo (encontró y corrigió una carrera real en el rate limiter, entre otros ajustes). `seguridad/42_migracion_candidata_0044.sql` y `seguridad/43_rollback_0044_candidata.sql` ya reflejan esa revisión — no son un plan alternativo, son la candidata única, actualizada. El resto de este documento (§A-§G) describe el análisis original que dio origen a la candidata y sigue siendo válido como contexto.

## Tabla resumen

| Hallazgo | Estado | Severidad | Parche propuesto |
|---|---|---|---|
| `is_moderator_or_admin` — escalada de privilegios | REFUTADO | N/A | Ninguno — no tocar |
| `delete-account` — atomicidad | REFUTADO (seguridad) | N/A | Ninguno — el diseño atómico ya es correcto |
| `delete-account` — mensaje de error impreciso | CONFIRMADO (UX, no seguridad) | BAJA | Generalizar el texto (§D) |
| `get_attendance_counts` — no filtra estado del evento | CONFIRMADO | BAJA | `0044` §1 (§B) |
| `p_community` en `set_concern_listening_survey_response` — sin catálogo cerrado | CONFIRMADO | BAJA-MEDIA (disponibilidad/integridad, no privacidad) | `0044` §2 (§A) |
| `p_community` en `set_concern_listening_context`/`set_participant_context` (0031/0032) | REFUTADO como vector — no alimenta ningún agregado público | N/A | Ninguno |
| `reports`/`channel_reports` sin límite de frecuencia | CONFIRMADO | MEDIA | `0044` §3 (§C) |
| `concern_proposals` sin límite de frecuencia | CONFIRMADO | BAJA-MEDIA | `0044` §3 (§C) |

---

## A. `p_community` — investigación exhaustiva

**Confirmado.** Tres funciones distintas aceptan `p_community` como texto libre, validado solo por longitud (`char_length <= 120`), sin `CHECK`, sin `FK`, sin enum:

| Función | Tabla destino | ¿Alimenta algún agregado público? |
|---|---|---|
| `set_concern_listening_context` (`0032_escucha_vivienda.sql:317-352`) | `concern_listening_contexts.community` (`0032:140`) | **No** — sin ninguna función `get_*` que agrupe por esta columna; solo lectura RLS `_select_own` (`0043:400-401`, restringida al propio usuario desde el propio parche de privacidad) |
| `set_participant_context` (`0031_pulso_participacion_vivienda.sql:521-550`) | `participant_contexts.community` (`0031:205`) | **No** — mismo caso, `_select_own` (`0043:436-437`) |
| `set_concern_listening_survey_response` (`0037_escucha_abierta_sanidad.sql:96-233`) | `concern_listening_survey_responses.community` (`0037:47`) | **Sí** — `get_concern_listening_survey_territory_breakdown` (`0043_privacidad_umbral_acceso_reportante.sql:290-330`) agrupa públicamente por esta columna |

Las dos primeras quedan **REFUTADAS** como vector: un valor inventado ahí solo se guarda en una fila privada, nunca visible salvo por el propio usuario — sin superficie de ataque de ningún tipo (ni privacidad, ni integridad, ni disponibilidad). No se toca nada en ellas.

La tercera es el caso real. Verificación empírica por lectura directa del código (no de un entorno en vivo — la lógica es determinista y no depende de estado, así que la lectura del código es prueba suficiente sin necesidad de ejecutar nada):

- `set_concern_listening_survey_response` está `grant execute ... to authenticated` (`0042_security_hardening_review3.sql:153`) — cualquier cuenta autenticada puede llamarla directamente vía PostgREST, sin pasar por el `<select>` del frontend (`src/lib/data/regions.ts`, catálogo de **19** comunidades/ciudades autónomas — el comentario de `0043` decía "20", error de cuenta, sin efecto en la protección).
- La única validación de `p_community` es `char_length(p_community) > 120` (`0037:207-209`) — a diferencia de `p_area_type`, que sí se valida contra un `in (...)` cerrado dos líneas después (`0037:210-212`). `community` es el único campo categórico de toda la función sin ese tipo de validación.
- `get_concern_listening_survey_territory_breakdown` (`0043:290-330`) agrupa por `community` y **suprime la distribución COMPLETA de la ronda si CUALQUIER grupo observado tiene menos de `greatest(p_min_threshold, 30)` respuestas** (`where not exists (select 1 from counts c2 where c2.response_count < greatest(...))`) — diseño intencional para impedir el ataque de resta contra comunidades reales pequeñas, documentado en el propio comentario de `0043`.

**Camino real, paso a paso:** una cuenta autenticada llama `rpc('set_concern_listening_survey_response', {p_round_id: <ronda abierta>, p_problems: [...], p_community: 'categoria_inventada', ...})`. Se inserta con éxito (solo pasa el chequeo de longitud). Esa llamada crea un grupo `community = 'categoria_inventada'` con `response_count = 1` en el `CTE` de `get_concern_listening_survey_territory_breakdown`. Como `1 < greatest(p_min_threshold, 30)`, la cláusula `where not exists (...)` se vuelve verdadera para **todas** las filas del resultado, no solo para la inventada — el desglose territorial completo de esa ronda deja de devolver ninguna fila, aunque las 19 comunidades reales tengan cientos de respuestas cada una.

**Clasificación del impacto — probada explícitamente para cada opción pedida:**
- ¿Crear una categoría adicional? **Sí**, literalmente, un valor distinto en la columna.
- ¿Provocar que el agregado territorial quede suprimido? **Sí** — es el efecto principal, y se puede repetir a voluntad, en cualquier ronda abierta, con una sola llamada.
- ¿Alterar únicamente su propia respuesta? **Sí, solo eso** — el `insert`/`on conflict (round_id, user_id)` está atado a `auth.uid()`, nunca a un id que el cliente controle; no puede tocar ni ver la fila de otro usuario.
- ¿Extraer información adicional? **No** — no se filtra ningún dato que no debiera ser público; al contrario, el efecto es ocultar datos que sí deberían serlo.
- ¿Afectar otras rondas? **No** — todo está acotado por `where round_id = p_round_id`.

**Conclusión de clasificación:** es un problema de **disponibilidad/integridad del propio informe de transparencia** (puede hacer desaparecer un desglose público legítimo bajo demanda), **no** de privacidad (no hay fuga hacia el atacante ni hacia terceros) y **no** de integridad de datos ajenos (cada cuenta solo controla su propia fila). Severidad **BAJA-MEDIA**: requiere cuenta autenticada real (atribuible), el efecto es reversible (basta con que un moderador anule la fila fraudulenta), pero es trivial de ejecutar y afecta una función pública de cara a la ciudadanía.

**Parche (diseñado, no aplicado):** `0044` §2 — añadir el mismo tipo de `if p_community is not null and p_community not in (...) then raise exception` que ya usa `p_area_type`, con el catálogo literal de las 19 comunidades de `src/lib/data/regions.ts`. Ver `seguridad/42_migracion_candidata_0044.sql` §2 para el texto exacto.

**Trade-off explícito:** el catálogo queda duplicado (hardcodeado en SQL y en `regions.ts`) — si el catálogo de comunidades cambiara alguna vez (no es previsible: son las comunidades autónomas de España, dato administrativo estable), habría que actualizar ambos sitios. Es el mismo patrón que ya usa `p_area_type` en la misma función, así que no introduce una inconsistencia de diseño nueva.

---

## B. `get_attendance_counts` — auditoría y parche

**Definición actual completa:** `0010_fix_advisor_findings.sql:22-36`, nunca redefinida después. `SECURITY DEFINER`, `grant execute ... to anon, authenticated` (`0010:41-42`). Agrupa `attendance_responses` por `event_id` sin ningún filtro de estado del evento — a diferencia de `set_attendance` (`0014_fix_attendance_rate_limit.sql:56-61`), que sí exige `e.status not in ('draft', 'pending_review', 'hidden', 'rejected')` antes de aceptar una escritura. Esa misma expresión es, además, la que usan las políticas RLS públicas de `events` (`0011_performance_hardening.sql:49-52`) — es la regla canónica del proyecto para "visible públicamente", repetida en 3 sitios y ausente solo en este cuarto.

**Hallazgo adicional durante esta verificación (no estaba en el informe original):** `p_event_ids` tiene `default null`, y con `null` la función devuelve el conteo de **todos** los eventos de la tabla, incluido su propio `event_id` — no hace falta conocer ningún UUID de antemano; `rpc('get_attendance_counts', {})` sin argumentos ya expone qué eventos no públicos existen (aunque no su contenido) junto con sus conteos.

**Parche (diseñado, no aplicado):** añadir `join public.events e on e.id = ar.event_id` + `and e.status not in ('draft', 'pending_review', 'hidden', 'rejected')`, reutilizando literalmente la misma condición de `set_attendance` (no una regla nueva). Mismo signature, mismos grants — `CREATE OR REPLACE` los conserva. Ver `seguridad/42_migracion_candidata_0044.sql` §1.

**Prueba negativa diseñada (§G):** evento en cada uno de los 4 estados no públicos → `get_attendance_counts` no debe devolver fila para ese `event_id`, ni con `p_event_ids` explícito ni con `null`. Evento publicado/válido → comportamiento idéntico al actual.

---

## C. Rate limiting — diseño (no implementado)

**Objetivo:** `reports`, `channel_reports`, `concern_proposals`. Se descarta explícitamente tocar votos/respuestas (ya protegidos por `UNIQUE` + upsert, sin crecimiento posible) y `delete-account` (autolimitado por naturaleza — repetirlo tras el éxito solo produce `401`, no hay cuenta que borrar dos veces).

**Mecanismo elegido: trigger `BEFORE INSERT`, no una función RPC nueva.**

Se descartó envolver estas 3 tablas en una función `SECURITY DEFINER` (como `set_attendance`) porque exigiría cambiar el código cliente (`src/lib/services/moderationService.ts:166-183`, `src/lib/services/channelsService.ts:169-179`, `src/lib/services/concernsService.ts:~315`, todos con `.from(<tabla>).insert(...)` directo hoy) sin necesidad real: un trigger `BEFORE INSERT` se ejecuta sobre **cualquier** camino de escritura, incluido el `insert` directo ya existente, sin tocar una sola línea de `src/`. Cumple todos los requisitos pedidos:

- **Asociado al `auth.uid()` real**: el trigger lee `auth.uid()` directamente dentro de la función `SECURITY DEFINER`, nunca confía en una columna que el cliente rellena (`reported_by_user_id`/`proposer_user_id` podrían en teoría no coincidir, pero el límite ni siquiera los mira).
- **Imposible de evitar con un UUID/token distinto**: no hay ningún parámetro equivalente al `dedup_token` de `set_attendance` — la sesión autenticada es la única identidad que cuenta, y no la elige el cliente.
- **Ventana temporal sencilla**: dos ventanas, 1 minuto (ráfaga) + 1 día (tope amplio), mismo patrón ya probado en `attendance_rate_limits`.
- **Coste bajo**: una tabla append-only con índice `(user_id, action, called_at)`, dos `count(*)` indexados por inserción — mismo perfil de coste que el mecanismo ya en producción para asistencia.
- **Compatible con RLS**: no toca ninguna política existente, actúa como una capa adicional independiente.
- **Respuesta clara al cliente**: `raise exception` con texto en español, igual que el resto de validaciones de la app — ya se propaga tal cual porque el código cliente ya hace `if (error) throw error` de forma genérica en los 3 puntos de inserción citados arriba (confirmado leyendo cada uno).
- **Sin `service_role`, sin CAPTCHA obligatorio, sin Redis/servicio nuevo.**

**Límites propuestos (razonados, no arbitrarios):**

| Operación | Ráfaga (1 min) | Tope diario | Razonamiento |
|---|---|---|---|
| `reports` | 3 | 15 | Un usuario legítimo puede reportar varias convocatorias distintas en una sesión de uso normal (ej. revisando varios eventos sospechosos seguidos); 3/min ya cubre eso con margen. 15/día es generoso para el caso legítimo más activo imaginable y aun así acota un bucle de spam a un volumen manejable por moderación. |
| `channel_reports` | 3 | 15 | Mismo razonamiento y mismo patrón de uso que `reports` — ambas son la misma acción (reportar) sobre dos tipos de recurso distintos. |
| `concern_proposals` | 1 | 5 | Proponer una preocupación ciudadana es una acción deliberada y poco frecuente incluso para un usuario muy comprometido; nadie legítimo necesita crear varias en el mismo minuto, y 5/día ya es más que suficiente para cualquier caso de uso real, incluido alguien explorando la función por primera vez y corrigiendo una propuesta que no le convenció. |

**Tabla y trigger diseñados:** `write_rate_limits` (una sola tabla compartida por las 3 operaciones, columna `action` con `CHECK` cerrado, en vez de 3 tablas — minimiza el cambio) + `enforce_write_rate_limit()` (una sola función parametrizada por `TG_ARGV[0]`, en vez de 3 funciones casi idénticas) + 3 triggers, uno por tabla. Texto exacto en `seguridad/42_migracion_candidata_0044.sql` §3, con purga programada vía `pg_cron` a los 2 días, mismo patrón que `purge_old_attendance_rate_limits`.

---

## D. `delete-account` — corrección del mensaje (diseño, no aplicado)

**Solo se toca el texto del mensaje de error, no la lógica ni la atomicidad.** Archivo real: `supabase/functions/delete-account/index.ts:60-69`.

Hoy, cualquier violación de FK `RESTRICT` (hay 3 reales: `events.created_by_user_id` `0003:54`, `audit_logs.moderator_id` `0005:58`, `verification_documents.uploaded_by_user_id` `0006:24`) se detecta con el mismo regex genérico (`/foreign key|violates|restrict|database error deleting user/i`, línea 61) porque GoTrue nunca reenvía cuál de las 3 fue — pero el texto de respuesta solo contempla la primera:

```ts
// Actual (línea 65):
? 'No puedes eliminar tu cuenta porque tiene convocatorias creadas. Cancélalas o contacta con moderación.'
```

**Propuesto:**

```ts
? 'No puedes eliminar tu cuenta todavía: tiene contenido asociado que debe resolverse antes (convocatorias creadas, acciones de moderación registradas o documentos de verificación subidos). Contacta con moderación si necesitas ayuda.'
```

También se propone actualizar el comentario de cabecera (`index.ts:13-19`) para mencionar las 3 FK `RESTRICT` reales, no solo `events`. No es un archivo `.sql`, así que no forma parte de la migración `0044` — es un cambio de aplicación (Edge Function) independiente, listo para aplicar cuando se autorice, sin relación con Supabase/producción hasta que se despliegue explícitamente.

---

## E. Migración candidata `0044`

Creada como candidata, **sin aplicar en ningún entorno** (ni local, ni staging, ni producción — no se ha ejecutado `supabase db push` ni `db reset`, no vive en `supabase/migrations/`, así que ningún job de CI ni ninguna herramienta la recoge automáticamente):

- **`seguridad/42_migracion_candidata_0044.sql`** — contenido completo: §1 `get_attendance_counts`, §2 `set_concern_listening_survey_response`, §3 `write_rate_limits` + `enforce_write_rate_limit()` + 3 triggers + purga programada.
- **`seguridad/43_rollback_0044_candidata.sql`** — revierte los 3 cambios en orden inverso, hasta el estado exacto anterior (mismos textos de función que en `0010`/`0037`, verificados carácter a carácter contra el código actual).

No se toca: `is_moderator_or_admin`, la atomicidad de `delete-account`, `set_attendance`, ni ninguna función de votos/respuestas.

---

## F. Security Baseline — controles automáticos baratos propuestos

Sin ampliar la CI de forma significativa — 3 aserciones de texto añadidas a un script `check-*` existente (probablemente `check-migrations-structure.mjs`, que ya hace este tipo de verificación sobre el texto de las migraciones), como *tripwire* barato (no sustituye una prueba funcional, pero detecta una regresión accidental de estos 3 hallazgos concretos sin coste de infraestructura):

1. La definición de `get_attendance_counts` en las migraciones debe contener `status not in` junto a los 4 estados no públicos.
2. La definición de `set_concern_listening_survey_response` debe contener el catálogo cerrado de comunidades (o al menos `p_community not in (`).
3. Deben existir los 3 `create trigger enforce_*_rate_limit`.

Una verificación funcional real (llamar de verdad a las funciones con una sesión simulada y comprobar que rechazan lo que deben rechazar) requiere un stack local completo (`supabase start`) y usuarios de prueba reales — mismo esfuerzo que `staging_test_0043.mjs` de la fase anterior de este proyecto. Se propone como **script manual**, no integrado en `pnpm security:baseline` de cada PR (sería lento y pesado para cada push) — ejecutable bajo demanda antes de promover a producción, igual que ya se hizo para `0043`.

---

## G. Tests negativos diseñados (para entorno disposable/staging, no producción)

1. `get_attendance_counts` sobre un evento `draft`/`pending_review`/`hidden`/`rejected` → sin fila en el resultado.
2. `get_attendance_counts` sobre un evento publicado con respuestas reales → mismo resultado que hoy (sin regresión).
3. Mismo `auth.uid()` insertando `reports` 4 veces en menos de 1 minuto → la 4ª falla con el mensaje de límite.
4. Mismo `auth.uid()` insertando `channel_reports` 4 veces en menos de 1 minuto → la 4ª falla.
5. Mismo `auth.uid()` insertando `concern_proposals` 2 veces en menos de 1 minuto → la 2ª falla.
6. Dos cuentas distintas (`auth.uid()` distinto) insertando cada una dentro de su propio cupo → ninguna se ve afectada por el consumo de la otra.
7. Pasada la ventana de 1 minuto, la misma cuenta puede volver a insertar dentro del cupo de ráfaga (sin tener que esperar al reinicio del cupo diario).
8. `set_concern_listening_survey_response` con `p_community = 'categoria_inventada'` → rechazada con el nuevo mensaje; con un valor real del catálogo → aceptada igual que hoy.

Todos ejecutables contra un stack `supabase start` local desechable (mismo que el clean-room de la fase anterior) o contra staging con cuentas de prueba sintéticas — nunca contra producción ni con datos reales de participación ciudadana.

---

## Impacto frontend

**Ninguno obligatorio.** `0044` §1 y §2 mantienen exactamente el mismo signature y el mismo comportamiento para cualquier llamada que el frontend ya hace hoy (el frontend nunca pide asistencia de un evento no público por su propia navegación, y siempre envía un valor del `<select>` de `regions.ts`). §3 (rate limiting) tampoco requiere cambios: los 3 puntos de inserción ya hacen `if (error) throw error` de forma genérica, así que el nuevo mensaje de error se propaga sin más código. Como mejora opcional (no bloqueante) se podría capturar ese mensaje específico en la UI para mostrar un aviso más amable que un error genérico — no necesario para que el parche funcione.

## Impacto CI

Bajo. `0044` no cambia ninguna estructura que los checks existentes (`migrations-structure`, `cleanroom`, `rls-cleanroom`, `security-definer`, `using-true`, `session-architecture`) no puedan validar tal cual — mismo tipo de cambio (funciones `SECURITY DEFINER`, una tabla nueva con RLS habilitada sin políticas propias, triggers) que migraciones anteriores ya pasaron por esos jobs sin problema. Requerirá el mismo trailer `Security-Baseline-Override` que toda función `SECURITY DEFINER` nueva/modificada, según el mecanismo ya vigente (`scripts/security/lib/override.mjs`). Las 3 aserciones nuevas propuestas en §F son de texto, coste marginal.

---

## Valoración de prioridad

| Hallazgo | Prioridad |
|---|---|
| `p_community` sin catálogo (disponibilidad del desglose territorial) | **P1** — real y trivial de disparar, pero de impacto acotado (oculta datos, no los filtra) |
| `get_attendance_counts` sin filtro de estado | **P1** — real, bajo impacto (solo 2 enteros agregados) |
| `reports`/`channel_reports` sin límite de frecuencia | **ANTES DE AUMENTAR TRÁFICO** — el más urgente de los 4: satura directamente la cola de moderación humana |
| `concern_proposals` sin límite de frecuencia | **P1** — mismo tipo de riesgo, impacto menor (no oculta señal de otros usuarios) |
| `delete-account` — mensaje de error impreciso | **P2** — UX, no seguridad |
| `is_moderator_or_admin`, atomicidad de `delete-account` | **NO ACCIÓN** — refutados |

No se ha implementado nada de lo anterior. No se ha hecho commit. No se ha abierto PR. No se ha tocado Supabase ni Vercel.

POST-REVIEW HARDENING — PLAN LISTO PARA REVISIÓN
