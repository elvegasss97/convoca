# CONVOCA — Modelo de Privacidad de Participación v1 (revisión 2)

**Fecha:** 2026-08-07
**Estado: MODELO DE PRIVACIDAD v1 — CANDIDATO FINAL, NO IMPLEMENTADO.** No se ha tocado producción, Supabase, Vercel, código ni migraciones. No se ha ejecutado el Bloque B. Todo este análisis se basa en lectura directa y completa del código y las migraciones reales — no en descripciones de sesiones anteriores ni en suposiciones. Cada afirmación es verificable releyendo el archivo y línea citados.

**Nota de esta revisión, por transparencia:** al preparar esta revisión se detectó que una verificación previa (documentada en `24_analisis_kimi_privacidad_participacion.md`) afirmó que una frase citada por una revisión adversarial externa ("es el hallazgo más urgente de este documento") no existía en este archivo. Eso era un error de esa verificación: la frase sí existe, en la fila transversal de la Tabla final (no en §17, que es donde la revisión externa la situaba erróneamente). Se corrige aquí explícitamente, no se oculta el error. Esto no cambia ninguna conclusión de fondo: el hallazgo del umbral manipulable ya estaba, y sigue estando, marcado como crítico y urgente en dos sitios distintos del documento.

---

## 1. Estado actual — inventario real de tablas de participación

Tabla por tabla, basado exclusivamente en el código y el SQL real. "Staff" = `is_moderator_or_admin()` (consulta `profiles.role in ('moderator','admin')`, nunca JWT claims).

### `attendance_responses` (`0009`, agregado en `0010`/`0014`) — asistencia a convocatoria

- **PK:** `id uuid`. **Sin `user_id` de ningún tipo** — diseño deliberado, documentado en el propio SQL.
- **`event_id`:** FK a `events(id) on delete cascade`.
- **Contenido:** `response text check (response in ('going','interested'))`.
- **UNIQUE:** `(event_id, dedup_token)`.
- **RLS:** habilitado, **sin ninguna política** de `select`/`insert`/`update`/`delete` para `anon`/`authenticated` — todo pasa por `set_attendance()` (`SECURITY DEFINER`), con límite de frecuencia por `dedup_token` (`0014`). Nadie, ni el organizador, puede listar filas individuales.
- **Lectura pública:** `get_attendance_counts(p_event_ids)` — solo `count(*)` por evento.
- **Al borrar la cuenta:** no aplica — no hay vínculo con ninguna cuenta.

**Corrección de esta revisión, verificada leyendo el código cliente completo (`src/lib/services/attendanceService.ts`, `src/lib/utils/id.ts`), no solo el esquema SQL:** el `dedup_token` **no es un identificador efímero por evento** — se guarda bajo una única clave de `localStorage` (`convoca:attendance-device-token`), generada una vez por dispositivo/navegador y **reutilizada para todos los eventos** a los que ese dispositivo confirme asistencia. Esto significa que **no es Modelo D puro sin matices**: aunque no hay `user_id` ni cuenta involucrada, el mismo token permite correlacionar el patrón de asistencia de un dispositivo a través de múltiples convocatorias (p. ej., "este dispositivo ha confirmado asistencia a 5 convocatorias de un mismo colectivo"), algo que un Modelo D estricto evitaría generando un identificador distinto por evento. La generación (`randomId()`) usa `crypto.randomUUID()` en contexto seguro (HTTPS — el caso de `convoca.cloud` en producción), pero tiene un *fallback* real para contextos HTTP no seguros (`Date.now()` + `Math.random()`, no criptográfico) documentado como necesario para el acceso desde móvil por IP local en desarrollo — irrelevante en producción, pero real en el código.

**Alternativa de diseño a evaluar (no implementada):** generar un token distinto y aleatorio por `event_id` (en vez de uno único por dispositivo), conservado localmente igual que hoy. Esto mantendría exactamente la misma deduplicación por evento (la restricción `UNIQUE(event_id, dedup_token)` no cambia) sin permitir correlacionar la asistencia de un mismo dispositivo entre eventos distintos — el coste es que el propio dispositivo tampoco podría, por sí mismo, reconocer fácilmente "a qué eventos ya he confirmado" sin guardar una lista de tokens por evento (hoy usa una sola clave global; pasaría a necesitar una clave por evento, cambio menor de implementación, no de arquitectura).

### `concern_responses` (`0026`) — valoración de nivel 1-5 de una preocupación
- **PK:** `id`. **`user_id uuid not null references auth.users(id) on delete cascade`.** `concern_id` FK `on delete cascade`.
- **Contenido:** `level smallint check (level between 1 and 5)`.
- **UNIQUE:** `(concern_id, user_id)`.
- **RLS:** `concern_responses_select_own_or_staff`: `using (user_id = auth.uid() or is_moderator_or_admin())`. Sin política de escritura directa.
- **Lectura pública:** `get_concern_results()` — ver §5, **umbral verificado: ninguno**.

### `concern_proposals` (`0026`) — propuesta ciudadana de nuevo tema
- **PK:** `id`. **`proposer_user_id uuid not null references auth.users(id) on delete cascade`.**
- **Contenido — texto libre extenso, ligado a la identidad:** `title`, `proposed_question`, `description`, `reason`. `reviewed_by uuid references auth.users(id) on delete set null`.
- **Al borrar la cuenta:** la propuesta entera desaparece (`cascade`); si fue aprobada, `resulting_concern_id on delete set null` conserva el tema resultante, sin rastro de quién lo propuso.

### `measure_responses` (`0027`) — postura/prioridad sobre una medida (tema genérico)
- **PK:** `id`. **`user_id`** `on delete cascade`. `measure_id` FK `on delete cascade`.
- **Contenido:** `stance`, `priority` (catálogo cerrado).
- **RLS:** `measure_responses_select_own_or_staff` — mismo patrón.
- **Lectura pública:** `get_measure_results()` — ver §5, **umbral verificado: ninguno**.

### `concern_listening_rounds` / `concern_listening_responses` / `concern_listening_contexts` / `concern_listening_completions` (`0032`, `0033`) — escucha de Vivienda
- **`concern_listening_responses`:** PK `id`, **`user_id on delete cascade`**, `round_id on delete cascade`. Contenido: `option_code` (catálogo), `rank smallint`. UNIQUE `(round_id, option_code, user_id)` y `(round_id, user_id, rank)`.
- **`concern_listening_contexts`:** **`user_id on delete cascade`**, `round_id on delete cascade`. Contenido: `community` (texto libre ≤120), `area_type`, `housing_situation`. UNIQUE `(round_id, user_id)`.
- **`concern_listening_completions`:** `user_id on delete cascade`.
- **RLS de las tres:** `_select_own_or_staff` idéntico.
- **Hallazgo directo:** un `moderator`/`admin` puede, con un `SELECT` normal, cruzar territorio (`concern_listening_contexts`) con prioridades reales (`concern_listening_responses`) de una persona concreta — sin ningún privilegio especial más allá del rol de staff.

### `concern_listening_survey_responses` (`0037`) — escucha abierta de Sanidad
- **PK:** `id`. **`user_id on delete cascade`**, `round_id on delete cascade`. UNIQUE `(round_id, user_id)`.
- **Contenido, todo en la misma fila que `user_id`:** `problems[]`, `other_problem_text` (150 car.), `main_cause`, `prioritized_measure_ids[]`, `commitment_most_urgent_id`/`commitment_most_difficult_id`, **`missing_improvement` (≤1000 car., texto libre)**, `community` (120 car.), `area_type`.
- **RLS:** `_select_own_or_staff`.
- **La tabla con mayor densidad de datos correlacionables de todo el sistema.**

### `participation_rounds` / `measure_participation_responses` / `general_participation_responses` / `response_priorities` / `participant_contexts` (`0031`) — participación de Vivienda (versión rica)
- **`measure_participation_responses`:** `user_id on delete cascade`. Contenido: `position_value`, `reason_code`, `reason_other` (200 car.), **`comment` (400 car., texto libre)**, `urgency`, **`quick_change` (400 car., texto libre)**. UNIQUE `(round_id, measure_id, user_id)`.
- **`general_participation_responses`:** `user_id on delete cascade`. Contenido: 3 catálogos + **`unaddressed_problem` (600 car., texto libre)**. UNIQUE `(round_id, user_id)`.
- **`response_priorities`:** `user_id on delete cascade`. Contenido: `rank (1,2,3)`. UNIQUE `(round_id, user_id, measure_id)` y `(round_id, user_id, rank)`.
- **`participant_contexts`:** `user_id on delete cascade`. Contenido: `community` (120 car.), `housing_situation`. UNIQUE `(round_id, user_id)`.
- **RLS de las cuatro:** `_select_own_or_staff` idéntico.

### `next_block_vote_rounds` / `next_block_votes` (`0038`) — "Tú eliges el próximo bloque"
- **`next_block_votes`:** `user_id on delete cascade`. Contenido: `option_code` (5 opciones fijas). UNIQUE `(round_id, user_id)`.
- **RLS:** `_select_own_or_staff`.
- Único tipo con nombre explícito de "voto"; sigue el mismo modelo identificable que el resto.

### `reports` / `audit_logs` (`0005`) — moderación, no participación ciudadana, incluidos por contraste
- `reports.event_id uuid not null references public.events` — **solo puede referenciar convocatorias, no ninguna de las 12 tablas de participación.** No existe ningún mecanismo para reportar una respuesta de participación en el esquema actual.
- `reports.reported_by_user_id` → `on delete set null`. **Precisión verificada en esta revisión, a dos niveles distintos:**
  - **A nivel de base de datos/RLS:** `reports_select_staff` es `for select to authenticated using (is_moderator_or_admin())`, **sin ninguna restricción de columna** — RLS es por fila, no por columna. Un moderador que ejecute `select * from reports` (o pida esa columna explícitamente vía API) **sí obtiene** `reported_by_user_id`.
  - **A nivel de interfaz de aplicación:** `listReportsForEvent()` (`moderationService.ts`) hace `select('*')`, pero la función `rowToReport()` **descarta explícitamente** `reported_by_user_id` antes de devolver el objeto a la UI. La protección "no se expone ni a moderación" que declara el comentario de la migración es real **solo como convención del código cliente actual**, no como garantía de RLS/base de datos — un colaborador con acceso a la API (no solo a la interfaz) vería el dato igual.
- `audit_logs.moderator_id` → `on delete restrict`.
- `reports`/`audit_logs` **no son un ejemplo de identidad protegida frente a staff a nivel de base de datos** — son el mismo patrón `own_or_staff` que las 12 tablas de participación, con la única diferencia de que `reported_by_user_id` usa `set null` en vez de `cascade` (comportamiento de borrado, no de exposición) y de que la UI actual, por elección propia, no lo muestra.

**Patrón universal, verificado exhaustivamente en las 12 tablas de participación con `user_id`:** todas usan `{tabla}_select_own_or_staff`. Ninguna distingue moderador de administrador, ninguna limita qué columnas ve el staff, ninguna registra que el staff accedió.

---

## 2. Mapa identidad → participación (pregunta central)

| Rol | ¿Sabe que X participó? | ¿Sabe en qué? | ¿Sabe qué opción eligió? | ¿Correlaciona con email? | ¿Correlaciona con territorio? | ¿Reconstruye historial completo? |
|---|---|---|---|---|---|---|
| **A. Usuario normal** | Solo de sí mismo | Solo de sí mismo | Solo de sí mismo | N/A | N/A | Solo el suyo |
| **B. Organizer** | No, sobre otros | No | No | No | No | No |
| **C. Moderator** | **Sí**, `SELECT` normal | **Sí** | **Sí**, incluido texto libre | **No directamente** vía estas tablas | **Sí** | **Sí**, cruzando `user_id` |
| **D. Admin** | Igual que Moderator | Igual | Igual | Igual | Igual | Igual |
| **E. `service_role`** | Sí, RLS no aplica | Sí | Sí | **Sí** | Sí | Sí |
| **F. Acceso directo a PostgreSQL** | Sí | Sí | Sí | Sí | Sí | Sí |

**Respuesta directa:** hoy, **C y D ya pueden reconstruir "el usuario X votó/opinó Y" con una consulta SQL trivial, respetando RLS**, sin `service_role` ni Postgres directo. La única barrera real es no ver el email sin un paso adicional — el `user_id` ya es suficiente para correlacionar todo el historial de una persona.

---

## 3. Qué puede ver cada rol — detalle por tipo de dato

Ver matriz completa en §11. Resumen: **no existe hoy ninguna distinción de privilegio entre `moderator` y `admin`** — `is_moderator_or_admin()` los trata como un único nivel en todas las políticas.

---

## 4. Riesgo de correlación

1. **Territorio + opinión + identidad en una sola fila:** `concern_listening_survey_responses`.
2. **Cruce entre tablas por `user_id`:** nada lo impide técnicamente.
3. **Texto libre como identificador indirecto:** reidentificación por estilo/contenido incluso sin `user_id`.

---

## 5. Resultados públicos — agregados y k-anonimato

**Corrección de esta revisión respecto a la anterior:** la recomendación previa ("añadir un mínimo real a las otras 11 funciones") era demasiado general — trataba por igual un simple total de participación y un desglose de opiniones, cuando el riesgo real de inferencia es muy distinto entre ambos. Se sustituye por una clasificación en tres categorías, con recomendación propia para cada una de las 12 funciones — **no se impone el mismo número (30) a todo sin justificarlo.**

### Tres categorías de RPC pública, por tipo de dato que devuelven

**1. Conteos operativos / baja sensibilidad** — la fuente no contiene identidad de cuenta, o el número en sí no permite inferir ninguna opinión. Ejemplo del encargo: `get_attendance_counts`, cuando la tabla fuente (`attendance_responses`) nunca tuvo `user_id`. **No requieren automáticamente `k >= 30` ni ningún mínimo** — el motivo por el que otras funciones necesitan un suelo (evitar que un `count(*)` pequeño revele una opinión individual) no aplica aquí porque no hay opinión que revelar, solo un recuento de un evento sin identidad asociada.

**2. Totales de participación** — cuántas personas participaron, sin revelar qué eligieron. Ejemplo del encargo: un total de participantes en una ronda. **Se evalúa caso por caso — un total pequeño no equivale necesariamente a revelar una opinión** (saber que "3 personas han participado todavía" no dice nada sobre qué votaron esas 3, a diferencia de un desglose por opción). Su relevancia real de privacidad es indirecta: un total bajo conocido públicamente **calibra** la fuerza de un ataque de inferencia sobre las funciones de la categoría 3 (si el total es 1, cualquier desglose de esa misma ronda revela con certeza la opinión de esa única persona) — por eso se listan aquí, no porque el total en sí sea sensible.

**3. Distribuciones / opiniones / votos / desgloses** — cualquier agregado que permita inferir qué eligió un grupo, especialmente uno pequeño: `position_value`, `priority`/`rank`, `reason`, `option_code`, desglose territorial, o cualquier `group by` sobre una dimensión de opinión. **Estas sí necesitan protección real:** mínimo server-side cuando corresponda, y/o publicación diferida, y/o resultados solo tras cierre, según el tipo de participación — nunca las tres a la vez de forma automática ni un número fijo sin justificar por función.

### Clasificación de las 12 funciones (completa, sin ningún "no verificado" — las 12 se han leído línea a línea)

| Función | Categoría | Sensibilidad de inferencia | Recomendación concreta |
|---|---|---|---|
| `get_attendance_counts` | 1 — Conteo operativo | **BAJA** | Sin cambio — la fuente (`attendance_responses`) nunca tuvo `user_id`; matizado por §1: el `dedup_token` persistente sí permite correlación de *dispositivo* entre eventos, pero eso no lo expone este agregado |
| `get_participation_summary` | 2 — Total de participación | **BAJA-MEDIA** | Sin cambio en el total en sí (`count(distinct user_id)`, sin desglose por elección); usar como señal auxiliar de cuándo activar protección reforzada en las funciones de categoría 3 para esa misma ronda |
| `get_concern_listening_survey_total` | 2 — Total de participación | **BAJA-MEDIA** | Sin cambio — `select count(*)`, sin desglose; mismo razonamiento que `get_participation_summary` |
| `get_next_block_vote_total` | 2 — Total de participación | **BAJA-MEDIA** | Sin cambio — `select count(*)`, sin desglose por opción, disponible incluso con la ronda abierta |
| `get_concern_results` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side (grupo `concern_id, level`) — dimensionar el umbral según volumen real observado, no asumir 30 sin comprobarlo |
| `get_measure_results` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side (grupo `measure_id, stance`) |
| `get_measure_position_counts` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side; combinar con publicación diferida si la medida lleva poco tiempo abierta (N inicial bajo) |
| `get_measure_urgency_counts` | 3 — Distribución de opinión | **MEDIA-ALTA** | Mínimo server-side |
| `get_measure_reason_counts` | 3 — Distribución de opinión | **MEDIA-ALTA** | Mínimo server-side; `reason_code` tiene más valores posibles que `stance`/`position_value`, más propenso a celdas pequeñas — considerar agrupar motivos raros bajo "otros" si caen por debajo del umbral, en vez de solo omitirlos |
| `get_general_participation_results` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side en las 3 dimensiones (`general_position`, `investment_opinion`, `pace_preference`) |
| `get_priority_results` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side sobre `times_top3`/`avg_rank` por medida |
| `get_concern_listening_survey_summary` | 3 — Distribución de opinión | **ALTA** | Mínimo server-side (grupo por `problem`/`main_cause`) — hoy sin ningún umbral, a diferencia de la función de desglose territorial de la misma tabla, que sí tiene uno (manipulable) |
| `get_concern_listening_survey_territory_breakdown` | 3 — Distribución de opinión + territorio | **MUY ALTA — CRÍTICO** | **Mantiene la calificación de crítico de la versión anterior:** `p_min_threshold integer default 30`, usado en `having count(*) >= p_min_threshold`, es un **parámetro controlado por el llamante** — verificado en `0037_escucha_abierta_sanidad.sql:290-307`, una llamada con `p_min_threshold: 1` anula la protección por completo. Recomendación: mínimo server-side **no reducible** (fijo en el cuerpo de la función o `greatest(p_min_threshold, 30)`); combinar con publicación diferida si el territorio tiene pocos residentes en general, no solo con el umbral |
| `get_next_block_vote_results` | 3 — Distribución de opinión (voto) | **ALTA** | Ya tiene una protección temporal (`status='closed'`) — añadir además un mínimo server-side como segunda capa, o evaluar directamente "resultados solo tras cierre" reforzado (ver §5c) dado que E es el tipo de mayor sensibilidad de todo el sistema (§6) |

**Resumen:** de las 12 funciones, **3 son totales de baja sensibilidad relativa (categoría 2, sin cambio necesario en el número que devuelven)**, **1 es un conteo operativo sin identidad (categoría 1, sin cambio)**, y **8 son distribuciones de opinión reales (categoría 3) que hoy no tienen ningún mínimo real** — de esas 8, 1 (`get_concern_listening_survey_territory_breakdown`) tiene un mínimo nominal pero manipulable por el cliente, lo cual la deja, en la práctica, igual de expuesta que las otras 7 que no tienen ninguno.

**Hallazgo crítico — verificado contra `0037_escucha_abierta_sanidad.sql:290-307`, mantenido en esta revisión:** `get_concern_listening_survey_territory_breakdown` recibe `p_min_threshold` como parámetro de la propia función RPC — una llamada `supabase.rpc(..., { p_min_threshold: 1 })` anula por completo la única protección de k-anonimato que existe en todo el sistema. Es el mismo tipo de defecto que H-02/H-03 en la auditoría de permisos (protección presente en el código, no aplicada donde debería).

**Riesgo de inferencia combinando consultas (ya identificado en la versión anterior, mantenido y ampliado en §5b):** pedir `get_measure_position_counts` antes y después de que una persona conocida públicamente diga que ha participado permite inferir su respuesta por diferencia — un ataque de inferencia clásico que **ningún umbral mínimo, por sí solo, elimina** (ver §5b).

### 5b. Un mínimo de grupo no elimina, por sí solo, la inferencia por diferencia temporal

Diseño de un suelo no reducible (no implementado):

- **Regla:** todo umbral de tamaño mínimo debe fijarse dentro del cuerpo de la función (`having count(*) >= 30`, literal) o, si se necesita flexibilidad, aplicarse como `greatest(p_min_threshold, 30)` — nunca aceptar el valor del cliente sin un suelo no reducible.
- **Pero esto no es suficiente por sí solo.** Un umbral de grupo protege contra "ver un grupo de 1 directamente" — no protege contra observar el mismo agregado dos veces y restar. Si un grupo tiene 40 personas y se sabe que una persona concreta acaba de participar, comparar el conteo antes/después sigue revelando su elección exacta, aunque el grupo nunca haya bajado de 30.
- **Mitigaciones complementarias a evaluar (ver §5c, sin decidir una única para todos los casos):** actualización no instantánea de los agregados (por lotes, no en tiempo real), publicación solo tras el cierre de la ronda, o redondeo/ruido estadístico en los conteos (más complejo, no recomendado como primera medida por el mismo principio de "no criptografía/complejidad por moda" que ya rige el resto de este documento).

### 5c. Alternativas de publicación para resultados sensibles — comparación, sin decidir una sola para todos los tipos

| Alternativa | Ventaja | Coste/limitación | Mitiga inferencia por diferencia |
|---|---|---|---|
| Actualización en tiempo real (estado actual) | Máxima transparencia, sin retraso | Ninguna protección temporal | No |
| Actualización por lotes (p. ej. cada hora) | Reduce la resolución temporal del ataque | Requiere un job/cron o vista materializada — coste de infraestructura nuevo | Parcial — dificulta pero no impide con paciencia |
| Publicación solo tras cierre de la ronda | Elimina la ventana de inferencia por completo mientras la ronda está activa | Retrasa la transparencia — el público no ve progreso en vivo | Sí, mientras la ronda esté abierta (ya es el modelo parcial de `next_block_votes`, solo por estado, no generalizado) |
| Snapshot congelado en momentos fijos (p. ej. al final del día) | Compromiso entre transparencia y protección | Complejidad de mantener snapshots versionados | Parcial, reduce la granularidad del ataque a "una vez al día" |
| Mínimo de grupo + publicación diferida combinados | La combinación más robusta de las disponibles sin criptografía | Mayor coste de diseño que cualquiera de las dos por separado | Sí, en la práctica, para la mayoría de escenarios razonables |

**No se decide aquí una única alternativa para todos los tipos de participación** — depende de cuánta transparencia en vivo se considere parte del valor de producto de cada tipo. **Para `next_block_votes` (voto de próximo bloque) se recomienda explícitamente evaluar "resultados solo tras el cierre"** como opción preferente, no solo como recomendación genérica: la propia función `get_next_block_vote_results` ya implementa parcialmente este principio (bloquea antes de `status='closed'`), así que extenderlo a un umbral de grupo además de la compuerta temporal es una ampliación de un patrón ya aceptado en el propio código, no una novedad conceptual.

---

## 6. Distinción por tipo de participación

| Tipo | Ejemplo real en CONVOCA | Análisis |
|---|---|---|
| **A. Asistencia a convocatoria** | `attendance_responses` | Efectivamente **SECRETO** para identidad de cuenta — pero ver §1: el `dedup_token` persistente sí permite correlación de patrón de dispositivo entre eventos, una propiedad distinta de la protección de identidad de cuenta. |
| **B. Apoyo/adhesión pública** | `concern_responses` (nivel 1-5) | Razonablemente **PSEUDÓNIMO o PÚBLICO agregado** — baja sensibilidad relativa. |
| **C. Valoración de una medida** | `measure_participation_responses`, `measure_responses` | Zona intermedia — postura estructurada **PSEUDÓNIMO/PRIVADO**; texto libre asociado más sensible, tratamiento distinto (§10, §16). |
| **D. Priorización de problemas** | `response_priorities`, `concern_listening_responses` | Candidato claro a **PRIVADO con fuerte separación de identidad**. |
| **E. Voto sobre próximo bloque** | `next_block_votes` | El más parecido a un voto electoral — candidato principal a **Modelo D**, o como mínimo **Modelo C**, y a "resultados solo tras cierre" (§5c). |
| **F. Respuestas abiertas/texto libre** | `comment`, `quick_change`, `unaddressed_problem`, `missing_improvement` | Tratamiento distinto del resto de su fila — ver §10 (medidas de contenido, no solo de acceso). |
| **G. Reportes/moderación** | `reports`, `audit_logs` | Privado frente a `anon`/`authenticated`; visible a staff a nivel de RLS (aunque la UI actual no lo muestre — ver §1). |

---

## 7. Comparativa de los cuatro modelos

| Criterio | A — Identificable (actual) | B — Pseudónimo | C — Separación identidad/participación | D — Fuertemente anónimo |
|---|---|---|---|---|
| Privacidad frente a staff | Ninguna | Media | Alta frente a `public`; **nula frente a quien controla el secreto de pseudonimización** (§8/§8b) | Alta si está bien diseñado (§8b) |
| Prevención de voto múltiple | Trivial | Trivial | Requiere tabla de elegibilidad separada | Igual que C |
| Editar el voto | Trivial | Trivial si el pseudónimo es determinista | Posible solo si el pseudónimo es determinista (coste: §9) | Difícil por diseño |
| Borrado de cuenta | Trivial, `cascade` (ver §10, matices de backups) | Requiere borrar por el pseudónimo asociado | Elegibilidad se borra fácil; respuesta puede quedar huérfana intencionadamente | Nada que borrar en el contenido |
| Moderación de texto libre abusivo | Trivial | Posible sobre el pseudónimo | Requiere vía separada de re-identificación auditada | Muy difícil |
| Fraude/Sybil | Resuelto en capa de autenticación, no aquí | Igual | Igual | Igual — ningún modelo de anonimización de la respuesta resuelve cuentas falsas |
| Auditoría | Trivial | Igual de auditable si está documentado | Más piezas que revisar | Más difícil sin herramientas específicas |
| Complejidad | Ya implementado | Media | Media-alta | Alta con edición; baja sin ella |
| **Orientación respecto a minimización/privacidad desde el diseño** (matizado en esta revisión — no se afirma cumplimiento legal) | Recoge más identidad de la necesaria para el fin agregado — objetivo de minimización no alcanzado | Mejor orientado a minimización, sin perder trazabilidad interna | Compromiso razonable, más alineado con privacidad desde el diseño como principio de ingeniería — **no constituye por sí solo una evaluación de cumplimiento normativo** | El más orientado a minimización en el dato en reposo — no resuelve por sí solo el derecho de acceso del propio usuario a "qué he votado yo" (§9) |
| Qué podría ver un administrador | Todo | El pseudónimo y patrón, salvo control del secreto | Que alguien elegible participó; el contenido, solo si controla el secreto de enlace **y no hay correlación por metadatos (§8b)** | Solo agregado, si no hay correlación por metadatos (§8b) |
| Riesgo ante un **dump completo** de la base | Máximo | Medio | Bajo si el secreto vive fuera de Postgres; igual de malo que A si vive dentro | Mínimo |

**No se asume que D sea automáticamente el mejor.** D tiene costes reales: dificulta la edición, complica la moderación de texto libre, y es más difícil de auditar externamente.

---

## 8. Prevención de doble voto — separar elegibilidad de almacenamiento

**El problema de fondo:** hoy, la misma columna `user_id` cumple dos funciones — clave de deduplicación y dato almacenado junto a la respuesta. No tienen por qué vivir juntas.

**Arquitectura propuesta — una alternativa de diseño entre varias posibles, no la arquitectura definitiva:**

1. **Tabla de elegibilidad** por ronda: `(round_id, user_id, participated_at)`, `UNIQUE(round_id, user_id)`. Nunca contiene la respuesta.
2. **Tabla de respuestas**, sin `user_id` — identificada por (a) un valor aleatorio (Modelo D, no editable sin que el cliente conserve el token) o (b) un pseudónimo determinista `HMAC(secreto, user_id || round_id)` (Modelo C, editable).
3. El cálculo del HMAC **no puede vivir en una función `SECURITY DEFINER` de Postgres con el secreto hardcodeado** (`pg_proc.prosrc` es legible con acceso de propietario a la base) — debe vivir en una Edge Function, con el secreto en variable de entorno del runtime.

**No se propone criptografía compleja por moda** — HMAC con secreto externo es estándar, comprensible y auditable, no un esquema de anonimización avanzado.

### 8b. El secreto del HMAC es un punto único de correlación — y la separación de tablas, por sí sola, no garantiza *unlinkability*

**Dos advertencias que esta revisión incorpora explícitamente, porque la versión anterior las trataba de forma insuficiente:**

**(a) El secreto del HMAC no es "anonimato fuerte" — es un punto único de correlación bajo control de quien lo posea.** Quien tenga el secreto puede calcular el HMAC de cualquier `user_id` conocido y reconstruir el enlace completo, para todo el mundo a la vez, en un instante. Esto no es un fallo de implementación — es una propiedad matemática de cualquier función determinista con clave. Por tanto:

- **Rotación:** si el secreto rota (buena práctica de seguridad estándar), **los pseudónimos ya calculados con la clave antigua dejan de ser recomputables** — un usuario que quiera editar una respuesta anterior ya no podría recalcular su propio pseudónimo salvo que el sistema conserve las claves antiguas indefinidamente para ese único fin, lo cual reintroduce exactamente el problema que la rotación pretendía resolver (más claves vivas = más superficie de fuga). **Este es un trade-off real, sin solución gratuita:** rotar mejora la seguridad hacia adelante pero degrada la editabilidad hacia atrás, o exige versionado de claves (guardar qué versión de secreto se usó para cada fila, y conservar todas las versiones históricas) — más complejidad operativa de la que este documento puede resolver por su cuenta.
- **Versionado de claves**, si se decide conservar varias generaciones del secreto: cada fila de la tabla de elegibilidad necesitaría registrar qué versión de secreto se usó, y el sistema necesitaría poder recomputar con la versión correcta — una pieza más de estado a mantener, auditar y proteger.
- **Auditoría de acceso al secreto:** quién puede leer la variable de entorno de la Edge Function, cuándo se ha leído/rotado, y si ese acceso queda registrado — no especificado en la versión anterior, y no resuelto aquí, solo señalado como requisito si se decide implementar C.
- **No presentar HMAC como anonimato fuerte sin matizar quién queda excluido de "poder correlacionar" y quién no** — HMAC con secreto protege frente a quien **no** tiene el secreto (staff normal, un dump de Postgres sin la Edge Function); no protege frente a quien sí lo tiene o puede obtenerlo (quien administra la Edge Function, o un atacante que la comprometa).

**(b) Separar la tabla de elegibilidad de la tabla de respuesta NO garantiza *unlinkability* si ambas conservan metadatos correlacionables — riesgo no modelado con suficiente detalle en la versión anterior.** Incluso sin ningún `user_id` compartido, dos tablas pueden re-vincularse por:

- **Timestamps cercanos:** si `elegibilidad.participated_at ≈ respuesta.created_at` (la escritura de ambas ocurre en la misma transacción o segundos después), un observador con acceso a ambas tablas puede emparejar filas por proximidad temporal, especialmente si el volumen de participación en esa franja es bajo — exactamente el mismo problema de "grupos pequeños" de §5, aplicado ahora a la correlación de tablas en vez de a un agregado.
- **Orden de inserción:** si los IDs de ambas tablas son secuenciales o basados en tiempo (p. ej. UUID v1, o un `bigint identity`), el orden relativo de inserción entre las dos tablas puede filtrar la correspondencia incluso sin mirar ningún timestamp explícito.
- **Metadata operacional:** logs de la Edge Function (si registran, aunque sea para depuración, cuándo se procesó cada solicitud), o logs de Postgres/Supabase que capturen ambas escrituras en la misma conexión/transacción.

**Distinción central que esta revisión deja explícita, y que la versión anterior no separaba con suficiente claridad:**

- **Anonimato frente a un dump de tablas (estático):** los Modelos C/D, bien diseñados (IDs no secuenciales, sin timestamps de grano fino compartido, secreto fuera del dump), sí pueden ofrecer una protección real y demostrable frente a este escenario — es la comparación que ya hace §14.
- **Anonimato frente al operador/plataforma con logs en tiempo real:** esto es una garantía mucho más difícil y **este documento no la promete** — quien opera la plataforma en tiempo real (con acceso a logs de aplicación, a la Edge Function mientras corre, o a la propia secuencia de peticiones HTTP) tiene una superficie de correlación que ningún diseño de solo-tablas puede cerrar por completo sin medidas adicionales (retraso deliberado de escritura, procesamiento por lotes desacoplado del momento de la petición, eliminación deliberada de precisión en timestamps). **No se afirma en ningún punto de este documento que el Modelo C, tal como está diseñado en §8, resista a un operador con capacidad de observación en tiempo real** — solo que mejora sustancialmente la situación frente a un dump estático posterior.

---

## 9. Derecho a cambiar el voto — el trade-off central

**Pregunta: ¿se puede tener "una persona = una participación editable" sin una tabla que vincule identidad → contenido?**

**No completamente, sin aceptar uno de estos costes** (ampliado con la advertencia de §8b):

1. **Enlace determinista pero protegido (Modelo C):** ver §8b — el secreto es un punto único de correlación, con problemas reales de rotación/versionado no resueltos aquí.
2. **Token de edición conservado por el dispositivo del usuario:** sin copia del enlace en el servidor; si se pierde el token, no se puede editar ni demostrar el voto anterior.
3. **Renunciar a la edición para el tipo más sensible (E):** voto de una sola vez — la forma más simple de Modelo D real.

**No hay una cuarta opción "gratis".**

---

## 10. Borrado de cuenta — estado actual y trade-off de fondo

**Verificado (§1): las 12 tablas de participación con `user_id` usan `on delete cascade`, sin excepción**, dentro de la base activa.

**Casos adicionales de comportamiento distinto, encontrados en esta revisión (verificado con `grep` exhaustivo de las 29 columnas que referencian `auth.users` en todo el repositorio, no solo las 12 tablas de participación):**
- `events.created_by_user_id` → `on delete restrict` (ya conocido).
- **`verification_documents.uploaded_by_user_id` → `on delete restrict`** — un organizador con documentos de verificación subidos tampoco puede borrar su cuenta sin que esos documentos se gestionen antes. No documentado hasta esta revisión.
- **`communication_channels.reported_by_user_id` (`0021`) → `on delete set null`** — un segundo sistema de reportes (canales de comunicación), con el mismo patrón que `reports`: protegido por convención de interfaz, no por RLS.

**Límite importante no incluido en la versión anterior: `ON DELETE CASCADE` actúa sobre la base de datos activa, no sobre copias retenidas.** Backups, Point-in-Time Recovery (PITR) y réplicas de lectura de Supabase pueden conservar los datos "borrados" hasta que expire su propia política de retención, con independencia de lo que el esquema de la aplicación defina. **Una política completa de borrado depende también de la retención de backups a nivel de plataforma, no solo del `ON DELETE` de cada tabla** — esto no se ha verificado contra la configuración real de Supabase de este proyecto en esta revisión (fuera del alcance de "solo repositorio"), se deja como requisito a confirmar, no como hecho ya comprobado.

**Evidencia empírica ya obtenida en una sesión anterior de esta misma auditoría, que confirma que el borrado bloqueado es atómico, no parcial:** `13_resultados_pruebas_pendientes_staging.md` §7.6 — al intentar borrar en staging una cuenta con una convocatoria creada (bloqueada por `on delete restrict`), la cuenta quedó **"confirmada que sigue existiendo en `auth.users` tras el intento — sin borrado parcial"**. Esto es consistente con la semántica transaccional de PostgreSQL (un `DELETE` que dispara cascadas y encuentra una restricción en cualquier punto revierte la operación completa, no deja lo ya cascadeado aplicado).

**Sobre el Modelo D y el derecho al olvido:** si la tabla de respuestas nunca contuvo un enlace recuperable, "borrar el voto de X" deja de ser una operación con sentido — no hay nada que desvincular. Esto está **orientado** a los principios de minimización de datos del RGPD, pero **no se afirma aquí que satisfaga una evaluación de cumplimiento normativo completa** — eso requiere criterio legal específico, no solo un argumento de arquitectura (ver §12).

---

## 11. Staff y mínimo privilegio

**Principio explícito: no usar `moderator/admin → puede ver todo`** — hoy esa es la situación real, y no se da por buena solo porque exista.

| Tipo de dato | Organizer | Moderator | Admin | DB operator (F) |
|---|---|---|---|---|
| Email de un usuario | No | No directamente vía estas tablas | Igual que moderator, salvo acceso adicional al dashboard | Sí, siempre |
| Documentos de verificación de organizador | Solo el propio | Sí (justificado, control de fraude) | Sí | Sí |
| Votos/prioridades (D, E) | No | Hoy: sí, individual — debería requerir motivo registrado | Igual que moderator hoy — debería requerir un nivel adicional | Sí, no restringible por RLS |
| Texto libre de participación | No | Hoy: sí, íntegro — debería requerir motivo de moderación registrado | Igual | Sí |
| Reportes (`reports`) | No | Sí — correcto | Sí | Sí |
| Historial de moderación (`audit_logs`) | No | Sí, lectura | Sí | Sí |

### Boceto técnico de mínimo privilegio por función (diseño, no implementación)

En vez de asumir "moderator/admin → todo" o forzar necesariamente una única columna de nivel (`privacy_access_level`), un **modelo de capacidades explícitas** encaja mejor con el principio de mínimo privilegio y es más legible que un nivel ordinal único:

```
can_moderate_content()       -- reports, audit_logs, acciones sobre convocatorias
can_review_verification()    -- verification_documents (ya justificado, control de fraude)
can_audit_participation()    -- lectura individual de las 12 tablas de participación,
                              -- exigible solo con un motivo registrado (vinculado a un
                              -- caso, no un SELECT libre)
```

Cada capacidad se comprueba de forma independiente en las políticas RLS correspondientes, en vez de una única `is_moderator_or_admin()` que las concede todas a la vez. **No es obligatorio implementarlo como una columna nueva en `profiles`** — podría ser igual de razonable una tabla de asignación de capacidades por cuenta (`staff_capabilities(user_id, capability)`), si eso resulta más flexible para asignar combinaciones distintas a distintas personas sin añadir una columna por capacidad. La elección concreta de mecanismo (columna, tabla, o función) es un detalle de implementación a decidir cuando se implemente, no un compromiso de este documento de diseño.

**Distinción moderación de contenido vs. vigilancia política:** moderar `reports`/`audit_logs` es revisar denuncias sobre convocatorias — no requiere ver el voto de nadie. Leer las 12 tablas de participación fila por fila no es moderación de contenido en ningún caso real documentado.

---

## 12. Logs — qué no debería registrarse

No se ha encontrado en el código actual ningún log que combine `IP + usuario + voto`, `email + voto`, ni `texto político + identificador técnico`. El riesgo es lo que podría añadirse sin pensarlo al depurar un problema futuro.

**Principio de diseño:**
- Nunca loguear el cuerpo completo de una petición a una función de escritura de participación.
- Logs de error: como mucho `round_id`, tipo de error, timestamp — nunca la respuesta enviada.
- Rate limiting (como `attendance_rate_limits`, basado en `dedup_token`, sin `user_id` ni IP) es el patrón correcto: identificador mínimo suficiente, no el máximo disponible.
- Logs de plataforma que sí incluyen IP por defecto: retención lo más corta posible.

---

## 13. Retención — categorías, sin fijar plazos legales todavía

| Categoría | Finalidad | Duración necesaria (a evaluar) | Criterio de borrado/anonimización |
|---|---|---|---|
| Datos de cuenta | Autenticación, autorización | Mientras la cuenta esté activa | Borrado completo al eliminar la cuenta |
| Votos/participación estructurada | Agregados públicos, seguimiento de políticas | Mientras el tema/ronda tenga relevancia pública | En Modelo C/D, el agregado puede conservarse sin depender del borrado de cuenta |
| Texto libre de participación | Contexto cualitativo | Más corta que los agregados estructurados | Candidato a revisión/expiración más agresiva, con límites de longitud revisados a la baja (§16) |
| Documentos de verificación | Prevenir fraude | Mientras la cuenta de organizador esté activa | Revisar plazo tras el cual se revalide |
| `audit_logs` | Trazabilidad de moderación | Larga | No debería borrarse salvo obligación legal específica |
| Logs técnicos (plataforma) | Depuración, seguridad, abuso | Corta | Rotación automática de la plataforma |
| `reports` | Gestión de denuncias | Media | A decidir junto con la política de moderación |

**No se fijan plazos concretos** — decisión de producto/legal en §17.

---

## 14. Escenario de filtración total — el criterio que más debe pesar

**Si mañana se filtra un dump completo de PostgreSQL de producción, hoy:** un atacante podría, cruzando `auth.users` con `profiles` y con cualquiera de las 12 tablas de participación, reconstruir el perfil de opinión política/cívica completo de cada ciudadano registrado, con nombre.

**Comparado con los modelos (A/B/C/D):** ver §7. **Distinción importante añadida en esta revisión (§8b):** esta comparación es válida para el escenario de **dump estático** — no equivale a una garantía de anonimato frente a un operador con acceso a logs en tiempo real, que es un modelo de amenaza distinto y no resuelto por la sola separación de tablas.

Este criterio pesa mucho en la recomendación de §16: para los tipos más sensibles (D, E), el coste de un dump filtrado bajo el modelo actual es tan alto que justifica el coste de ingeniería de C/D — con las salvedades de §8b sobre qué es lo que ese coste realmente compra.

---

## 15. Impacto de migración (estimación, sin escribir la migración)

Sin cambios de fondo respecto a la versión anterior, con una precisión añadida:

- **Tablas/funciones que cambiarían:** ver detalle ya existente — `concern_listening_responses`, `concern_listening_survey_responses`, `response_priorities`, `next_block_votes` como prioridad; el resto como segunda prioridad.
- **Compatibilidad con datos existentes:** no trivial — el histórico no se puede convertir retroactivamente sin perder editabilidad o exigir el pseudónimo desde el origen.
- **Nueva precisión (§8b):** cualquier estimación de coste de C/D debe incluir el diseño de rotación/versionado de claves y la separación de metadatos correlacionables (timestamps, orden de inserción) — no son un añadido menor, son parte del coste real de "hacerlo bien", no una optimización posterior.
- **¿Antes del lanzamiento?** Ver §18 — separado explícitamente en parche urgente vs. rediseño.

---

## 16. Recomendación — no "anonimizar todo", un modelo por tipo

- **A (asistencia):** modelo de identidad ya correcto; considerar la alternativa de token por evento (§1) para eliminar la correlación entre eventos — mejora de bajo coste, no urgente.
- **B (adhesión ligera):** mantener Modelo A, aplicar mínimo privilegio de staff (§11).
- **C (valoración de medida):** candidato a Modelo C a medio plazo; texto libre asociado con tratamiento diferenciado cuanto antes (ver abajo).
- **D (priorización):** candidato serio a Modelo C antes de un lanzamiento con mayor visibilidad.
- **E (voto de próximo bloque):** candidato más claro a Modelo D, o alternativamente "resultados solo tras cierre" (§5c) como paso intermedio de menor coste que una migración completa de esquema.
- **F (texto libre), tratamiento ampliado en esta revisión:**
  - Aviso explícito al enviar: "no incluyas datos personales propios o de terceros que no sean necesarios" — coste casi nulo, no implementado hoy.
  - Revisar si los límites de longitud actuales (hasta 1000 caracteres en un caso) son mayores de lo necesario para el propósito declarado del campo.
  - Retención potencialmente más corta que el resto de la fila (§13).
  - **Detección automática de PII: posible mejora de madurez a largo plazo (P2), no un requisito inmediato** — tiene coste de ingeniería real y una tasa de error (falsos positivos/negativos) que no la convierte en una solución barata ni infalible; no sustituye al aviso explícito ni a la restricción de acceso de staff (§11).
- **G (reportes/moderación):** ya correctamente diseñado a nivel de intención de producto; precisar en la implementación que hoy la protección de quién reporta es de interfaz, no de RLS (§1), si se considera que debe serlo también a nivel de base de datos.

**Lo que sería genérico e injustificado, y se rechaza:** migrar A/B a un modelo más anónimo sin necesidad, o dejar D/E en Modelo A indefinidamente asumiendo que "ya tiene RLS" es suficiente.

---

## 17. Tests futuros — referencia a la Security Baseline

Este documento no implementa tests, pero deja explícito qué debería demostrar la matriz de identidades de `19_security_baseline_v1_diseno.md` §7 respecto a estos hallazgos, cuando se implemente de verdad:

1. **El mínimo server-side de cualquier función de agregado sensible no puede reducirse desde el cliente** — llamar con un `p_min_threshold` (o parámetro equivalente) por debajo del suelo fijado debe seguir devolviendo el suelo real, nunca un valor menor.
2. **`anon` no obtiene cohortes por debajo del mínimo** en ninguna de las 12 funciones de agregado, no solo en la que ya tiene un parámetro nominal.
3. **Autorización binaria usuario A / usuario B / staff** — ya cubierto conceptualmente por la matriz existente de `19_...md`.

**Aclaración explícita, importante:** los tests de autorización binaria (¿puede X leer la fila de Y? — debe fallar) **no prueban resistencia a inferencia por diferencia temporal** (§5b) — son propiedades distintas. Un sistema puede pasar perfectamente todos los tests de autorización de la Security Baseline y seguir siendo vulnerable a que alguien infiera un voto individual llamando dos veces a una función de agregado pública. Cualquier test futuro de esta segunda propiedad necesitaría un diseño distinto (comparar resultados de la misma función en dos instantes, no solo comprobar permisos), y no está cubierto hoy por ningún test existente ni propuesto en `19_...md`.

---

## 18. Recomendación final — separar parche urgente de rediseño, y mantener esto fuera del Bloque B

**PARCHE DE PRIVACIDAD DE BAJO COSTE / URGENTE** — no requiere rediseño de arquitectura, aplicable en una migración/parche propio:

- Corregir el umbral manipulable de `get_concern_listening_survey_territory_breakdown` (suelo no reducible) — crítico, sin discusión.
- Añadir un mínimo de grupo real (server-side), **según la clasificación por categorías de §5**, únicamente a las 8 funciones de categoría 3 (distribuciones de opinión) que hoy no tienen ninguno — **no a las 4 funciones de categoría 1/2** (`get_attendance_counts`, `get_participation_summary`, `get_concern_listening_survey_total`, `get_next_block_vote_total`), que son conteos operativos o totales sin desglose y no requieren automáticamente el mismo tratamiento.
- Evaluar "resultados solo tras cierre" reforzado con mínimo de grupo para `get_next_block_vote_results` (categoría 3, sensibilidad ALTA) como extensión de un patrón ya existente en el código.
- Restringir el acceso de staff a texto libre de participación a un motivo registrado, donde se decida aplicarlo primero (§11).
- Añadir el aviso explícito de "no incluyas datos personales innecesarios" en los formularios de texto libre.

**REDISEÑO DE PRIVACIDAD** — cambio de arquitectura, coste y riesgo mucho mayores, no urgente para cerrar el lanzamiento:

- Migración a Modelo C/D para los tipos D/E (tabla de elegibilidad + tabla de respuesta separada).
- Edge Function + HMAC, con su problema de rotación/versionado de claves (§8b) resuelto explícitamente antes de implementar, no después.
- Separación de metadatos correlacionables (timestamps, orden de inserción) entre las tablas separadas.
- Migración/tratamiento de los datos ya recogidos bajo Modelo A.
- Modelo de capacidades de staff (§11) como cambio estructural de las 12 políticas RLS.

**Explícito, sin ambigüedad: ninguno de los dos bloques anteriores se mezcla con la migración `0042`.** `0042` mantiene exactamente su alcance ya probado en staging (hardening de permisos RPC + validación de `option_code`, documentado en el plan `17` y en `19_...md`) — no se le añade nada de este documento. Cualquier corrección derivada de este análisis (tanto el parche urgente como el rediseño) es una **migración o parche separado**, con su propio ciclo de preflight/backup/prueba en staging antes de aplicarse a producción, siguiendo exactamente el mismo procedimiento ya establecido para `0042` en el plan `17` — no una excepción ni un atajo.

---

## Tabla final

| Tipo de participación | Estado actual | Modelo recomendado | Prioridad de privacidad | ¿Cambiar antes del lanzamiento? |
|---|---|---|---|---|
| A. Asistencia a convocatoria | Identidad de cuenta: ya correcto. Dispositivo: token persistente entre eventos | Mantener; evaluar token por evento como mejora | **BAJA** | No urgente |
| B. Apoyo/adhesión ligera | A | A, con mínimo privilegio de staff | **BAJA** | No urgente |
| C. Valoración de una medida | A | C a medio plazo; texto libre con tratamiento diferenciado ya | **MEDIA** | Parcial — el texto libre sí, la tabla completa no |
| D. Priorización de problemas | A | C | **ALTA** | Recomendado antes de mayor visibilidad |
| E. Voto sobre próximo bloque | A | D, o "resultados solo tras cierre" como paso intermedio | **MUY ALTA** | Recomendado antes del lanzamiento |
| F. Respuestas abiertas/texto libre (transversal) | Privado de cara al público, íntegro para staff | Acceso restringido a motivo registrado + aviso al usuario + revisión de longitud | **ALTA** | Sí — el cambio de menor coste de todo el documento |
| G. Reportes/moderación | Privado a nivel de intención; protegido por UI, no por RLS | Precisar si debe protegerse también a nivel de RLS | **MEDIA** | No urgente |
| *(Transversal)* Umbral de k-anonimato manipulable | Defecto de implementación en 1 función; ausencia total en las 7 restantes de categoría 3 (distribuciones de opinión) — no aplica a las 4 de categoría 1/2 (conteos operativos/totales, ver §5) | Mínimo server-side no reducible en las 8 funciones de categoría 3 únicamente | **MUY ALTA — CRÍTICO** | **Sí, antes de cualquier otra cosa — el hallazgo más urgente de este documento** |

**Ningún cambio de este documento se ha implementado.** MODELO DE PRIVACIDAD v1 — CANDIDATO FINAL, NO IMPLEMENTADO.
