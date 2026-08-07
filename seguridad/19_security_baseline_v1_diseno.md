# CONVOCA Security Baseline v1 — Diseño (revisión 2)

**Fecha:** 2026-08-07
**Estado: DISEÑO — NO IMPLEMENTADO.** Ningún control de este documento existe todavía como código, workflow ni configuración de plataforma. No se ha modificado producción, Supabase, Vercel, ni el Bloque B. Todo el análisis se basa en inspección real del repositorio (`git`, `grep`, lectura de migraciones y código fuente), en la API de GitHub/Vercel en modo solo lectura, y en documentación oficial de PostgreSQL consultada explícitamente cuando hacía falta verificar una afirmación técnica — no en suposiciones genéricas de "buenas prácticas".

**Revisión 2 respecto a la v1:** integra las correcciones del informe adversarial de Kimi validadas en `20_analisis_informe_kimi.md`, y 15 decisiones adicionales del propietario del proyecto. Se rechaza explícitamente una afirmación de Kimi que resultó ser técnicamente falsa (§ Anexo — Correcciones de Kimi). El cambio más importante de esta revisión no es ningún control nuevo: es la introducción de una distinción de tres niveles (§1.1) que obliga a no llamar "garantía de seguridad" a lo que en realidad es una convención de nombres o un `grep`.

**Esta baseline no certifica que CONVOCA sea seguro.** Su objetivo es que una regresión futura sobre garantías que hoy dependen de disciplina manual se detecte automáticamente, con la severidad adecuada, sin convertir cada cambio pequeño en una auditoría de horas.

---

## 1. Principios

1. **No hay seguridad al 100%.** Esta baseline reduce la probabilidad de regresión sobre garantías ya conocidas; no elimina el riesgo de vulnerabilidades nuevas ni de errores de diseño no contemplados aquí.
2. **Automatizar lo que ya hacemos a mano.** Cada control de este documento existe porque ya lo hicimos manualmente al menos una vez en esta auditoría (preflight, smoke tests, revisión de permisos) — la baseline no inventa procesos nuevos, codifica los que ya demostraron valor.
3. **Preferir pocos controles de alta señal sobre muchos de baja señal.** Un control que da falsos positivos con frecuencia se acaba ignorando o baipaseando — eso es peor que no tenerlo.
4. **Distinguir lo estático de lo que necesita una base de datos real.** Algunas propiedades se pueden comprobar leyendo el SQL. Otras (`search_path` real, `has_function_privilege` real, `has_schema_privilege` real, forma real de una fila devuelta) ya se demostró en esta auditoría que **no son fiables por análisis estático** — requieren una base de datos efímera con las migraciones aplicadas, o la base real.
5. **Todo gate necesita una vía de excepción documentada.** Si no la tiene, en la práctica se acaba mergeando con `--no-verify` o equivalente la primera vez que bloquea algo legítimo.
6. **La seguridad debe sobrevivir a que el código sea público.** CONVOCA tiene intención de publicarse (§14). Ningún control de esta baseline puede depender de que un atacante no conozca el esquema, las políticas RLS o el código de las funciones.
7. **Privacidad de la participación ciudadana no es "más logs".** Registrar más no es automáticamente más seguro (§13).
8. **El coste por PR importa.** Un control que añade 10 minutos a cada PR tiene que justificar ese coste con el valor de seguridad que aporta (§16).
9. **La revisión humana debe ser realista sobre quién existe hoy.** Mientras CONVOCA tenga un único mantenedor humano, ningún control puede exigir "dos aprobaciones humanas" como condición literal — eso no es una barrera de seguridad, es una barrera imposible que se acaba saltando. Ver §1.2.
10. **Nunca describir un `grep`, una regex o una convención de nombres como si demostrara una propiedad de seguridad.** Ver §1.1 — es la corrección más importante de esta revisión.

### 1.1 Tres niveles: TRIPWIRE / GATE / GARANTÍA VERIFICADA

El informe de Kimi (`20_analisis_informe_kimi.md`) acertó en su crítica más de fondo: varios controles de la v1 se describían con un lenguaje ("cero ambigüedad", "100% fiable", "estructuralmente imposible") que no correspondía a lo que el control realmente demuestra. Esta revisión clasifica **cada control** en uno de tres niveles, y prohíbe usar el lenguaje de un nivel para describir un control de otro:

- **TRIPWIRE** — detecta un patrón sospechoso (texto, nombre, presencia de un literal, cambio de versión). **No demuestra ninguna propiedad de seguridad.** Puede tener falsos negativos (un atacante con motivo puede evitar el patrón exacto) y falsos positivos. Su valor es que detecta el caso más común y barato de detectar, no el caso adversarial. Ejemplos: `disable row level security` literal, nombre de política, `gitleaks`, cambio de versión de un paquete sensible.
- **GATE** — no prueba nada por sí mismo; **obliga a que un humano tome una decisión explícita** antes de que el cambio pueda mergearse. Su valor depende enteramente de la calidad de esa decisión humana, no de la detección que lo activa (que suele ser un TRIPWIRE). Ejemplos: segunda revisión en `SECURITY DEFINER`, revisión de arquitectura de sesión, revisión de Edge Function con `service_role`.
- **GARANTÍA VERIFICADA** — demuestra una propiedad real contra un estado real (una base de datos con las migraciones aplicadas, una API real, un log real, la salida real de un comando). Es el único nivel del que se puede decir honestamente "esto confirma que X es cierto ahora mismo". Ejemplos: `has_schema_privilege(...)` contra una base real, `pg_proc.proconfig` contra una base real, código HTTP real devuelto por un deployment real, `pnpm audit` (respaldado por la base de datos pública de advisories, no una heurística nuestra).

Cada control en §4-6 y en la tabla final incluye esta etiqueta. Un TRIPWIRE nunca se presenta como si fuera una GARANTÍA VERIFICADA, y un GATE nunca se presenta como si garantizara que la decisión tomada dentro de él fue correcta.

### 1.2 Revisión humana realista para un único mantenedor

Mientras CONVOCA tenga **un único mantenedor humano**, ningún GATE de esta baseline exige literalmente "una segunda persona aprueba". La secuencia real es:

```
detección automática (TRIPWIRE)
  → checklist de seguridad específico del tipo de cambio (ver cada GATE)
  → revisión defensiva independiente (el propio mantenedor, en un paso
    explícito y separado de la redacción del cambio — no la misma pasada
    mental en la que se escribió el código; puede apoyarse en una revisión
    de un agente/herramienta externa como segunda opinión, pero la decisión
    sigue siendo del mantenedor)
  → aprobación manual explícita del mantenedor, registrada en el PR
```

**Cuando exista un segundo mantenedor humano real**, todo GATE que hoy dependa de este proceso de un único revisor se eleva a revisión obligatoria por dos personas distintas, aplicada mediante branch protection de GitHub (bloqueo técnico, no solo acuerdo de equipo). Este es un cambio de configuración de plataforma futuro, no algo que se implemente ahora.

---

## 2. Garantías actuales

Reconstruido leyendo el código real, no de memoria.

### SvelteKit / Vercel
- **Qué protege:** el límite entre lo que se ejecuta en el servidor y lo que llega al navegador; no hay sesión de servidor que gestionar ni proteger.
- **Dónde:** ausencia deliberada de `src/hooks.server.ts` en todo el repo. Toda la autenticación es vía JWT de cliente (`@supabase/supabase-js`, sin `@supabase/ssr`).
- **Cómo se rompe:** alguien añade `hooks.server.ts`, `+page.server.ts` con lógica de sesión, o `@supabase/ssr` — cambia el modelo de amenazas completo de la aplicación. **Ahora tiene control dedicado — ver G-SSR en §4.**
- **Nivel de comprobación hoy:** ninguno (TRIPWIRE nuevo diseñado, no implementado).

### Supabase Auth
- **Qué protege:** identidad del usuario para RLS y funciones `SECURITY DEFINER`.
- **Dónde:** flujo PKCE, sesión en `localStorage`/memoria del cliente, nunca en cookies de servidor (`15_analisis_alcanzabilidad_cookie.md`).
- **Cómo se rompe:** migrar a `@supabase/ssr` sin revisar el modelo de amenazas (activaría además `serialize()` de `cookie@0.6.0`, hoy inalcanzable). Cubierto por G-SSR.
- **Principio de identidad (corregido en esta revisión, ver §1.1 y Anexo — antes decía "falsificar `auth.uid()` es estructuralmente imposible"):** las decisiones de autorización no deben confiar en identidad suministrada por el cliente. La identidad debe derivarse de sesión/JWT validado por Supabase y de `auth.uid()` cuando corresponda — nunca de un campo del body de una petición, de una cabecera custom, ni de `raw_user_meta_data`.

### RLS (Row Level Security)
- **Qué protege:** que cada tabla solo devuelva/acepte filas permitidas al rol que hace la petición.
- **Dónde:** 47 tablas creadas en `supabase/migrations/*.sql`, 47 con `alter table ... enable row level security` — comparación de nombres exacta, verificada.
- **Cómo se rompe:** una migración nueva olvida el `enable row level security`. **Corrección de esta revisión (Kimi RT-001, parcialmente válida):** la comparación de nombres por texto tiene puntos ciegos reales — no cubre tablas en un esquema distinto de `public`, identificadores entrecomillados/con mayúsculas, ni tablas creadas dinámicamente por una función. Los 47 casos reales de hoy son 100% `public.snake_case` sin comillas, así que el punto ciego no es explotable hoy, pero el control debe normalizar identificadores antes de comparar y declarar explícitamente que su alcance es el esquema `public`. **Nivel: TRIPWIRE, no garantía** — para una garantía real haría falta comparar contra `pg_class.relrowsecurity` en una base real (ver P1).
- **Nivel de comprobación hoy:** ninguno.

### RPC (funciones invocables vía `rpc()`)
- **Qué protege:** qué puede hacer cada rol (`anon`/`authenticated`) por función, independientemente de RLS.
- **Dónde:** 23 funciones reclasificadas en la migración candidata `0042` (12 escritura privada + 11 lectura pública), verificable solo con `has_function_privilege()` contra una base real.
- **Cómo se rompe:** una función nueva se crea sin `revoke`/`grant` explícito y hereda `EXECUTE` de `PUBLIC` — ya pasó dos veces (H-03 original, y las 2 funciones encontradas en staging).
- **Nivel de comprobación hoy:** ninguno en CI. Manual (`07_preflight_produccion.sql`).

### `SECURITY DEFINER`
- **Qué protege:** que una función que corre con privilegios del propietario no pueda secuestrarse manipulando `search_path`.
- **Dónde:** ~33 funciones `SECURITY DEFINER`, la mayoría con `search_path` fijado.
- **Cómo se rompe:** una función nueva omite `set search_path` — **no detectable de forma fiable por texto** (verificado con un intento real de `grep` que produjo ruido). Además — **corrección de esta revisión, Kimi RT-004, el hallazgo más fuerte de todo su informe:** incluso con `search_path` fijado a `'public'` (no vacío), la función sigue siendo vulnerable a secuestro de nombre **si `anon`/`authenticated` tienen `CREATE` sobre el esquema `public`**. Este control ya existe, redactado, en `07_preflight_produccion.sql` §4 desde una sesión anterior — la v1 de esta baseline lo omitió por completo al listar P-D1/P-D2 sin incluirlo. Corregido en §4 de este documento (control nuevo, P-D0).
- **Nivel de comprobación hoy:** ninguno en CI. Manual.

### Edge Functions
- **Qué protege:** el único punto del código que usa `SUPABASE_SERVICE_ROLE_KEY`.
- **Dónde:** una única función, `supabase/functions/delete-account/index.ts`. Identidad derivada correctamente del JWT del llamante (`callerClient.auth.getUser()`), no del body.
- **Cómo se rompe:** una Edge Function nueva usa `service_role` y deriva identidad de un campo del body o de una cabecera manipulable. **Elevado en esta revisión de WARN a GATE — ver §4.**
- **Nivel de comprobación hoy:** ninguno. Esta función no tiene ningún test.

### Supabase Storage
- **Qué protege:** archivos subidos por usuarios.
- **Dónde:** un único bucket, `verification-documents`, `public = false`, `file_size_limit`/`allowed_mime_types` explícitos, políticas RLS sobre `storage.objects` con ruta prefijada por `uid`.
- **Cómo se rompe:** un bucket nuevo con `public = true` sin darse cuenta, o sin límites de tamaño/tipo. **Ampliado en esta revisión — ver §4.**
- **Nivel de comprobación hoy:** ninguno.

### Roles `organizer`/`moderator`/`admin`
- **Qué protege:** quién puede moderar, aprobar convocatorias, ver documentos privados de terceros.
- **Dónde:** columna `profiles.role`, función `is_moderator_or_admin()` (consulta la tabla, no el JWT). Trigger `prevent_role_self_update` impide que un usuario **sin privilegios de staff** cambie cualquier rol.
- **Matiz importante, no documentado en la v1:** el trigger bloquea el cambio de rol solo cuando quien actúa **no** es ya moderador/admin. Esto significa que un `moderator` autenticado que se cambie su propio rol a `admin` **no queda bloqueado por este trigger** (el trigger fue diseñado para impedir auto-escalación desde una cuenta sin privilegios, no escalación lateral entre roles de staff). No se ha confirmado si esto es una decisión de producto deliberada o un descuido — **decisión abierta, ver §17**.
- **Cómo se rompe:** una función/endpoint nuevo lee `raw_user_meta_data`/JWT claims en vez de la tabla `profiles`.
- **Cambios de rol no se auditan hoy en ningún sitio** (a diferencia de las acciones de moderación de contenido, que sí quedan en `audit_logs`).
- **Nivel de comprobación hoy:** ninguno.

### Participación y votos
- **Qué protege:** anonimato/agregación de la opinión ciudadana; integridad de "un voto por cuenta y ronda".
- **Dónde:** umbral de k-anonimato (`p_min_threshold integer default 30`) antes de desgloses territoriales; funciones de agregado que solo exponen `count`/`avg`. **Verificado en esta revisión (respuesta a Kimi RT-012):** las 3 familias de tablas de participación relevantes ya tienen restricción `UNIQUE` a nivel de base de datos, no solo lógica de aplicación — `concern_listening_responses` (`unique (round_id, option_code, user_id)`, `unique (round_id, user_id, rank)`), `next_block_votes` (`unique (round_id, user_id)`, con comentario explícito en la propia migración sobre por qué existe), `measure_participation_responses` (`unique (round_id, measure_id, user_id)`). Esta propiedad además **ya se probó una vez bajo concurrencia real** (prueba RT-009 de una sesión anterior de esta misma auditoría, con resultado correcto), pero no como parte de una batería de regresión repetible — ver §7.
- **Cómo se rompe:** una función de agregado nueva se marca como "lectura pública" sin comprobar que de verdad agrega.
- **Nivel de comprobación hoy:** ninguno automatizado; probado manualmente una vez.

### Dependencias
- **Qué protege:** que una CVE en una librería no llegue a producción.
- **Dónde:** `pnpm-workspace.yaml` (`overrides`), `pnpm audit`.
- **Cómo se rompe:** ya ocurrió y se corrigió en esta sesión (`sharp@0.34.5`, 4 CVEs de libvips). También se documentó que una `devDependency` (`@sveltejs/kit`) puede llevar código de runtime (`cookie@0.6.0`).
- **Nivel de comprobación hoy:** ninguno en CI. Manual.

### Variables de entorno
- **Qué protege:** que credenciales reales no queden en el repositorio.
- **Dónde:** `.gitignore`: patrón `.env*` ignorado, con excepción para `.env.example`, `.env.test`, `.env.staging.example`, `.env.production.example` — verificado, ninguno de los 4 lleva credenciales reales.
- **Cómo se rompe:** `git add -f` de un `.env` real, o pegar un valor real dentro de uno de los 4 archivos permitidos.
- **Nivel de comprobación hoy:** ninguno más allá de `.gitignore` (no protege contra `-f`).

### Secretos (más allá de `.env`)
- **Qué protege:** tokens de Vercel, `SUPABASE_ACCESS_TOKEN`, JWT reales, bypass de protección de despliegue.
- **Cómo se rompe:** copiar-pegar un token en un documento de `/seguridad`.
- **Nivel de comprobación hoy:** ninguno.

### Rutas SSR/CSR
- **Qué protege:** que páginas públicas sigan accesibles sin sesión y que páginas/acciones privadas no se sirvan a quien no debería.
- **Cómo se rompe:** reclasificar mal una función de lectura pública como privada rompe silenciosamente páginas públicas sin lanzar error visible (casi pasó en la primera versión de `0042`).
- **Nivel de comprobación hoy:** ninguno automatizado. **Importante (aclaración de esta revisión, respuesta a Kimi RT-006):** el smoke test de B11 (§4) comprueba disponibilidad (¿la ruta responde 200?), **no** autorización (¿la ruta sigue mostrando los datos correctos sin sesión, o solo "no se ha caído"?). Son propiedades distintas — ver §9.

### Staging / Production
- **Qué protege:** que un experimento en staging no pueda tocar datos reales.
- **Dónde:** dos proyectos Supabase separados; variables de entorno `sensitive` distintas por entorno en Vercel.
- **Cómo se rompe:** apuntar manualmente Preview a producción, o viceversa.
- **Hallazgo de esta auditoría:** un evento de producción (`castellon-a7bc01aa`) existe también, con datos idénticos, en `convoca-staging` — semilla copiada deliberadamente en el pasado, no un cruce activo, pero ilustra que nada impide ese tipo de copia sin dejar rastro.
- **Nivel de comprobación hoy:** ninguno.

### Migraciones SQL
- **Qué protege:** que el estado real de la base de datos sea exactamente el que dice el repositorio.
- **Dónde:** 41 migraciones, numeración secuencial, seguimiento vía `supabase_migrations.schema_migrations`.
- **Cómo se rompe:** un cambio aplicado a mano en el SQL Editor de producción nunca documentado como migración.
- **Nivel de comprobación hoy:** ninguno en CI. Este proyecto tampoco tiene integración Git↔Vercel activa (todos los deployments son `source: cli`).

---

## 3. Amenazas de regresión (síntesis)

1. Tabla nueva sin `enable row level security`.
2. Función nueva sin `revoke`/`grant` explícito → hereda `EXECUTE` de `PUBLIC` (ya pasó 2 veces).
3. Reclasificación incorrecta de "lectura pública" a "privada" (casi pasó en `0042`).
4. CVE en dependencia de producción o en `devDependency` que llega al runtime (`sharp`, `cookie`).
5. Secreto pegado en un documento de `/seguridad`.
6. Eliminar `engines.node` → Vercel vuelve silenciosamente a su default de plataforma (`24.x`).
7. Migración aplicada a mano en producción sin pasar por el repo.
8. Cambio de configuración de Vercel/Supabase sin control de versión.
9. Función pública de agregado que empieza a devolver un campo identificable.
10. Edge Function nueva con `service_role` que deriva identidad del body.
11. **(Nueva)** Aparición de `hooks.server.ts`/`+page.server.ts` con sesión/`@supabase/ssr` sin revisión del modelo de amenazas.
12. **(Nueva)** `anon`/`authenticated` con `CREATE` sobre el esquema `public` — habilitaría secuestro de nombre contra cualquier `SECURITY DEFINER` con `search_path` no vacío.
13. **(Nueva)** Modificación o eliminación de un trigger crítico (`prevent_role_self_update`) sin revisión.

---

## 4. Controles GATE y TRIPWIRE (bloquean o exigen decisión humana en el PR)

Cada control indica su **nivel** (§1.1). Ninguno etiquetado TRIPWIRE se describe como si demostrara una propiedad de seguridad.

| # | Control | Nivel | Cómo se implementa | Qué demuestra realmente |
|---|---|---|---|---|
| B1 | Nueva tabla sin RLS | **TRIPWIRE** | Diff de migraciones: comparar `create table public\.\w+` (normalizado, sin comillas/mayúsculas) vs `alter table public\.\w+ enable row level security`, acumulado sobre todas las migraciones. | Que el patrón de texto conocido aparece o no. No cubre esquemas distintos de `public` ni tablas creadas dinámicamente por función — declarado explícitamente como límite, no ocultado. Complementar en P1 con una comprobación real contra `pg_class.relrowsecurity`. |
| B2 | `disable row level security` literal en migración nueva | **TRIPWIRE** (de altísima confianza — no hay variante legítima conocida de este comando en este esquema) | `grep -i` sobre archivos añadidos del PR. | Que el literal exacto no aparece. No es una demostración de que RLS esté "bien"; es la ausencia de la única forma documentada de desactivarla. |
| B3 | Migración fuera de secuencia o número duplicado | **TRIPWIRE** | Verificar `NNNN_descripcion.sql` = último número + 1. | Consistencia estructural del nombre de archivo, nada sobre el contenido. |
| B4/B5 | `pnpm install --frozen-lockfile` / `pnpm build` fallan | **GARANTÍA VERIFICADA** (de una propiedad funcional, no de seguridad) | Ejecutar en CI. | Que el lockfile está sincronizado y que el código compila — hecho determinista de la propia herramienta. |
| B6+W1 | Política de dependencias (ver §10, reestructurada) | **GARANTÍA VERIFICADA** (respaldada por la base de advisories de npm) + **GATE** (para el caso ambiguo) | `pnpm audit --prod` y `pnpm audit` completo, ambos siempre, con clasificación de alcanzabilidad para lo que solo aparece en el segundo. | Que existen (o no) CVEs publicadas en el árbol de dependencias — no detecta vulnerabilidades no publicadas. |
| B7 | Secreto detectado en el diff del PR | **TRIPWIRE** | `gitleaks` con reglas propias (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `sbp_[a-f0-9]{40}`, tokens de Vercel, JWT de 3 segmentos, `postgres://` con credenciales, claves privadas). **Corrección de esta revisión (decisión del propietario):** no se allowlistea ningún archivo entero por ruta (ni `.env.test` ni los `.example`) — un secreto real pegado dentro de un archivo "permitido" pasaría inadvertido. La excepción se limita a los valores ficticios concretos ya existentes en esos archivos, marcados individualmente (huella/fingerprint de `gitleaks` por valor exacto, o comentario `# gitleaks:allow` en la línea concreta), nunca por archivo completo. | Que no aparece un patrón conocido de secreto — no prueba ausencia de secretos con forma no contemplada en las reglas. |
| B8 | `engines.node` ausente o distinto del esperado en `package.json` | **TRIPWIRE** (de la intención declarada) — la **GARANTÍA VERIFICADA** real de qué Node se usó de verdad es el log de build de Vercel, ya usada manualmente en el plan `17` | Comprobación literal del campo. | Que el campo tiene el valor esperado — no que el deployment realmente usó esa versión (eso se confirma aparte, en el log de build). |
| B9 | `SECURITY DEFINER` nuevo/modificado, **y (ampliado en esta revisión) trigger crítico nuevo/modificado/eliminado** | Detección: **TRIPWIRE**. Enforcement: **GATE** | `grep` de `security definer` y de los nombres del manifest de triggers críticos (§ nuevo, ver abajo) en el diff → activa el proceso de revisión de §1.2 (checklist + revisión defensiva independiente + aprobación explícita del mantenedor). **Checklist mínimo para el revisor** (resuelve la pregunta abierta de la v1 sobre "quién revisa y con qué criterio"): `search_path` explícito y restringido; validación de `auth.uid()` si la identidad importa; parámetros de usuario validados; `revoke`/`grant` explícito, no heredado de `PUBLIC`; comprobación de que no hay redefinición encubierta de una función/trigger existente con lógica distinta. | Que el patrón textual apareció (100% fiable para eso). **No demuestra que la función/trigger sea segura** — esa demostración depende de la calidad de la revisión humana, que este control no puede medir. |
| **B9b** *(nuevo)* | **Manifest de triggers críticos** | — | Lista versionada en este documento (ampliable): **`prevent_role_self_update`**. Cualquier `create or replace function`/`drop trigger` que toque un nombre de este manifest activa el mismo GATE que B9. El sistema debe permitir añadir triggers futuros a este manifest sin rediseñar el control. | — |
| B10 | Política RLS `for select ... using (true)` | Detección: **TRIPWIRE**. Enforcement: **GATE** (sustituye por completo a la B10 de la v1) | **Corrección de fondo (Kimi RT-002, aceptada):** ya no se afirma que un nombre terminado en `_public` demuestre que la política es segura. Regla nueva: cualquier política nueva/modificada que introduzca `using (true)` debe (a) declarar explícitamente la intención de acceso público en su nombre, siguiendo la convención de la tabla/operación/ámbito ya en uso, **y** (b) activar el mismo proceso de revisión de seguridad de §1.2, sin excepción, independientemente de si el nombre "parece" correcto. | El nombre documenta intención declarada por el autor. **No prueba que la política sea segura** — solo que alguien afirmó, por escrito, qué se pretendía. La verificación real de qué columnas expone la política sigue siendo responsabilidad de la revisión humana del GATE. |
| **G-SSR** *(nuevo)* | Cambio de modelo de sesión | Detección: **TRIPWIRE**. Enforcement: **GATE** | Detecta en el diff: aparición de `src/hooks.server.ts`/`.js`, cualquier `+page.server.ts` nuevo que importe `@supabase/ssr` o use `cookies`, o `@supabase/ssr` apareciendo en `package.json`/`pnpm-lock.yaml`. **No significa que estos elementos estén prohibidos** — significa que el PR es, por definición, un cambio de arquitectura de seguridad y no puede mergearse sin una revisión explícita del modelo de amenazas (qué asume hoy la baseline sobre "no hay sesión de servidor", y cómo cambia). | Que apareció el patrón. La revisión del modelo de amenazas es responsabilidad humana del GATE, no del `grep`. |
| **G-SR** *(antes W4)* | Edge Function nueva/modificada que usa `service_role` | Detección: **TRIPWIRE**. Enforcement: **GATE** (elevado de WARN a GATE en esta revisión, aceptando Kimi RT-005) | Checklist obligatorio del revisor, mínimo: (1) justificación explícita de por qué necesita privilegios administrativos; (2) autenticación previa a cualquier operación privilegiada; (3) identidad derivada del JWT/sesión validado, nunca de un campo del body ni de una cabecera custom; (4) errores sanitizados (sin filtrar estructura interna); (5) revisión de CORS; (6) revisión de rate limiting; (7) tests que cubran como mínimo los casos ya probados a mano para `delete-account` en `13_...md` §2; (8) confirmación de que el secreto (`SUPABASE_SERVICE_ROLE_KEY`) nunca se registra en logs ni se devuelve en una respuesta. | La detección de `service_role` en el diff es fiable. El cumplimiento real de los 8 puntos depende de la revisión humana — no se automatiza el juicio semántico. |
| **G-STORAGE** *(antes W5, ampliado)* | Bucket de Storage nuevo/modificado | Detección: **TRIPWIRE**. Enforcement: **GATE** | Revisar explícitamente: `public` flag (justificación si `true`); `file_size_limit` definido; `allowed_mime_types` definido; políticas para cada operación relevante (`select`/`insert`/`update`/`delete`) **o justificación explícita de por qué falta alguna** — **la ausencia de una política no se asume insegura por defecto**: `attendance_responses`/`attendance_rate_limits` ya demuestran en este mismo repo que "RLS habilitado sin ninguna política" es un patrón *deny-all* deliberado y documentado, el estado más restrictivo posible, no una laguna; propiedad/ruta de objetos (convención de prefijo por `uid`, como ya hace `verification-documents`). | Presencia/ausencia de cada propiedad en la migración. No prueba que las políticas presentes sean semánticamente correctas — eso es revisión humana. |
| B11 | Smoke test de rutas críticas contra el Preview Deployment | **GARANTÍA VERIFICADA — pero de una propiedad muy acotada** | `curl` contra `/`, una ruta de Pulso pública, `/pulso/proximo-bloque`, `/og/convocatorias/<fixture-fijo>` (200 + PNG válido) y `/og/convocatorias/<slug-inexistente-fijo>` (404). | **Aclaración obligatoria de esta revisión (Kimi RT-006, aceptado):** esto demuestra **disponibilidad y regresión funcional básica** contra un deployment real — no es una prueba de autorización. Que una ruta devuelva `200` no confirma que los datos mostrados sean los correctos para un visitante sin sesión, ni que una función reclasificada de pública a privada no haya roto silenciosamente esa página (ver §9 para dónde vive la prueba de autorización real). |

---

## 5. Controles WARN (justificación obligatoria, no bloquean)

| # | Control | Nivel | Por qué no es GATE/BLOCK todavía |
|---|---|---|---|
| W2 | Cambio de versión resuelta de un paquete sensible (`sharp`, `@supabase/*`, `@vercel/*`, `cookie`) sin CVE nueva asociada | **TRIPWIRE** | Barato: detecta que alguien tocó la resolución de un paquete ya "quemado" una vez, sin necesitar entender por qué. |
| W3 | `drop policy` no seguido inmediatamente de `create policy` sobre la misma tabla/operación | **TRIPWIRE** (detección) | Comparar la fuerza semántica de dos políticas no es fiable por texto — se marca para revisión humana, no se automatiza el juicio. |
| W6 | PR que toca `supabase/functions/*` sin ningún test nuevo/modificado | **TRIPWIRE** | Hoy `delete-account` no tiene tests — exigir retroactivamente bloquearía todo; se avisa para no acumular deuda sin que quede constancia consciente. |
| **W-ERR** *(nuevo)* | `raise exception` con interpolación de variables (`%`) en una función accesible por `anon`/`authenticated` | **TRIPWIRE, preventivo** | **Aclaración explícita:** verificado con `grep` exhaustivo sobre las 41 migraciones reales — **este patrón no existe hoy en CONVOCA**, ningún mensaje de error interpola variables. Este control no corrige nada existente; previene que se introduzca en el futuro (fuga de estructura interna o de existencia de registros vía mensajes de error descriptivos). |

---

## 6. Controles PERIODIC (no corren en cada PR)

| # | Control | Nivel | Cadencia | Por qué no es por-PR |
|---|---|---|---|---|
| **P-D0** *(nuevo, prioritario)* | `has_schema_privilege('anon', 'public', 'CREATE')` y lo mismo para `authenticated` | **GARANTÍA VERIFICADA** | Semanal contra staging y producción, hasta que exista DB efímera en CI (entonces sube a **GATE por-PR**, ver §15/P0-P1) | Requiere una base real. **Este control ya existía, redactado, en `07_preflight_produccion.sql` §4 — se había omitido de la v1 de esta baseline pese a citarse esa misma fuente para otros controles (Kimi RT-004).** Ambos valores deben ser `false`; si alguno es `true`, es un hallazgo crítico independiente de cualquier otro control. |
| P-D1 | `search_path` real de cada `SECURITY DEFINER` (`pg_proc.proconfig`) | **GARANTÍA VERIFICADA** | Semanal contra staging, o por-PR si el coste de una DB efímera en CI resulta aceptable (evaluar de verdad el coste antes de descartarlo — probablemente sea bajo, ver §16) | No fiable por texto, ya demostrado. |
| P-D2 | `has_function_privilege` real de las 23 funciones reclasificadas + cualquier función nueva, contra un manifest versionado | **GARANTÍA VERIFICADA** | Igual que P-D1 | Requiere DB real; es `07_preflight_produccion.sql` §3/§6 automatizado. |
| P-D3 | Forma de fila devuelta por cada función "lectura pública" vs manifest versionado | **GARANTÍA VERIFICADA** | Semanal, o en cada cambio a esas funciones | Comparación de esquema de salida real, no regex sobre el SQL. |
| P-D4 | Huella de migraciones aplicadas vs repositorio | **GARANTÍA VERIFICADA** | Antes de cada promoción a producción (ya obligatorio en el plan `17`, Bloque B) — considerar cadencia diaria si el volumen de cambios lo justifica | Estado desplegado, no del PR. Nota: esto defiende contra *drift accidental*, no contra un actor con acceso administrativo legítimo comprometido — ese escenario necesita controles de acceso/alertas de plataforma, no una comprobación de drift más frecuente. |
| P-D5 | Configuración real de buckets vs migraciones | **GARANTÍA VERIFICADA** | Semanal | Drift de plataforma. |
| **P-D6** *(nuevo)* | Manifest de tablas con RLS habilitado y sin ninguna política, marcadas explícitamente como *deny-all intencionado* | **TRIPWIRE con allowlist explícita** | Cada vez que cambie la lista de tablas sin política | **No se crea un gate que trate "RLS sin políticas" como error por defecto** — eso generaría falsos positivos contra patrones ya existentes y deliberados en este repo (`attendance_responses`, `attendance_rate_limits`). El control solo alerta sobre una tabla **nueva** en esta situación que no esté ya en el manifest de "intencionadas". |
| P-S1 | CORS efectivo de Edge Functions/gateway | **GARANTÍA VERIFICADA** (inspección directa) | Mensual, o tras cambio de plataforma | Confirmado que el CORS abierto viene de la plataforma, no del código. |
| P-S2 | Rate limiting de Edge Functions | **GARANTÍA VERIFICADA** (inspección directa) | Mensual | No existe hoy; revisión de si sigue siendo aceptado. |
| P-A1 | Cuentas `moderator`/`admin` sin MFA verificado | **GARANTÍA VERIFICADA** | Semanal (ver §9) | Estado de cuentas, no de código. |
| P-DEP1 | `pnpm audit` completo, hallazgos de build/CI puro sin alcanzabilidad | **GARANTÍA VERIFICADA** (informe) | Semanal / Dependabot | Volumen de ruido demasiado alto para bloquear cada PR. |

---

## 7. Matriz automática de identidades — arquitectura de tests

**Diseño de arquitectura, no las pruebas en sí.** Esta matriz, cuando se implemente, es la única vía realista hacia una **GARANTÍA VERIFICADA** de autorización — a diferencia del smoke test de B11 (disponibilidad) o de los GATE de revisión humana (juicio, no prueba).

### Fixtures sintéticos necesarios

- **6 identidades:** `anon` (ausencia de sesión), `user_a`, `user_b` (sin relación entre sí), `organizer`, `moderator`, `admin`.
- **Datos mínimos:** una convocatoria propia de `organizer`, una respuesta de participación de `user_a` en una ronda abierta, un documento de verificación de `organizer`.
- **Aislamiento:** contra `convoca-staging` únicamente, prefijo de email reservado, limpieza obligatoria verificada al final del run.
- **Método de simulación de rol (ya obligatorio en `09_pruebas_parche_0042.md`):** cliente `supabase-js` real por identidad — nunca el SQL Editor ni el rol `postgres`.

### Propiedades a demostrar

| Propiedad | anon | user_a sobre user_b | user_a sobre sí mismo | organizer | moderator/admin |
|---|---|---|---|---|---|
| Lee contenido público | Debe poder | — | — | — | — |
| Ejecuta función de escritura privada | Debe fallar | — | — | — | — |
| Lee datos privados de otro usuario | — | Debe fallar | — | — | Debe poder (staff) |
| Modifica datos de otro usuario | — | Debe fallar | — | — | Solo acciones de moderación explícitas (`audit_logs`) |
| Actúa con identidad ajena | — | Debe fallar — la identidad se deriva del JWT validado por Supabase, no de ningún valor que el cliente pueda establecer directamente (ver §2, principio de identidad corregido) | — | — | — |
| Cambia su propio rol (sin ser ya staff) | — | — | Debe fallar (`prevent_role_self_update`) | — | — |
| **(Nuevo, decisión abierta — ver §17)** `moderator` cambia su propio rol a `admin` | — | — | — | — | Hoy no está bloqueado por el trigger — pendiente decidir si debe estarlo |
| Ejecuta acción de moderador/admin | Debe fallar | Debe fallar | Debe fallar | Debe fallar | Debe poder, y quedar en `audit_logs` |
| Sube/lee documento de verificación ajeno | — | — | — | Debe fallar sobre el de otro organizer; debe poder sobre el propio | Debe poder leer cualquiera (staff) |
| **(Nuevo, respuesta a Kimi RT-012)** Llamadas paralelas a una función de voto/participación con los mismos parámetros | — | Solo una debe tener efecto; sin duplicados | — | — | — |

**Nota sobre la fila de concurrencia:** no se añade porque exista sospecha de que falle — al contrario, se verificó en esta misma revisión que las 3 tablas de participación relevantes ya tienen restricción `UNIQUE` a nivel de base de datos, y que esta propiedad concreta ya se demostró una vez bajo concurrencia real (prueba RT-009, sesión anterior de esta auditoría). Se añade **para que esa demostración puntual se convierta en una regresión repetible**, no en un hecho que solo se sabe leyendo el historial de esta auditoría.

### Qué NO cubre esta matriz (decisiones abiertas, ver §17)

- Auditoría de cambios de rol hechos por staff (ni sobre sí mismos ni sobre terceros).
- Límites de tasa (no existen hoy).

---

## 8. CI propuesto (diseño — no se añade ningún workflow todavía)

Hoy no existe `.github/workflows/`, no hay branch protection activable (repo privado, plan actual de GitHub sin Advanced Security), no hay git hooks, no hay Husky. La baseline parte de cero en infraestructura de CI.

```
feature branch
  → PR contra main
    → TRIPWIRE/GARANTÍA VERIFICADA estáticos (minutos)
    → B11 (smoke test de disponibilidad, requiere Preview)
    → GATEs activados según lo que toque el diff (revisión humana con checklist, §1.2)
    → WARN (con justificación registrada)
  → aprobación explícita del mantenedor (proceso de §1.2; dos personas cuando exista un segundo mantenedor)
  → merge (merge commit, no squash — trazabilidad de commits individuales, mismo motivo que el plan `17`)
  → producción (paso manual separado, `vercel deploy --prod`, nunca automático)
```

**Nota de diseño específica de este proyecto:** sin integración Git↔Vercel activa, el Preview de B11 no se genera solo con un push — decisión abierta entre reconectar la integración nativa o que el propio CI ejecute `vercel deploy` (sin `--prod`). Ver §17.

**Checks que deberían ser `required`** (cuando el plan de GitHub lo permita): todos los TRIPWIRE/GARANTÍA VERIFICADA de §4 como checks obligatorios, prohibición de force-push a `main`, PR obligatorio, aprobación explícita del mantenedor según §1.2 (dos personas cuando exista un segundo mantenedor, aplicado por branch protection).

---

## 9. Arquitectura de tests

- **Estado actual: cero tests.** `vitest` está en `devDependencies`, sin ningún archivo `*.test.ts` en el repo.
- **Distinción obligatoria de esta revisión:** el smoke test de B11 (§4) y la matriz de identidades de §7 **prueban propiedades distintas** — B11 es disponibilidad/regresión funcional (¿la ruta responde?), la matriz de §7 es autorización real (¿responde *lo correcto* para *esa identidad*?). Un pipeline que solo tenga B11 y lo llame "cobertura de seguridad" se equivoca exactamente en el punto que señaló Kimi (RT-006): el incidente real de la primera versión de `0042` (reclasificación que habría roto páginas públicas) lo habría detectado la matriz de §7, no un smoke test de código HTTP.
- **Capas, en orden de prioridad real de implementación:**
  1. Matriz de identidades (§7) — mayor valor de seguridad por esfuerzo, ya se ejecutó a mano una vez.
  2. Smoke tests de disponibilidad (B11) — coste de automatizar bajo, ya ejecutados a mano dos veces.
  3. Tests unitarios de funciones puras (`slugify`, `formatEventDate`) — bajo valor de seguridad directo, coste muy bajo.
  4. Tests de Edge Functions (`delete-account`, futuras) — hoy inexistentes.
- **Dónde corren:** contra `convoca-staging`, nunca contra producción ni datos copiados de producción.

---

## 10. Política de dependencias

Explícitamente **no** "cualquier HIGH bloquea siempre". P0 ejecuta **ambos** comandos siempre, no solo `--prod`:

| Comando | Situación | Acción | Nivel | Ejemplo real |
|---|---|---|---|---|
| `pnpm audit --prod` | HIGH/CRITICAL nuevo | **GATE tipo BLOCK**, salvo excepción previamente aprobada y registrada | GARANTÍA VERIFICADA (de "existe un advisory publicado"), enforcement GATE | `sharp@0.34.5` — 4 CVEs de libvips, corregido con override |
| `pnpm audit` completo | HIGH/CRITICAL que **solo** aparece aquí (no en `--prod`) | Requiere clasificación de alcanzabilidad explícita (inspección del bundle SSR, búsqueda de llamadas — como se hizo a mano para `cookie`). **WARN obligatorio** mientras no se confirme alcanzable; **escala a GATE tipo BLOCK** en cuanto se confirma que el código vulnerable es alcanzable por una petición externa | TRIPWIRE (detección) + GATE (decisión de alcanzabilidad) | `cookie@0.6.0` vía `@sveltejs/kit` — presente en el bundle, pero `serialize()` (la función vulnerable) nunca se invoca porque CONVOCA no llama a `cookies.set()` — confirmado en `15_...md`, WARN aceptado con evidencia, no escalado |
| `pnpm audit` completo | HIGH/CRITICAL en tooling de build/CI puro, sin ruta hacia el bundle | PERIODIC, informe semanal | GARANTÍA VERIFICADA (informe) | `fast-uri`/`brace-expansion` vía `eslint`/`workbox-build` — confirmado que no llegan al bundle desplegado |
| — | Cambio de versión resuelta de un paquete ya "quemado" sin CVE nueva | WARN (tripwire) | TRIPWIRE | — |
| — | Excepción temporal aceptada | Registrar en archivo versionado: paquete, CVE, fecha, motivo, **fecha de revisión obligatoria** (nunca "indefinido") | — | El caso de `cookie` sería la primera entrada real |
| — | Excepción que supera su fecha de revisión sin resolverse | Escala automáticamente a GATE tipo BLOCK en el siguiente PR que la toque | — | — |

**Dependabot:** activar para npm/pnpm, cadencia semanal, mismo pipeline que un PR humano, sin bypass.

---

## 11. Política de secretos

- **GitHub Secret Scanning / Push Protection de repositorio:** confirmado que no está disponible en el plan actual para este repositorio privado. Se activa automáticamente y gratis al hacerse público (§14).
- **Push Protection de usuario, distinta de la anterior (aclaración de esta revisión):** GitHub ofrece además una protección **a nivel de cuenta individual**, que un colaborador puede activar para sus propios pushes en los repositorios a los que tiene acceso, **independientemente de si el repositorio/organización la tiene activada** a nivel de repo. Son dos ajustes distintos, con alcances distintos — la primera protege el repositorio para todos; la segunda protege los pushes de una persona concreta, útil desde ya, sin depender del plan de GitHub del repositorio.
- **`gitleaks`:** opción viable hoy. **Corrección de esta revisión:** las excepciones nunca son por archivo completo (ver B7) — son por valor/línea concreta, documentada. Un `.env.test` allowlistado por ruta completa es exactamente el tipo de "regla ingenua" que esta baseline dice evitar en otros sitios.
- **Directorios cubiertos, con resultado de la inspección real:** `src/` (sin secretos), `supabase/` (`SUPABASE_SERVICE_ROLE_KEY` correctamente leída de `Deno.env`, nunca hardcodeada), `scripts/` (no existe hoy, entra en alcance si se crea), `docs/` (no existe como carpeta), `seguridad/` (verificado repetidamente que no contiene secretos, pero por disciplina manual, no por gate — es el directorio de mayor riesgo estructural porque documenta información operacional real sesión tras sesión).

---

## 12. Política de base de datos / RLS / RPC

- **Nunca confiar en análisis estático para:** `search_path` real, `has_function_privilege` real, `has_schema_privilege` real (nuevo en esta revisión — P-D0), forma real de las filas devueltas. Requieren base de datos real (efímera o staging).
- **Sí se puede confiar en análisis estático (como TRIPWIRE, nunca como garantía) para:** cobertura de RLS por nombre de tabla, presencia de `disable row level security`, presencia de `security definer`/triggers críticos, numeración de migraciones, declaración de intención en nombres de política.
- **Toda función/RPC/trigger crítico nuevo exige una decisión explícita y versionada**, no una inferencia por prefijo de nombre — el propio historial de esta auditoría demuestra que clasificar por prefijo (`get_`/`set_`) casi rompió páginas públicas en `0042`.

---

## 13. Privacidad de la participación

1. **Minimización:** ninguna tabla de participación almacena IP junto al voto — verificado, mantenerlo así es la postura por defecto.
2. **Separación de auditoría administrativa y actividad ciudadana:** `audit_logs` registra acciones de moderación de contenido, nunca la participación de un ciudadano normal. Los cambios de rol tampoco se auditan hoy — laguna real, no cerrada por este documento.
3. **Agregados públicos sin datos individuales:** funciones de lectura pública devuelven `count`/`avg`/`group by`; umbral de k-anonimato (`default 30`) en desgloses territoriales.
4. **Retención:** no definida hoy — decisión de producto abierta, no resoluble por este documento.
5. **Qué puede ver un administrador (corregido en esta revisión, decisión del propietario):** **no se establece que `moderator`/`admin` tengan acceso general a todos los datos privados** como si fuera una garantía normativa aceptada por defecto. El estado actual (RLS `own_or_staff` en varias tablas) es una decisión de diseño ya tomada por necesidad de moderación de contenido reportado, pero **debe diseñarse permiso por tipo de dato/tabla bajo el principio de mínimo privilegio**, no asumirse como "staff ve todo". **Decisión pendiente explícita, no resuelta aquí:** ¿puede el staff, en la práctica actual, relacionar la identidad de un ciudadano con el sentido de su voto/participación en alguna combinación de tablas/vistas? No convertir el estado actual en garantía normativa sin decidirlo primero — ver §17.

---

## 14. Open-source readiness

Premisa: **"un tercero conoce todo el código, tablas, RPC, políticas y arquitectura."**

**Se mantiene de la v1:**
- La seguridad de CONVOCA no depende de que el código sea secreto — RLS/RPC/`SECURITY DEFINER` bien configurados siguen funcionando con el atacante leyendo el código fuente completo.
- Revisión previa de `/seguridad` completa bajo la premisa "esto lo va a leer cualquiera", no "esto lo va a leer el equipo".
- No publicar secretos, dumps de datos reales, datos reales de usuarios, tokens, logs ni backups (inventario ya hecho en la v1: ninguno encontrado trackeado hoy).

**Añadido en esta revisión (decisión del propietario):**
- **Antes de hacer público el repositorio: auditoría de TODO el historial de git, no solo de `HEAD`/el diff de un PR.** Un secreto commiteado y luego borrado en un commit posterior **sigue presente en el historial** y sería visible para cualquiera con `git clone` en cuanto el repo sea público, aunque `HEAD` esté limpio. Esto requiere una herramienta que escanee el historial completo (`gitleaks` soporta modo `git` sobre todo el histórico, no solo el árbol de trabajo) antes de la fecha de publicación, no el mismo gate incremental por-PR que corre hacia adelante.
- **Distinción correcta de las tres protecciones de GitHub relevantes aquí** (ver también §11): **Secret Scanning** (escanea contenido/histórico del repo, alerta), **Push Protection de repositorio** (bloquea un push que contenga un secreto detectado, a nivel de repo/organización, requiere plan compatible o repo público), **Push Protection de usuario** (ajuste de cuenta individual, protege los pushes de esa persona en cualquier repo al que tenga acceso, independiente del plan del repositorio). Las tres son gratuitas en repos públicos; solo la última está disponible ya, hoy, en este repo privado, si algún colaborador decide activarla para sí mismo.
- Identificadores de infraestructura (`project-ref` de Supabase, IDs de proyecto/equipo de Vercel citados en `/seguridad` o en esta conversación): no son secretos, pero reducen el trabajo de reconocimiento de un atacante — decisión abierta sobre si redactarlos antes de publicar (§17).

---

## 15. P0 / P1 / P2

### P0 — máximo 10 grupos, implementable de verdad tras cerrar el Bloque B

1. **Migraciones estructurales (TRIPWIRE, estático):** tabla sin RLS (B1) + `disable row level security` literal (B2) + numeración de migraciones (B3).
2. **Build reproducible (GARANTÍA VERIFICADA funcional):** `pnpm install --frozen-lockfile` + `pnpm build` (B4/B5) + `engines.node` presente con el valor esperado (B8).
3. **Dependencias — doble auditoría (GARANTÍA VERIFICADA + GATE):** `pnpm audit --prod` (bloquea HIGH/CRITICAL nuevo salvo excepción) **y** `pnpm audit` completo (WARN con clasificación de alcanzabilidad, escala a bloqueo si se confirma alcanzable) — política de §10.
4. **Secretos (TRIPWIRE, `gitleaks` con excepciones por valor, nunca por archivo):** B7 corregido.
5. **Cambios sensibles de base de datos — GATE de revisión con checklist:** `SECURITY DEFINER` nuevo/modificado **y** triggers críticos del manifest (`prevent_role_self_update`) — B9 + B9b.
6. **Políticas RLS `using(true)` — GATE, nombre documenta intención pero no la prueba:** B10 corregido.
7. **Cambio de arquitectura de sesión — GATE:** aparición de `hooks.server.ts`/`+page.server.ts` con sesión/`@supabase/ssr` — G-SSR.
8. **Edge Functions con `service_role` — GATE con checklist de 8 puntos:** G-SR (elevado de WARN).
9. **Storage — checklist para bucket nuevo/modificado, sin asumir que ausencia de política es insegura:** G-STORAGE (ampliado).
10. **Smoke test de disponibilidad contra Preview, explícitamente NO de autorización:** B11.

**Deliberadamente fuera de P0:** `has_schema_privilege`/`has_function_privilege`/`search_path` reales (P-D0/P-D1/P-D2 — necesitan DB efímera o staging, quedan PERIODIC hasta que ese suite exista), la matriz de identidades de §7 implementada de verdad (requiere fixtures y mantenimiento), MFA, auditoría de cambios de rol.

### P1 — siguiente etapa

- P-D0 (`CREATE` sobre `public` — sube a por-PR en cuanto exista DB efímera en CI, ver objetivo explícito del propietario).
- P-D1/P-D2 (search_path/has_function_privilege vía DB efímera o staging periódico — evaluar coste real antes de mantener el hedge "si es aceptable").
- Manifest versionado de clasificación de funciones (privada/pública).
- Matriz de identidades (§7) implementada de verdad, incluyendo el caso de concurrencia.
- Dependabot activado.
- Decisión y ejecución sobre integración Git↔Vercel.
- P-D6 (manifest de tablas RLS-sin-políticas intencionadas).

### P2 — madurez

- P-D3 (diff de forma de fila de funciones públicas).
- MFA para staff — requisito y verificación, no solo diseño.
- Auditoría de cambios de rol (hoy no existe, incluida la pregunta de si `moderator`→`admin` self-escalation debe auditarse o bloquearse).
- P-S1/P-S2 (CORS/rate limiting, formalizados).
- Auditoría de todo el historial de git + redacción de identificadores de infraestructura, antes de publicar el repo.
- Decisión de permisos de staff por tipo de dato (§13).

---

## 16. Coste estimado

| Grupo P0 | Coste implementación | Coste por PR | Valor de seguridad | Falsos positivos esperados |
|---|---|---|---|---|
| 1. Migraciones estructurales | Bajo | Segundos | Alto | Muy bajos |
| 2. Build reproducible | Bajo (comandos ya existen) | 1-2 min | Alto (funcional, no solo seguridad) | Nulos |
| 3. Doble auditoría de dependencias | Medio (mantener archivo de excepciones) | Segundos-minutos | Alto | Bajos si se mantiene al día |
| 4. Secretos (`gitleaks` por valor) | Medio-alto (afinar reglas + excepciones puntuales es más trabajo que excluir archivos enteros, a propósito) | Segundos | Muy alto | Medios al principio |
| 5. `SECURITY DEFINER`/triggers críticos | Bajo (config) | Depende del mantenedor — puede ser cuello de botella | Muy alto | Nulos en detección |
| 6. `using(true)` | Bajo | Segundos + tiempo de revisión | Medio-alto | Bajos en detección |
| 7. Cambio de arquitectura de sesión | Bajo | Segundos + tiempo de revisión | Alto (nunca antes cubierto) | Muy bajos — este patrón no aparece por accidente |
| 8. Edge Function `service_role` | Bajo (detección) / medio (checklist) | Tiempo de revisión | Muy alto | Nulos en detección |
| 9. Storage | Bajo | Segundos + tiempo de revisión si aplica | Medio-alto | Bajos |
| 10. Smoke test disponibilidad | Medio (Preview fiable + fixture fijo) | 1-3 min | Alto (acotado a disponibilidad, no autorización) | Bajos si el fixture es estable |
| P-D0 (`CREATE` sobre public) | Bajo si es contra staging/prod periódico; medio si sube a DB efímera por-PR | Depende de la vía | Muy alto (Kimi RT-004) | Bajos |
| Matriz de identidades (P1) | Alto (fixtures, limpieza, mantenimiento) | Minutos | Muy alto | Bajos si el aislamiento se respeta |

---

## 17. Decisiones todavía abiertas

1. Integración Git↔Vercel nativa vs. Preview generado íntegramente por GitHub Actions.
2. Política de retención de datos de participación ciudadana.
3. ¿Se audita el cambio de rol hecho por staff (sobre sí mismo o sobre terceros)? Relacionado directamente con el punto 4.
4. **¿Debe `prevent_role_self_update` bloquear también que un `moderator` se auto-promueva a `admin`?** Hoy no lo hace (hallazgo de esta revisión) — no se sabe si es deliberado.
5. ¿Cuándo se activa MFA obligatorio para staff — antes o después de abrir el código?
6. ¿Se redactan los `project-ref`/IDs de infraestructura de `/seguridad` antes de publicar, o se aceptan como bajo valor de reconocimiento?
7. ¿Es aceptable a largo plazo que `convoca-staging` contenga una copia de un evento real de producción (`castellon-a7bc01aa`)?
8. Coste real de una DB efímera en CI — determina si P-D0/P-D1/P-D2 pueden ser por-PR desde el principio en vez de periódicos.
9. **(Nueva)** ¿Puede el staff relacionar identidad ciudadana con sentido de voto/participación en alguna combinación de tablas/vistas hoy? No se ha decidido si esto debería poder pasar.
10. **(Ya no está abierta — resuelta en esta revisión)** ~~Quién es el segundo revisor de B9~~ → resuelto con el proceso de un único mantenedor de §1.2; queda abierto únicamente el momento en que se incorpore un segundo mantenedor real.

---

## Anexo — Correcciones al informe de Kimi (detalle en `20_analisis_informe_kimi.md`)

- **Aceptadas e incorporadas:** ausencia de control sobre `CREATE` en `public` (RT-004, la más importante), ausencia de control sobre cambio de arquitectura de sesión (RT-009), ausencia de control sobre triggers críticos (RT-007), inconsistencia de Storage entre inventario y controles (RT-008), B10 verificaba convención de nombres y no seguridad (RT-002), W4 debía ser GATE no WARN (RT-005).
- **Aceptadas parcialmente:** los "Vectores 1 y 2" de RT-001 (esquema no-`public`, comillas/mayúsculas) son ciertos como límite formal del check, pero de explotabilidad práctica baja hoy (0 precedentes en 47 tablas reales, y requerirían pasos adicionales visibles para ser alcanzables vía la API). P-D1/P-D2 deberían probablemente subir de "periódico condicionado al coste" a compromiso más firme (RT-010), pero el "recorrido del ataque" concreto que ilustra RT-010 mezcla dos fallos distintos (permisos + ausencia de chequeo de `auth.uid()` interno) que no tiene precedente en el código real de CONVOCA.
- **Rechazadas:** el "Vector 3" de RT-001 (`with (enable_row_level_security = true)`) **no es sintaxis válida de PostgreSQL** — verificado contra la documentación oficial (RLS solo se activa vía `ALTER TABLE`). RT-012 (doble voto) presenta como riesgo activo una propiedad que ya está protegida por restricciones `UNIQUE` reales, verificadas en esta revisión, y ya demostrada bajo concurrencia una vez. RT-011 (fuga en mensajes de error) presenta en presente un patrón que la verificación exhaustiva (`grep` sobre 41 migraciones) confirma que no existe hoy. El "Verdicto Provisional" trata que el documento sea "solo diseño, no implementado" como una debilidad estructural, cuando ese fue el alcance explícitamente encargado para esta tarea.

---

## Tabla final

| Control | Nivel | GATE/BLOCK/WARN/PERIODIC | Automatizable | Coste | Prioridad |
|---|---|---|---|---|---|
| Nueva tabla sin RLS | TRIPWIRE | BLOCK | Sí (estático) | Bajo | P0 |
| `disable row level security` literal | TRIPWIRE | BLOCK | Sí (estático) | Muy bajo | P0 |
| Migración fuera de secuencia/duplicada | TRIPWIRE | BLOCK | Sí (estático) | Muy bajo | P0 |
| `pnpm install --frozen-lockfile` + `pnpm build` | GARANTÍA VERIFICADA (funcional) | BLOCK | Sí | Bajo | P0 |
| `engines.node` esperado | TRIPWIRE | BLOCK | Sí (estático) | Muy bajo | P0 |
| `pnpm audit --prod` nuevo HIGH/CRITICAL | GARANTÍA VERIFICADA + GATE | BLOCK salvo excepción | Sí | Medio | P0 |
| `pnpm audit` completo, alcanzabilidad confirmada | TRIPWIRE + GATE | WARN → BLOCK si confirmado | Parcial (juicio humano) | Medio-alto | P0 |
| `pnpm audit` completo, resto | GARANTÍA VERIFICADA (informe) | PERIODIC | Sí | Bajo | P1 |
| Secretos en diff (`gitleaks`, excepción por valor) | TRIPWIRE | BLOCK | Sí (estático) | Medio-alto | P0 |
| `SECURITY DEFINER` nuevo/modificado | TRIPWIRE + GATE | BLOCK (gate de revisión) | Detección sí / decisión no | Bajo/humano | P0 |
| Trigger crítico nuevo/modificado/eliminado | TRIPWIRE + GATE | BLOCK (gate de revisión) | Detección sí / decisión no | Bajo/humano | P0 |
| Política `using(true)` | TRIPWIRE + GATE | BLOCK (gate de revisión, no autoaprobado por nombre) | Detección sí / decisión no | Bajo/humano | P0 |
| Cambio de arquitectura de sesión (`hooks.server.ts`/`@supabase/ssr`) | TRIPWIRE + GATE | BLOCK (gate de revisión) | Sí detección / no decisión | Bajo/humano | P0 |
| Edge Function con `service_role` | TRIPWIRE + GATE | BLOCK (gate de revisión, checklist 8 puntos) | Sí detección / no decisión | Bajo/humano | P0 |
| Bucket Storage nuevo/modificado | TRIPWIRE + GATE | BLOCK (gate de revisión) | Sí detección / no decisión | Bajo/humano | P0 |
| Smoke test disponibilidad + OG contra Preview | GARANTÍA VERIFICADA (acotada a disponibilidad) | BLOCK | Sí (script) | Medio | P0 |
| `has_schema_privilege(anon/authenticated, public, CREATE)` | GARANTÍA VERIFICADA | PERIODIC → BLOCK cuando exista DB efímera | Requiere DB real | Bajo (periódico) / medio (por-PR) | P1 (objetivo: subir a P0/BLOCK) |
| `search_path` real de `SECURITY DEFINER` | GARANTÍA VERIFICADA | PERIODIC / BLOCK si coste asumible | Requiere DB real | Alto | P1 |
| `has_function_privilege` real vs manifest | GARANTÍA VERIFICADA | PERIODIC / BLOCK si coste asumible | Requiere DB real | Alto | P1 |
| Forma de fila de funciones públicas vs manifest | GARANTÍA VERIFICADA | PERIODIC | Requiere DB real | Alto | P2 |
| Huella de migraciones vs repo | GARANTÍA VERIFICADA | PERIODIC | Requiere DB real | Medio | P1 (ya obligatorio en plan `17`) |
| Manifest de tablas RLS-sin-políticas intencionadas | TRIPWIRE con allowlist | PERIODIC | Sí, con manifest manual | Bajo | P1 |
| Configuración real de buckets vs migraciones | GARANTÍA VERIFICADA | PERIODIC | Requiere DB real | Medio | P1 |
| CORS/rate limiting de Edge Functions | GARANTÍA VERIFICADA (inspección) | PERIODIC | No | Bajo pero manual | P2 |
| MFA de cuentas staff | GARANTÍA VERIFICADA | PERIODIC | Requiere DB real | Medio | P2 |
| Mensajes de error interpolados (`raise exception`) | TRIPWIRE preventivo | WARN | Sí (estático) | Bajo | P1 |
| Matriz de identidades (autorización real) | GARANTÍA VERIFICADA (cuando exista) | — (es la prueba, no un gate de PR aislado) | Requiere implementación de tests reales | Alto | P1 |
| Dependabot | — | WARN (mismo pipeline que humanos) | Sí (plataforma) | Bajo | P1 |
| Auditoría de todo el historial de git (pre-publicación) | GARANTÍA VERIFICADA | Único evento, no recurrente | Sí (herramienta), decisión no | Medio | P2 (antes de publicar) |

---

## Security Baseline v1 — mínima viable (los 10 grupos de P0)

Ver §15. Son los mismos 10 grupos, deliberadamente agrupados para que quepan en un límite realista de implementación tras cerrar el Bloque B — no una lista de controles individuales sin agrupar. Todos son de coste bajo-medio salvo el checklist de revisión humana (cuyo coste es de tiempo del mantenedor, no técnico), y ninguno requiere todavía base de datos efímera ni nueva infraestructura de test.
