# CONVOCA — Open Source Readiness Plan v1

**Fecha:** 2026-08-07 (revisión 2 — integra análisis de `22_analisis_kimi_open_source.md` y decisiones adicionales del propietario)
**Estado: DISEÑO — NO IMPLEMENTADO.** El repositorio sigue siendo privado. No se ha hecho público nada, no se ha cambiado configuración de GitHub, no se ha borrado ni sanitizado ningún archivo, no se han rotado credenciales, no se ha tocado código, Supabase, Vercel, CI, ni el Bloque B. Todo este documento se basa en inspección real del repositorio (`git`, `grep`, lectura de archivos), en búsquedas reales sobre el historial completo de git, y en documentación oficial de GitHub/licencias consultada explícitamente donde hacía falta — no en suposiciones.

---

## 1. Objetivo

Diseñar exactamente qué debe ocurrir para que CONVOCA pueda pasar de repositorio privado a público de forma segura, profesional y coherente con su naturaleza de plataforma de participación ciudadana — sin convertir la publicación en un proyecto eterno, y sin que "open source" signifique nunca "los datos de producción viajan con el código".

## 2. Estado actual (verificado, no supuesto)

| Elemento | Estado real |
|---|---|
| Bloque A (seguridad, código) | Cerrado y validado en producción, en ventana de observación. |
| Bloque B (migración `0042`) | No ejecutado. |
| Security Baseline v1 | Diseñada (`19_security_baseline_v1_diseno.md`), **cero controles implementados**. |
| Repositorio | Privado. |
| `README.md` | **Existe, pero es el scaffold genérico de `sv` (SvelteKit CLI)** — no menciona a CONVOCA en ningún punto. Necesita reescritura completa, no edición incremental. |
| `LICENSE` | No existe. |
| `SECURITY.md` | No existe. |
| `CONTRIBUTING.md` | No existe. |
| `CODE_OF_CONDUCT.md` | No existe. |
| `package.json` → `license` | Campo ausente. |
| Historial de git | 98 commits, 5 ramas locales activas además de `main`, sin tags. Tamaño manejable para una auditoría completa del historial. |
| `MIGRACION-PRODUCCION.md` (raíz del repo, no en `/seguridad`) | 522 líneas, documento operacional real — ver hallazgos concretos en §6. |

---

## 3. Inventario publicable / no publicable

Clasificación de **categorías** reales encontradas en el repositorio (no de archivo en archivo salvo `/seguridad`, que tiene su propia sección):

| Categoría | Dónde | Clasificación | Motivo |
|---|---|---|---|
| Código fuente (`src/`) | `src/**` | **PUBLICABLE** | Sin secretos encontrados (verificado). Todas las URLs/IDs de infraestructura pasan por variables `PUBLIC_*` — cero hardcodeo confirmado por `grep`. Esto es precisamente lo que hace real la promesa de "arquitectura auditable". |
| Migraciones SQL (`supabase/migrations/`) | 41 archivos | **PUBLICABLE** | RLS/`SECURITY DEFINER` bien diseñados no dependen de que el atacante no los conozca — es la premisa de todo el modelo de amenazas de esta auditoría. **Evidencia obtenida en esta revisión** (no una garantía universal, sino el resultado concreto de inspeccionar las 41 migraciones con `grep -in "insert into"`): todos los `INSERT` encontrados son o bien lógica de aplicación dentro de cuerpos de función (se ejecutan en tiempo de petición real, no contienen datos horneados en el archivo), o bien una única semilla estática de 8 "preocupaciones" genéricas en `0026_pulso_ciudadano.sql`, explícitamente documentada en el propio SQL como contenido de desarrollo sin ligar a ninguna cuenta real. El evento duplicado de staging/producción (`castellon-a7bc01aa`, ver `19_...md`) **no aparece en ninguna migración** — confirma que es un dato insertado en runtime en cada base por separado, no una semilla versionada en el repositorio. |
| Lockfile (`pnpm-lock.yaml`) | raíz | **PUBLICABLE — explícitamente, no ocultar** | Se rechaza deliberadamente la idea de no publicarlo o de publicar solo rangos de versión: ocultar el lockfile exacto es seguridad por oscuridad, no un control reconocido, y rompería tres objetivos que este mismo plan ya fija como necesarios — reproducibilidad de build para forks (§16), funcionamiento de Dependabot (§13), y la propia auditoría de dependencias de la Security Baseline (`19_...md` §10). Publicar el lockfile exacto es la práctica estándar de cualquier proyecto open source de Node/JS. |
| Edge Functions (`supabase/functions/`) | `delete-account/index.ts` | **PUBLICABLE** | Lee el secreto de `Deno.env`, nunca hardcodeado; el código en sí no es sensible. |
| Documentación de producto (`MIGRACION-PRODUCCION.md`) | raíz | **PUBLICABLE TRAS REVISIÓN** | Ver hallazgos concretos en §6 — no es una revisión genérica, ya se identificó qué hay que mirar. |
| `/seguridad` | 23 archivos | **Mixta — ver §6, análisis dedicado** | No es una categoría uniforme. |
| `.env.example`, `.env.production.example`, `.env.staging.example`, `.env.test` | raíz | **PUBLICABLE** | Verificado: ninguno de los 4 lleva credenciales reales; son exactamente el tipo de archivo que una publicación open source necesita mostrar. |
| Scripts | — | **No existe la categoría** | No hay directorio `scripts/` en el repo actual. |
| Fixtures | — | **No existe la categoría** | No se encontró ningún archivo de fixtures/seed en el repo (búsqueda explícita, sin resultados). |
| Assets (`static/`) | `static/icons/`, `static/vendor/`, `static/vision/*.webp`, `static/descargas/sanidad/*` | **PUBLICABLE TRAS REVISIÓN DE LICENCIAS DE TERCEROS** | Ver §10b (nuevo) — `static/vendor/` contiene una librería de terceros vendorizada que requiere aviso de licencia antes de publicar. El resto (iconos, imágenes de marca, documento de presupuesto ciudadano) revisado sin datos personales. |
| `design/*.jsx` | raíz | **PUBLICABLE** | Prototipos de referencia de diseño ya documentados como tales en su propia cabecera; sin secretos. |
| Configuraciones (`vite.config.ts`, `eslint.config.js`, `prettier.config.js`, `tsconfig.json`, `pnpm-workspace.yaml`) | raíz | **PUBLICABLE** | Configuración de build estándar, sin datos sensibles. |
| IDs de infraestructura (project-ref de Supabase, IDs de proyecto/equipo de Vercel) | citados en varios documentos de `/seguridad` y en esta conversación, no en `src/`/migraciones | **PUBLICABLE TRAS REVISIÓN** | No son secretos, pero facilitan reconocimiento — ver §6. |
| URLs | `convoca.cloud` y alias, ya públicos | **PUBLICABLE** | Ya son públicos por definición. |
| Logs | — | **No existe la categoría** | No se versionan logs en este repo. |
| Dumps de base de datos | — | **NO DEBE PUBLICARSE si existieran** | No se encontró ninguno en el repo. |
| Backups | — | **NO DEBE PUBLICARSE si existieran** | Ninguno encontrado en el repo. |
| Tokens o secretos | — | **NO DEBE PUBLICARSE** | Ninguno encontrado trackeado en `HEAD` ni en ningún commit de ningún branch del historial completo (verificación preliminar, ver §5 — el escaneo formal sigue pendiente). |
| Datos que pudieran pertenecer a usuarios reales | — | **NO DEBE PUBLICARSE si existieran** | Ninguno encontrado en el repositorio. |
| `supabase/.temp/` (caché local del CLI de Supabase, incluye una cadena de conexión con contraseña real al pooler) | local, no versionado | **NO DEBE PUBLICARSE, y ya no lo hace** | Correctamente listado en `.gitignore`; verificado que nunca apareció en el historial de git en ningún commit de ningún branch (ver §5). |

---

## 4. Riesgos antes de publicar (síntesis)

1. `MIGRACION-PRODUCCION.md` sin revisar expondría una contraseña de demo en texto plano y el nombre de un auditor externo — ver hallazgos concretos en §6.
2. `/seguridad` contiene 23 documentos con hallazgos de vulnerabilidades **ya corregidas**, algunos citando líneas de código exactas. Publicarlos íntegros es coherente con "arquitectura auditable" — la mitigación adecuada no es ocultar el detalle técnico, sino que cada documento deje claro en qué commit/migración se corrigió lo que describe, para que quien audite un fork desactualizado pueda comparar su propio estado (ver §6).
3. El propio README actual, si se publicara tal cual, sería un genérico de plantilla de SvelteKit — dañaría la credibilidad del proyecto ante periodistas/instituciones que lo visiten el primer día.
4. Ningún control de la Security Baseline v1 está implementado todavía — publicar sin ningún control activo significa que la primera regresión de seguridad tras la apertura no tendría ninguna red automática (ver §17).
5. El repositorio privado actual no tiene branch protection activable — al hacerse público esto **no cambia solo, requiere activación manual explícita** (ver §13, corregido en esta revisión: no todo lo relacionado con seguridad de GitHub se activa automáticamente).
6. Una dirección de email personal real del mantenedor (no reproducida aquí) aparece en los metadatos de 98 commits del historial — quedaría expuesta permanentemente al hacer público el repo, salvo que se decida reescribir el historial antes (ver §5 y §21).

---

## 5. Auditoría de historial de git — procedimiento (diseño, con verificación preliminar ya realizada)

**Verificación preliminar ya ejecutada en esta sesión (no sustituye el escaneo formal, solo lo orienta):**

- `git log --all --full-history -- "supabase/.temp/*"` → **sin resultados en ningún commit de ningún branch.**
- `git log --all --full-history --diff-filter=A --name-only -- ".env" ".env.local" ".env.oauth" ".env.staging.secrets" ".env.production"` → **sin resultados** — ningún `.env` real se commiteó jamás.
- Búsqueda pickaxe (`git log --all -S"<patrón>"`) para `SERVICE_ROLE_KEY`, `sbp_`, `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY` → los 2 únicos hits son, verificados individualmente, referencias al **nombre** de la variable de entorno dentro de código legítimo — no un valor real filtrado.
- `git log --all --format="%an <%ae>"` → solo dos identidades de autor en todo el historial: el nombre del mantenedor con una dirección de email personal real (no reproducida aquí) y la dirección `noreply` que GitHub genera automáticamente. Ver §21, decisión abierta nueva.

**Esto sigue siendo una señal preliminar positiva, no el escaneo formal completo — ninguna parte de este plan trata la preliminar como suficiente para cerrar ningún gate.** El procedimiento formal, a ejecutar antes de publicar (no ahora), debe cubrir explícitamente **los cinco frentes siguientes**, no solo secretos:

1. **Herramienta:** `gitleaks detect --source . --log-opts="--all"` (modo historial completo, todas las ramas, no solo `HEAD`) o equivalente (`trufflehog git file://. --since-commit=<primer-commit>`). Debe cubrir todos los commits, todas las ramas locales y remotas, y cualquier tag (hoy no hay ninguno, pero el procedimiento debe contemplarlos).
2. **Secretos — patrones específicos** (más allá del set genérico de la herramienta): `SUPABASE_SERVICE_ROLE_KEY` con valor real, `SUPABASE_ACCESS_TOKEN`, `sbp_[a-f0-9]{40}`, tokens de Vercel, el token de "Protection Bypass for Automation" de Vercel, JWT reales, contraseñas, `postgres://` con credenciales embebidas, claves privadas, cualquier `.env` real, API keys de terceros.
3. **Configuraciones de IDE históricas:** revisar si alguna vez existieron y se borraron archivos como `.vscode/settings.json` o `.idea/*` que pudieran haber contenido tokens de extensiones (p. ej. Live Share) o rutas/configuraciones de despliegue locales — no detectados en `HEAD` hoy, pero no comprobados todavía contra el historial completo.
4. **Archivos eliminados:** `git log --all --diff-filter=D --name-only` para el inventario completo de qué se borró alguna vez, cruzado contra patrones sensibles (`.env*`, `*.pem`, `*secret*`, `*dump*`, `*backup*`, `.vscode/*`, `.idea/*`).
5. **Blobs no alcanzables:** además del historial de commits alcanzables, comprobar blobs huérfanos que ya no cuelgan de ninguna rama/tag pero pueden seguir en el object store (`git fsck --unreachable`) — un archivo borrado y "squasheado" puede sobrevivir como blob suelto.
6. **Datos personales en metadatos de commits:** confirmado ya (punto anterior) que el email personal del autor aparece en todo el historial — este es el hallazgo concreto de este frente, no una posibilidad abstracta; requiere una decisión explícita (§21), no una acción automática de este procedimiento.

**Si el escaneo formal encuentra algo que la verificación preliminar no detectó:**

1. **Rotación primero, siempre** — la credencial se invalida/rota en el proveedor (Supabase/Vercel/Google) **antes** de tocar el historial de git, no después.
2. **Evaluación del historial:** ¿en cuántos commits/ramas aparece? ¿es alcanzable desde `main`?
3. **Limpieza del historial si procede:** `git filter-repo` para reescribir el historial eliminando el blob, coordinado con force-push a todas las ramas remotas afectadas y aviso a cualquier colaborador con clon local.
4. **Invalidación explícita de la credencial antigua** como paso independiente de la limpieza del historial — se necesitan ambos pasos, en ese orden.

**No se ejecuta ninguna de estas acciones ahora** — la verificación preliminar no encontró ningún secreto que las active (el hallazgo del email personal, que sí es real, se trata como decisión en §21, no como una rotación de credencial).

---

## 6. Tratamiento de `/seguridad` y de `MIGRACION-PRODUCCION.md`

Evaluado documento por documento. Ninguno se mueve, sanitiza ni elimina en esta tarea — es una clasificación, no una acción.

**Principio general para documentos de categoría A que describan vulnerabilidades ya corregidas:** se mantiene el contenido técnico íntegro — no se oculta ni redacta una auditoría ya corregida solo por ser detallada, eso sería restar valor de transparencia sin necesidad real. Lo que sí debe añadirse, cuando no exista ya, es una referencia clara de en qué commit/migración/versión quedó corregido lo que el documento describe, para que quien audite un fork o un despliegue propio pueda comparar su estado contra esa referencia. Varios documentos (p. ej. `08`) ya lo hacen; el resto debe revisarse para incorporarlo si falta, no para redactar contenido.

| Archivo | Clasificación | Motivo |
|---|---|---|
| `00_resumen_ejecutivo.md` | **A — íntegro** | Resumen de auditoría, sin operacional sensible. |
| `01_inventario_superficie.md` | **A — íntegro** | Inventario de superficie de ataque — exactamente lo que "arquitectura auditable" promete mostrar. |
| `02_reporte_seguridad.md` | **A — íntegro, con referencia de corrección** | Hallazgos con cita de archivo:línea — mantener el detalle técnico; confirmar que cada hallazgo referencia la migración/commit donde se corrigió. |
| `03_auditoria_rls.sql` | **A — íntegro** | SQL de auditoría de políticas, sin datos. |
| `04_plan_pruebas.md` / `05_plan_remediacion.md` | **A — íntegro** | Planes de prueba/remediación ya ejecutados. |
| `06_revision_critica.md` | **A — íntegro, con referencia de corrección** | Revisión técnica detallada, valiosa para credibilidad; mismo principio que `02`. |
| `07_preflight_produccion.sql` | **B — sanitizar antes de publicar** | El SQL en sí es publicable, pero conviene revisar que ningún comentario cite un `project-ref` textual innecesariamente. |
| `08_migracion_candidata_0042.sql` | **A — íntegro, condicionado** | Publicable en cuanto el Bloque B se aplique y deje de ser "candidata" — ya deja claro en el propio archivo que es un candidato, no el estado real de producción. |
| `09_pruebas_parche_0042.md` | **A — íntegro** | Metodología de prueba, reutilizable por cualquier fork. |
| `10_respuesta_equipo_rojo.md` | **A — íntegro, con referencia de corrección** | Respuesta a auditoría adversarial — coherente con transparencia; confirmar referencias de corrección donde falten. |
| `11_resultados_preflight_staging.md`, `12_resultados_pruebas_sesion_real_staging.md`, `13_resultados_pruebas_pendientes_staging.md` | **B — sanitizar** | Citan el `project-ref` de `convoca-staging` explícitamente varias veces — redactar a un placeholder antes de publicar. |
| `14_aplicacion_override_sharp_repo_real.md`, `15_analisis_alcanzabilidad_cookie.md`, `16_smoke_test_og_preview.md` | **A — íntegro** | Documentación técnica de dependencias, sin operacional sensible más allá de lo ya cubierto en 11-13. |
| `17_plan_promocion_produccion.md` | **B — sanitizar** | Contiene el rollback SQL completo (publicable) pero también cita explícitamente ambos `project-ref`, IDs de deployment de Vercel, y el mecanismo de bypass de protección — redactar identificadores antes de publicar; el procedimiento en sí (rollback, GO/NO-GO, runbook) es exactamente el tipo de contenido que dota de credibilidad a un proyecto institucional. |
| `18_ventana_observacion_bloque_a.md` | **C — interno** | Bitácora operacional de una ventana de observación puntual, sin valor duradero para un lector externo. |
| `19_security_baseline_v1_diseno.md` | **A — íntegro** | Es, en sí mismo, el mejor argumento de transparencia posible. |
| `20_analisis_informe_kimi.md` | **A — íntegro** | Ejemplo real de auto-corrección ante una revisión adversarial. |
| `21_open_source_readiness_plan.md` (este documento) | **A — íntegro, una vez ejecutado** | Documentar el propio proceso de apertura es coherente con el principio de §23. |
| `22_analisis_kimi_open_source.md` | **A — íntegro** | Segundo ejemplo de auto-corrección — refuerza, no debilita, la credibilidad. |
| `MIGRACION-PRODUCCION.md` (raíz, no en `/seguridad` pero mismo tratamiento) | **B — sanitizar, hallazgos concretos ya identificados** | Verificado por lectura directa del archivo (no por descripción genérica): contiene una sección de "Cuentas de demostración" con una **contraseña compartida documentada en texto plano** (constante de un sistema mock de una fase muy anterior del proyecto). El propio documento demuestra, con evidencia de build real, que esa contraseña **queda excluida del bundle de producción** (`grep` sobre el build compilado con `PUBLIC_ENABLE_DEMO_DATA=false`: ausente) — no es una credencial viva ni alcanzable hoy. Aun así, debe eliminarse o generalizarse esa sección antes de publicar, para no exponerla fuera de su contexto de mitigación. Además menciona por nombre a un auditor de seguridad externo contratado — decidir si se mantiene la mención o se generaliza a "una auditoría de seguridad externa". |

**Ninguno se clasifica como D ("no debe publicarse")** — no existe en `/seguridad` ningún documento que deba ocultarse por completo. Lo que existe son documentos que citan identificadores operacionales concretos de forma repetida y sin necesidad (categoría B), uno sin valor duradero pero tampoco sensible (categoría C), y un documento fuera de `/seguridad` con dos hallazgos concretos y acotados (categoría B). La disciplina de no pegar secretos en `/seguridad` se mantuvo real a lo largo de 22 documentos — verificado, no solo declarado.

---

## 7. Documentación necesaria antes de publicar

| Archivo | Finalidad | Contenido mínimo | Qué NO debe contener |
|---|---|---|---|
| `README.md` | Primera impresión — sustituye por completo al scaffold actual de `sv` | Ver §8 (diseño dedicado) | Ningún dato de infraestructura privada, ningún tono de campaña política |
| `LICENSE` | Marco legal de reutilización | Texto íntegro de la licencia elegida (§10), sin modificar | Cláusulas personalizadas no estándar sin asesoría legal |
| `SECURITY.md` | Canal de reporte responsable de vulnerabilidades | Ver §9 (diseño dedicado) | Dirección de contacto inventada, promesas de tiempo de respuesta no comprometidas de verdad |
| `CONTRIBUTING.md` | Flujo para colaboradores externos | Ver §14 (diseño dedicado, incluye higiene de Issues) | Burocracia que nadie vaya a seguir en la práctica |
| `CODE_OF_CONDUCT.md` | Normas de comportamiento de la comunidad | Un código estándar existente (p. ej. Contributor Covenant), adaptado mínimamente con el canal de contacto real | Redacción propia desde cero sin necesidad |
| `.env.example` | Ya existe y es publicable — confirmar que sigue completo tras cualquier cambio futuro de variables | Todas las variables que la app necesita, con valores de ejemplo obviamente falsos | Cualquier valor que funcione de verdad |
| `docs/architecture/` | Arquitectura general para quien quiera entender el sistema sin leer todo el código | Diagrama/explicación de SvelteKit+Vercel+Supabase, ausencia deliberada de `hooks.server.ts`, modelo de roles | Nada que no esté ya en el código — es explicación, no secreto |
| `docs/security/` | Puerta de entrada a `/seguridad` para un lector externo, sin duplicar contenido | Índice curado de qué leer primero | Los 23 documentos completos pegados aquí — mejor enlazar a `/seguridad` una vez sanitizada |
| `docs/development/` | Cómo levantar el entorno local | Instrucciones de `pnpm install`, variables necesarias, cómo aplicar migraciones contra un proyecto Supabase propio | Ninguna referencia a la instancia oficial de CONVOCA como si fuera necesaria |
| `docs/deployment/` | Cómo desplegar una instancia propia | Vercel + Supabase desde cero, variables de entorno necesarias | Credenciales o referencias a `convoca.cloud` como destino |

**Ninguno de estos archivos se escribe todavía** — esto es solo el esquema pedido.

---

## 8. Diseño del README

Debe ser legible por desarrolladores, ciudadanos, periodistas e instituciones **en ese orden de exigencia técnica decreciente pero sin condescendencia hacia ninguno**. Estructura:

1. **Qué es CONVOCA** — una frase directa: plataforma de participación ciudadana. Sin adjetivos grandilocuentes.
2. **Qué problema intenta resolver** — la brecha entre la ciudadanía y el proceso de definición de políticas públicas; sin prometer que la resuelve por sí sola.
3. **Qué NO es** — explícito y honesto: no es un sistema de votación electoral oficial, no sustituye ningún proceso institucional, no garantiza resultados vinculantes.
4. **Estado actual del proyecto** — en desarrollo activo, con enlace a `MIGRACION-PRODUCCION.md` (una vez sanitizado) y a la Security Baseline.
5. **Arquitectura general** — SvelteKit (SSR sin sesión de servidor) + Supabase (Postgres, Auth, RLS) + Vercel, con enlace a `docs/architecture/`.
6. **Cómo ejecutar localmente** — enlace a `docs/development/`, no duplicar aquí.
7. **Cómo contribuir** — enlace a `CONTRIBUTING.md`.
8. **Filosofía de transparencia** — la idea central de §23: una plataforma de participación ciudadana debe poder ser auditada por cualquiera.
9. **Seguridad** — enlace a `SECURITY.md`.
10. **Licencia** — nombre de la licencia elegida (§10) con enlace al archivo `LICENSE`.

**Tono:** técnico y sobrio, nunca partidista, nunca prometiendo neutralidad política del *proyecto* como si eso fuera automático por ser código abierto.

---

## 9. Diseño de `SECURITY.md`

- **Dónde reportar:** decisión abierta (§21) — placeholder explícito hasta que exista un canal real.
- **Qué NO debe publicarse en Issues:** ningún detalle de una vulnerabilidad no corregida, ninguna prueba de concepto contra la instancia real de producción, ningún dato obtenido durante una prueba. Ver también §14 (higiene de Issues).
- **Qué información incluir en un reporte:** versión/commit afectado, pasos de reproducción, impacto estimado, si se probó contra producción o contra una instancia propia.
- **Entornos que pueden ser objeto de pruebas:** una instancia propia del investigador siempre; `convoca.cloud` **solo** para verificación pasiva no destructiva.
- **Prohibición explícita:** usar datos reales de terceros bajo ninguna circunstancia.
- **Expectativas de respuesta:** a definir de forma realista para un único mantenedor — placeholder hasta decisión.
- **Coordinación de disclosure:** disclosure coordinado estándar — sin fecha acordada, no se publica el detalle técnico.
- **Cuándo una vulnerabilidad puede hacerse pública:** tras corregirse y desplegarse, con un plazo razonable de gracia — a confirmar como decisión.

**Canal de reporte definitivo: decisión abierta, no inventada en este documento** (§21).

---

## 10. Comparativa de licencias

| Licencia | Forks | SaaS de terceros | Modificaciones privadas | Redistribución | Obligación de compartir cambios | Adopción institucional | Compatibilidad con fin ciudadano |
|---|---|---|---|---|---|---|---|
| **MIT** | Libre, sin restricción | Un tercero puede ofrecer CONVOCA como servicio sin compartir sus cambios | Permitidas sin límite | Libre, incluso cerrando el código derivado | Ninguna | Máxima — es la licencia que menos fricción legal genera para un ayuntamiento/universidad que quiera adoptarlo | Alta simplicidad, pero no protege contra que una empresa privatice mejoras hechas sobre el trabajo comunitario |
| **Apache-2.0** | Libre | Igual que MIT en la práctica para SaaS | Permitidas | Libre | Ninguna sobre el código en sí, pero incluye concesión explícita de patentes | Alta — preferida por algunas instituciones/empresas por la cláusula de patentes | Similar a MIT, mismo punto débil frente a SaaS cerrado |
| **GPLv3** | Libre, pero cualquier obra derivada distribuida debe licenciarse también bajo GPLv3 | Un SaaS que solo *ejecuta* el código sin distribuirlo **no está obligado** a publicar sus cambios (la "laguna del SaaS") | Permitidas mientras no se distribuyan | Debe mantenerse GPLv3 | Sí, para todo lo que se **distribuya** | Media — algunas instituciones evitan GPL por la obligación de compartir código derivado distribuido | Protege que un fork distribuido siga abierto, pero no cierra la laguna del SaaS — relevante porque CONVOCA es, precisamente, un SaaS |
| **AGPLv3** | Libre, misma obligación que GPL **y además cubre el caso SaaS** | Cierra la laguna que GPL deja abierta — un despliegue modificado como servicio debe publicar sus cambios | Permitidas mientras no se ofrezcan como servicio de red | Debe mantenerse AGPLv3 | Sí, incluyendo el caso de uso como servicio | Menor que MIT/Apache — algunas empresas evitan integrar código AGPL por esta misma razón | La más alineada con "esto es infraestructura cívica, las mejoras deben volver a la comunidad" — pero puede desincentivar la adopción por departamentos legales conservadores |

**Implicaciones estratégicas específicas para CONVOCA:**

- CONVOCA es, en esencia, un **servicio**, no una librería. Esto hace que GPL vs. AGPL sea la decisión más relevante: **GPL no protegería contra que un tercero despliegue su propia instancia modificada sin devolver nada a la comunidad**, porque nunca "distribuye" el software, solo lo ejecuta.
- Si el objetivo de producto es maximizar cuántos ayuntamientos/universidades/colectivos despliegan su propia instancia (§16), **MIT/Apache-2.0 maximizan esa adopción** al eliminar cualquier fricción legal.
- Si el objetivo es garantizar que cualquier mejora hecha por un tercero, incluso ejecutándola solo como servicio, vuelva a beneficiar al ecosistema abierto, **AGPLv3 es la única de las cuatro que lo garantiza legalmente.**
- **Trade-off adicional a considerar, no solo legal sino de seguridad práctica:** una licencia más permisiva (MIT/Apache-2.0) reduce la fricción de adopción y, por tanto, puede aumentar el número de instituciones/desarrolladores que efectivamente miran el código — lo que potencialmente se traduce en más auditoría externa informal ("muchos ojos"). Es una correlación razonable, no una garantía demostrable: no hay forma de confirmar contra este repositorio que una licencia u otra vaya a producir más o menos revisión real. Una licencia copyleft fuerte (AGPLv3) protege mejor que las mejoras permanezcan abiertas, a costa de ese posible efecto sobre la adopción y la revisión externa.
- El coste de AGPL es real: reduce la disposición de algunas instituciones/empresas a integrarlo o contribuir, por políticas internas de departamentos legales que evitan copyleft fuerte por defecto.

**Recomendación razonada — no es una decisión automática, sigue pendiente del propietario:** dado que CONVOCA se presenta explícitamente como infraestructura de participación ciudadana y no como un producto comercial, **AGPLv3** es la que mejor protege la intención declarada del proyecto — a costa de una adopción institucional potencialmente más lenta y, según el argumento anterior, potencialmente menos ojos externos auditando. Si la prioridad estratégica es maximizar adopción cuanto antes, **MIT** es la elección más pragmática. Apache-2.0 y GPLv3 quedan como puntos intermedios menos claramente superiores a los otros dos para el caso de uso concreto de CONVOCA.

### 10b. Licencias y atribuciones de terceros dentro del propio repositorio (nuevo — requisito P0)

Distinto de "qué licencia elige CONVOCA para su propio código": **qué licencias de terceros ya viven dentro del repositorio y qué exigen para poder redistribuirse.**

Debe auditarse explícitamente, antes de publicar, en:
- **Dependencias** (`package.json`/`pnpm-lock.yaml`) — la mayoría de paquetes npm declaran su propia licencia (MIT/ISC/Apache-2.0 en la inmensa mayoría del ecosistema JS); revisar que ninguna dependencia tenga una licencia incompatible con la licencia elegida para CONVOCA (§10) o con la distribución en general (poco probable, pero no verificado exhaustivamente en esta tarea).
- **`static/vendor/`** — **hallazgo concreto identificado en esta revisión:** contiene copias precompiladas de MapLibre GL JS (`maplibre-gl-shared.mjs`, `maplibre-gl-worker.mjs`), servidas directamente desde el propio dominio en vez de cargarlas de un CDN. MapLibre GL JS se distribuye bajo licencia **BSD-3-Clause**, que exige conservar el aviso de copyright y las condiciones de la licencia tanto en redistribución de código fuente como en forma binaria/compilada. **No se ha encontrado ningún archivo `LICENSE`/aviso de copyright acompañando estos dos archivos vendorizados.** Esto se describe como un **gap de compliance/atribución a resolver antes de publicar, no como una conclusión jurídica definitiva de incumplimiento** — no se ha hecho una evaluación legal formal, pero la ausencia del aviso es un hecho verificado y la corrección (añadir el archivo de licencia/aviso junto a los archivos vendorizados, o referenciarlo desde un `THIRD_PARTY_LICENSES.md`) es sencilla y de bajo coste.
- **Iconos, imágenes, fuentes** (`static/icons/`, `static/vision/*.webp`, tipografías si las hubiera) — confirmar el origen y la licencia de cada asset que no sea creación propia; no verificado exhaustivamente en esta tarea.
- **Documentos/assets descargables** (`static/descargas/sanidad/*`) — contenido propio del proyecto (propuesta de presupuesto), no de terceros; sin problema de licencia de terceros, pero sí sujeto a la licencia general del repositorio si se decide que el contenido no-código lleve una licencia distinta (p. ej. Creative Commons para documentos de producto, común en proyectos cívicos) — decisión abierta, no resuelta aquí (§21).

---

## 11. Marca CONVOCA

Distinción explícita, sin implicar que exista ya un registro legal:

- **Código abierto ≠ uso libre de la marca.** El software puede forkearse, modificarse y redesplegarse bajo la licencia elegida (§10) sin restricción de código — **eso no incluye el derecho a llamar a esa instancia "CONVOCA" ni a presentarla como la instancia oficial.**
- **Política de uso del nombre deseada, no una garantía jurídica ya establecida** (a formalizar más adelante, no ahora):
  1. El nombre "CONVOCA" y cualquier logotipo asociado se reservan, como política de uso, para la instancia oficial mantenida por el propietario/organización del proyecto.
  2. Un fork puede describirse honestamente como *"basado en CONVOCA"* o *"powered by CONVOCA"*, pero no como *"CONVOCA"* a secas ni de forma que sugiera ser la instancia oficial u obtener su respaldo.
  3. No se exige renombrar el código fuente ni las referencias técnicas internas — la restricción es sobre la presentación pública de cara a la ciudadanía, no sobre el código.
- **No se afirma que exista una marca registrada** (no la hay, y este documento no la crea, ni tiene efecto legal vinculante por sí mismo). Es una política de uso responsable del nombre que el proyecto declara desear, aplicable independientemente de si en el futuro se formaliza un registro real.

---

## 12. Datos y privacidad — open source no significa publicar datos

Principio explícito, sin ambigüedad: **abrir el código no implica, bajo ninguna circunstancia, publicar la base de datos, votos, emails, documentos de verificación, logs de usuarios ni backups.** El repositorio puede y debe poder hacerse público sin que ningún dato de producción viaje con él.

**Verificación realizada en esta tarea, no asumida:**
- Ningún archivo de fixtures/seed existe en el repositorio.
- El único contenido descargable versionado en `static/` es un documento de presupuesto público, revisado sin patrones de datos personales.
- Ningún `.env` real ni dump de base de datos existe en el repositorio ni en su historial completo (§5).
- Los datos de participación ciudadana viven exclusivamente en Supabase, nunca en el repositorio de código — arquitectónicamente separados, no por disciplina manual.
- Las migraciones no contienen datos reales horneados (§3, evidencia obtenida en esta revisión).

**Riesgo residual identificado:** ninguno detectado hoy en el repositorio de código. El riesgo real de "datos viajando con el código" no es del repositorio en sí, sino de que en el futuro alguien pegue una captura o un export de datos reales dentro de un documento de `/seguridad` — exactamente el tipo de regresión que la Security Baseline v1 ya contempla prevenir hacia adelante.

---

## 13. GitHub Security — estado deseado al hacerse público

**Corrección importante de esta revisión — sin contradicciones internas:**

| Control | Automático en repos públicos! | Cuándo |
|---|---|---|
| **Secret Scanning** | **Sí, automático y gratis**, sin ninguna acción del propietario | **P0 — mismo día**, confirmar visualmente que aparece activo en Settings → Code security, no asumirlo sin mirar |
| **Push Protection de repositorio** | **No es automático.** Está desactivada por defecto y requiere que un administrador del repositorio la active explícitamente (Settings → Code security → Push protection) | **P0 — mismo día, como acción manual explícita**, no como algo que "ya viene solo" |
| **Push Protection de usuario** | Distinta de la anterior: es un ajuste a nivel de la cuenta individual de GitHub, activo por defecto, que protege los pushes de esa persona a cualquier repo público al que tenga acceso — funciona ya hoy, independientemente de si el repositorio activa la suya | Ya activa, sin acción necesaria — mencionarlo en la documentación para que el equipo sepa que existe |
| Branch protection en `main` (PR obligatorio, prohibición de force-push, checks requeridos) | No, requiere configuración manual | **P0 — mismo día**, incluso antes de tener CI real: "requerir PR" y "prohibir force-push" no dependen de que existan checks todavía |
| Dependabot (alertas + actualizaciones de seguridad) | Requiere activarlo, gratis | **P0 — mismo día** |
| `SECURITY.md` publicado | No aplica (es un archivo, no una función de plataforma) | **P0 — mismo día** |
| Checks requeridos de la Security Baseline P0 como `required status checks` | No, requiere que el CI exista primero | **P1 — inmediatamente después** |
| CodeQL / code scanning | Requiere activarlo | **P1** |
| Revisión de 2 personas obligatoria en rutas sensibles | No, requiere configuración y un segundo mantenedor real | **P2**, condicionado (Security Baseline §1.2) |

**Nota de diseño de CI para cuando exista (preventivo — hoy no hay CI, ver `19_...md` §8):** cualquier workflow de GitHub Actions que se ejecute sobre PRs de colaboradores externos **no puede exponer secretos del repositorio al código no confiable del PR.** Concretamente, si en el futuro un workflow usa `pull_request_target` (necesario, por ejemplo, para desplegar un Preview con un token privado), **no debe hacer checkout del código del fork** dentro de ese contexto privilegiado — esa combinación es la clase de vulnerabilidad conocida como "pwn request", documentada oficialmente por GitHub. El disparador `pull_request` normal, sin `_target`, no expone secretos a PRs de forks por diseño de GitHub y es preferible para cualquier paso que ejecute código no confiable. Cualquier etapa que sí necesite un secreto (como un despliegue) debe separarse en un workflow distinto que solo corra sobre el código del repositorio base, nunca sobre el del PR entrante sin revisión previa.

---

## 14. Contribuciones — flujo propuesto

```
issue (descripción del problema/propuesta)
  → discusión/diseño cuando el cambio sea significativo (no para un typo)
  → branch propio del colaborador (fork + branch, patrón estándar de GitHub)
  → PR contra main
  → CI (Security Baseline P0 en cuanto exista, ver §17)
  → revisión del mantenedor (o security reviewer si el cambio es sensible)
  → merge
```

**Categorías de cambio sensible con requisitos adicionales** (alineadas 1:1 con los GATE ya diseñados en `19_security_baseline_v1_diseno.md` §4 — no se inventan requisitos nuevos aquí, se heredan):

- Migraciones (`supabase/migrations/*`).
- RLS (cualquier `create policy`/`alter policy`/`drop policy`).
- `SECURITY DEFINER` nuevo o modificado.
- Autenticación (`src/lib/auth/*`, cualquier cosa relacionada con `@supabase/ssr`, `hooks.server.ts`).
- Edge Functions que usen `service_role`.
- Votos/participación (tablas y funciones de `concern_listening_*`, `next_block_vote*`, `measure_participation*`).
- Moderación (`audit_logs`, roles de staff).
- Privacidad (cualquier cambio a qué campos expone una función pública o qué puede ver un rol).

Un PR externo que toque cualquiera de estas categorías **no se fusiona sin la revisión defensiva independiente** descrita en la Security Baseline (§1.2 de `19_...md`).

### Issues — higiene mínima (nuevo)

Un repositorio público recibe Issues de cualquiera, no solo PRs — esto necesita reglas mínimas propias, distintas del flujo de PR de arriba:

- **Plantilla mínima de Issue** (bug report / feature request), para encauzar qué información se espera y desalentar contenido fuera de lugar.
- **Moderación básica:** el mantenedor puede cerrar/ocultar Issues que contengan spam, contenido ofensivo, o intentos de disclosure de vulnerabilidades no corregidas (ver siguiente punto) — sin que esto requiera un proceso formal todavía, con un único mantenedor.
- **No se permite el disclosure de vulnerabilidades sin corregir mediante Issues públicos, bajo ninguna circunstancia** — ya establecido en el diseño de `SECURITY.md` (§9); se repite aquí porque es la regla de higiene de Issues más importante de todas. El canal correspondiente es el privado que define `SECURITY.md` (correo dedicado o GitHub Security Advisories privado, según la decisión abierta de §21), no un Issue público.
- Esto no pretende resolver moderación a escala — es exactamente lo mínimo razonable para el volumen esperado el primer mes, coherente con que GATE 7 (§18) ya está marcado como degradable a P1 inmediato, no bloqueante.

---

## 15. Gobernanza — modelo inicial mínimo

Tres roles, sin más estructura de la necesaria hoy:

- **Maintainer:** decide qué se fusiona, tiene la última palabra, responsable de GO/NO-GO en cambios sensibles. Hoy: una persona.
- **Contributor:** cualquiera que abra un PR. Sin necesidad de proceso de admisión previo.
- **Security reviewer:** rol que hoy **coincide con el maintainer** — se documenta como rol distinto desde ahora precisamente para que, cuando exista una segunda persona de confianza, la separación ya esté definida.

**Cómo evolucionar si crece (no implementar ahora, solo dejar previsto):** cuando exista un segundo mantenedor real, (a) el security reviewer pasa a ser una persona distinta del maintainer que aprueba el merge, (b) branch protection exige revisión de ambos roles para cambios sensibles, (c) se plantea un proceso ligero de "colaborador de confianza" solo si el volumen de contribuciones lo justifica.

**No crear** consejo asesor, comité técnico, ni proceso de votación de cambios en esta fase.

---

## 16. Reproducibilidad — qué falta para que un fork sea real, no solo "código visible"

Escenario de referencia: un ayuntamiento, asociación, universidad o colectivo quiere desplegar su propia instancia sin acceder a la infraestructura de CONVOCA, sin compartir secretos, sin depender de la base de datos oficial.

**Verificado en esta tarea:** todo el código de `src/` ya lee la configuración de Supabase exclusivamente vía variables `PUBLIC_*` — **cero URLs/IDs de infraestructura hardcodeados encontrados en el código fuente.**

**Qué debería ser portable vía variables de entorno (ya lo es, en su mayoría):**

| Elemento | Estado |
|---|---|
| URL y clave pública de Supabase | Ya portable. |
| Activación de login por contraseña/Google | Ya portable. |
| Entorno (dev/staging/producción) | Ya portable. |
| `SUPABASE_SERVICE_ROLE_KEY` de la Edge Function | Ya portable, nunca en código. |
| Google OAuth client ID/secret | A confirmar que solo vive en configuración de Supabase Auth, no en el repo (no encontrado en el repo; configuración de Supabase Auth en sí, fuera del alcance de "solo repositorio" de esta tarea). |
| Nombre/branding | **No portable hoy de forma trivial** — "Convoca" aparece como texto literal en componentes de UI. Requeriría búsqueda-y-reemplazo manual para un fork que quiera renombrarse. |
| Migraciones de base de datos | Portables tal cual — no dependen de ningún dato de la instancia oficial. |

**Clasificación de obstáculos, corregida en esta revisión — la prueba real es P0, no P1:**

- **P0, y debe ejecutarse antes de publicar, no después:** una prueba real de extremo a extremo — `clone → configurar variables propias → proyecto Supabase propio → aplicar migraciones → install → build/run` — realizada por alguien (o al menos simulada con el mismo rigor que una ejecución real, documentando cada paso) sin usar ninguna credencial de la instancia oficial de CONVOCA. Hasta ahora esto es una **inferencia de lectura de código** (confirmado: nada hardcodeado, todo pasa por `PUBLIC_*`), **no una prueba ejecutada** — y una afirmación pública de "puedes desplegar tu propia instancia" no debería hacerse sin haberla ejecutado al menos una vez de verdad. Se elimina cualquier clasificación anterior que colocara esta prueba solo en P1: es P0.
- **P1:** nombre "Convoca" hardcodeado en la UI (branding no parametrizado) — no bloquea el arranque, pero un fork legítimo bajo la política de marca de §11 lo necesitaría para cumplirla correctamente.
- **P2:** ausencia de un script/comando único de "bootstrap" — mejora de experiencia de desarrollador, no un bloqueo real.

---

## 17. Relación con la Security Baseline v1

No se asume que toda la Baseline (P1/P2 incluidos) deba estar terminada antes de publicar. **El mínimo serio: los 10 grupos P0 ya definidos en `19_security_baseline_v1_diseno.md` §15, implementados de verdad (no solo diseñados) antes del GATE 2 de §18.**

De esos 10 grupos, los que más justifican ir en P0-antes-de-publicar (porque serían más costosos de añadir después de que ya lleguen PRs externos):

- Secretos (`gitleaks`).
- `SECURITY DEFINER`/triggers críticos y `using(true)` (gates de revisión).
- Edge Functions con `service_role`.
- Migraciones estructurales (RLS/disable/numeración).

Los otros 3 grupos (build reproducible, doble auditoría de dependencias, smoke test de disponibilidad) son también deseables el primer día, con un argumento de urgencia distinto pero la misma clasificación P0.

**Todo lo demás de la Baseline (P1/P2) puede y debe seguir desarrollándose después de abrir el repositorio** — tenerlo pendiente y visible en un documento público es en sí mismo un argumento de transparencia.

---

## 18. Gates para PRIVATE → PUBLIC

| Gate | ¿Necesario antes de publicar? | Evaluación |
|---|---|---|
| **GATE 1** — Bloque B cerrado | **Sí** | Publicar con una migración de hardening "candidata" sin aplicar, con el código ya visible, es el peor momento posible para dejarlo así. |
| **GATE 2** — Security Baseline P0 implementada | **Sí** | Ver §17. |
| **GATE 3** — Historial de git auditado formalmente | **Sí** | No es opcional: una vez público, cualquiera puede clonar el historial completo. |
| **GATE 4** — Credenciales antiguas rotadas, si se encontraran | **Condicional** — solo bloquea si GATE 3 encuentra algo. |
| **GATE 5** — Documentación sensible clasificada/sanitizada | **Sí** | Ya se hizo la clasificación (§6) — falta ejecutar las sanitizaciones de categoría B. |
| **GATE 6** — README + LICENSE + SECURITY + CONTRIBUTING listos | **Sí** | Sin esto no es "abrir el código", es "dejar una carpeta visible". |
| **GATE 7** — Repo preparado para colaboradores (`CODE_OF_CONDUCT.md`, plantillas de issue/PR) | **Recomendable, no estrictamente bloqueante** — degradable a P1 inmediato. |
| **GATE 8** — Configuración de GitHub de seguridad lista | **Sí — con activación manual explícita, no automática** (corregido en esta revisión, ver §13) |

**Conclusión:** de los 8 gates propuestos, **7 son necesarios de verdad antes de `PRIVATE → PUBLIC`**; el GATE 7 puede degradarse a "inmediatamente después" sin riesgo real.

---

## 19. P0 / P1 / P2 de este plan (la apertura en sí, no la Security Baseline)

**P0 — antes de publicar:**
- Ejecutar la auditoría formal de historial de git (§5, los cinco frentes) y actuar según resultado.
- Implementar los 10 grupos P0 de la Security Baseline (§17).
- Cerrar el Bloque B.
- Sanitizar los documentos de categoría B de `/seguridad` y `MIGRACION-PRODUCCION.md` (§6).
- Escribir README, LICENSE, SECURITY.md, CONTRIBUTING.md (§7-9, §14).
- Decidir la licencia (§10) — decisión del propietario.
- Auditar y resolver licencias/atribuciones de terceros dentro del repo (§10b), incluido el aviso de MapLibre GL JS.
- Activar Secret Scanning (confirmar, aunque es automático), Push Protection de repositorio (activación manual), branch protection mínima y Dependabot el mismo día de la apertura (§13).
- **Ejecutar la prueba real de "clone → configurar → migrar → ejecutar" contra infraestructura propia del probador (§16) — movida de P1 a P0 en esta revisión.**

**P1 — inmediatamente después:**
- `CODE_OF_CONDUCT.md` y plantillas de issue/PR (GATE 7 degradado).
- `docs/architecture/`, `docs/security/`, `docs/development/`, `docs/deployment/` completos.
- CodeQL/code scanning.
- Checks de la Security Baseline como `required status checks` en cuanto el CI que los ejecuta exista.
- Integración Git↔Vercel u otro mecanismo de *provenance* commit↔deployment (ver §22, nuevo).

**P2 — madurez:**
- Formalización de la política de marca (§11) más allá de este documento de diseño.
- Parametrización del branding hardcodeado (§16) si se decide facilitar forks con nombre propio.
- Revisión de 2 personas para cambios sensibles, cuando exista un segundo mantenedor.
- Script único de bootstrap para nuevas instancias.

---

## 20. Checklist final (resumen operativo de §18-19, no un gate nuevo)

- [ ] Bloque B cerrado y validado.
- [ ] 10 grupos P0 de la Security Baseline implementados (no solo diseñados).
- [ ] Auditoría formal de historial de git ejecutada (los cinco frentes de §5); rotación/limpieza aplicada si hizo falta.
- [ ] Decisión tomada sobre el email personal en el historial de commits (§21).
- [ ] Documentos de categoría B de `/seguridad` y `MIGRACION-PRODUCCION.md` sanitizados (incluida la contraseña de demo y la mención al auditor externo).
- [ ] Licencias/atribuciones de terceros verificadas, incluido el aviso de MapLibre GL JS en `static/vendor/`.
- [ ] README reescrito por completo (no es el scaffold de `sv`).
- [ ] LICENSE elegida y añadida.
- [ ] SECURITY.md publicado, con canal de reporte real (no placeholder).
- [ ] CONTRIBUTING.md publicado, con higiene de Issues incluida.
- [ ] Prueba real de "clone → configurar → migrar → ejecutar" ejecutada con éxito contra infraestructura propia del probador.
- [ ] Secret Scanning confirmado activo + Push Protection de repositorio activada manualmente + branch protection mínima + Dependabot, el día de apertura.
- [ ] Decisión consciente sobre *provenance* commit↔deployment (§22): aceptar la limitación actual explícitamente, o resolverla antes de afirmar auditabilidad total del deployment.

---

## 21. Decisiones abiertas

1. Licencia definitiva (§10) — recomendación dada, decisión pendiente del propietario.
2. Canal definitivo de reporte de `SECURITY.md` (§9).
3. Expectativas de tiempo de respuesta a reportes de seguridad, realistas para un único mantenedor.
4. Plazo de disclosure coordinado (¿90 días estándar, u otro?).
5. Si se redactan los `project-ref`/IDs de infraestructura antes de publicar (recomendación operativa concreta en §6: sí redactar, salvo que se decida lo contrario).
6. Si merece la pena parametrizar el nombre "Convoca" en la UI para forks (§16, P2).
7. Formalización futura de marca/trademark real (más allá de la política de uso informal de §11).
8. Si `docs/security/` debe existir como carpeta separada o basta con un enlace directo a `/seguridad` desde el README.
9. **(Nueva)** Email personal en el historial de commits: mantener los 98 commits tal cual (aceptando la exposición del email personal, si es una elección consciente del autor) o reescribir el historial completo para usar la dirección `noreply` de GitHub en todos los commits — **solo ejecutar la reescritura una vez confirmado que es segura hacerla** (coordinada con GATE 3, force-push a todas las ramas remotas, y aviso a cualquier colaborador con clon local que tendría que volver a clonar). No se ejecuta ahora.
10. **(Nueva)** Mantener o generalizar la mención nominal al auditor externo (generalizado a "auditoría externa de seguridad") en `MIGRACION-PRODUCCION.md`.
11. **(Nueva)** Si el contenido no-código (documentos de producto como el presupuesto de Sanidad) debería llevar una licencia distinta a la del código (p. ej. Creative Commons), o la misma licencia general del repositorio.
12. **(Nueva)** Resolución de *provenance* commit↔deployment (§22): ¿reconectar la integración Git↔Vercel, adoptar otro mecanismo equivalente, o aceptar y comunicar la limitación actual explícitamente?

---

## 22. Deployment provenance — trazabilidad commit ↔ despliegue (nuevo)

**Propiedad que un proyecto abierto debería poder demostrar, no solo declarar:** que el código público en un commit concreto es exactamente el que se ejecuta en la instancia oficial (`convoca.cloud`).

**Estado actual, verificado en sesiones anteriores de esta misma auditoría:** este proyecto no tiene integración Git↔Vercel activa. Todos los deployments se crean vía CLI (`vercel deploy`/`vercel deploy --prod`), con metadatos de commit auto-adjuntados por el propio CLI a partir del `.git` local de quien ejecuta el comando — información informativa, no verificada criptográficamente ni exigida por ningún mecanismo. Esto significa que, hoy, **no existe ninguna forma de que un tercero externo verifique de forma independiente** que lo que corre en producción corresponde exactamente a un commit público concreto; depende de que quien despliega lo haga desde el commit correcto y lo declare honestamente.

**Esto no bloquea necesariamente `PRIVATE → PUBLIC`** — es una limitación de transparencia, no un riesgo de seguridad de datos ni de código. Publicar el repositorio sigue siendo válido y valioso sin resolver esto primero.

**Lo que sí exige esta limitación:** no afirmar, en el README ni en ninguna comunicación pública, algo equivalente a *"este commit público es exactamente el código que ejecuta `convoca.cloud`"* mientras no exista un mecanismo que lo demuestre. Es coherente con el principio ya fijado en §23: afirmar solo lo que se puede sostener con evidencia verificable, no con confianza.

**Solución real, clasificada como P1 (no bloqueante para la apertura, pero debe abordarse después):**
- Reconectar la integración nativa Git↔Vercel (permitiría, como mínimo, que cada deployment de producción quede asociado de forma verificable por la propia plataforma a un commit de `main`), o
- Publicar de forma consistente el SHA del commit desplegado (p. ej. en un endpoint público tipo `/version` o en las cabeceras de respuesta), o
- Cualquier mecanismo equivalente que permita a un tercero comprobar, sin confiar únicamente en la palabra del mantenedor, qué versión del código está realmente sirviendo `convoca.cloud` en un momento dado.

---

## 23. Sobre el lanzamiento (principio, no argumento técnico)

No se trata de poder decir "el código está en GitHub". El principio es otro: **una plataforma de participación ciudadana debe poder ser auditada por cualquiera** — periodista, institución, ciudadano técnico, o un competidor honesto que quiera verificar que no hay trampa. Abrir el código es la forma concreta de sostener esa afirmación con hechos verificables, no con una promesa.

**Afirmaciones responsables que sí se pueden hacer, una vez cumplido lo anterior:**
- El código que ejecuta CONVOCA es público y auditable por cualquiera.
- La arquitectura de permisos y acceso a datos está documentada y es revisable, no es una caja negra.
- Las contribuciones externas son bienvenidas bajo un proceso de revisión definido.
- Cuando se ha encontrado un problema de seguridad, se ha corregido y documentado públicamente (una vez seguro hacerlo) — no se ha ocultado.

**Afirmaciones que no se deben hacer, bajo ninguna circunstancia:**
- "100% seguro" — ninguna Security Baseline elimina el riesgo por completo.
- "Imposible de manipular" — no es una afirmación verificable ni honesta para ningún sistema.
- "Garantiza elecciones/votaciones perfectas" — CONVOCA no es un sistema de votación electoral oficial.
- **(Añadida en esta revisión, ver §22)** "Este commit público es exactamente el código que ejecuta `convoca.cloud`" — no verificable hoy, no afirmar hasta resolver la trazabilidad commit↔deployment.

El valor de marketing de abrir el código no está en la frase de lanzamiento — está en que, un año después, cualquiera pueda seguir comprobando que esas afirmaciones responsables siguen siendo ciertas, no solo el día del anuncio.

---

## OPEN SOURCE MINIMUM VIABLE READINESS

Máximo 12 grupos, agrupados deliberadamente para que sean implementables de verdad, no una lista de "sería bonito tener":

1. **Bloque B cerrado y validado en producción.**
2. **Security Baseline v1 — los 10 grupos P0 implementados de verdad** (código/CI real, no solo el diseño de `19_...md`).
3. **Historial de git auditado formalmente** — los cinco frentes de §5 (secretos, configuraciones de IDE históricas, archivos eliminados, blobs no alcanzables, metadatos personales), no solo la verificación preliminar.
4. **Metadatos/email histórico — decisión tomada** (§21.9): mantener o reescribir el historial para eliminar el email personal, ejecutado solo si se confirma seguro hacerlo.
5. **Credenciales antiguas rotadas, si el punto 3 encontrara alguna** — rotación siempre antes que cualquier limpieza de historial.
6. **Licencias y atribuciones de terceros verificadas** — dependencias, `static/vendor/` (MapLibre GL JS, BSD-3-Clause, aviso pendiente), iconos, imágenes, fuentes, documentos/assets.
7. **Documentación sensible clasificada y sanitizada** — `/seguridad` categoría B y `MIGRACION-PRODUCCION.md` (contraseña de demo y mención al auditor externo resueltas).
8. **README + LICENSE (licencia elegida) + SECURITY.md + CONTRIBUTING.md publicados** (este último con higiene de Issues incluida).
9. **Clean-room reproducibility test ejecutado con éxito** — `clone → variables propias → Supabase propio → migraciones → install → build/run`, sin ningún secreto de la instancia oficial. P0, no P1.
10. **GitHub Security lista el día de apertura** — Secret Scanning confirmado (automático), Push Protection de repositorio activada manualmente, branch protection mínima, Dependabot.
11. **Issues con plantilla mínima y moderación básica**, con el canal privado de `SECURITY.md` operativo para disclosure de vulnerabilidades.
12. **Decisión consciente sobre *provenance* commit↔deployment** (§22) — no bloqueante para publicar, pero debe decidirse y comunicarse explícitamente, no dejarse como un olvido.

---

# OPEN SOURCE READINESS PLAN v1 — CANDIDATO FINAL

| Gate | Evidencia necesaria | Bloquea publicación |
|---|---|---|
| Bloque B cerrado | Migración `0042` aplicada y validada en producción según el plan `17` | **Sí** |
| Security Baseline P0 implementada | Los 10 grupos de `19_...md` §15 existiendo como código/CI ejecutable, no como diseño | **Sí** |
| Historial de git auditado | Informe de ejecución de `gitleaks`/`trufflehog` en modo historial completo (todas las ramas), más revisión de archivos eliminados y blobs no alcanzables | **Sí** |
| Metadatos/email histórico decidido | Decisión documentada (§21.9); si se reescribe, confirmación de que todas las ramas remotas se actualizaron y los colaboradores fueron avisados | **Sí, como decisión — no exige necesariamente reescribir, sí exige decidir** |
| Credenciales rotadas, si aparecieran | Confirmación de rotación en el proveedor correspondiente, previa a cualquier limpieza de historial | **Condicional** — solo si el gate anterior encuentra algo |
| Licencias/atribuciones de terceros comprobadas | Inventario de licencias de dependencias sin incompatibilidades; aviso de copyright de MapLibre GL JS añadido junto a `static/vendor/` | **Sí** |
| Documentación sensible sanitizada | `/seguridad` categoría B redactada; `MIGRACION-PRODUCCION.md` sin la contraseña de demo en claro y con la mención al auditor externo resuelta según §21.10 | **Sí** |
| README + LICENSE + SECURITY + CONTRIBUTING listos | Los 4 archivos publicados en la raíz, con contenido real (no scaffold, no placeholder) | **Sí** |
| Clean-room reproducibility test | Registro de una ejecución real (o simulación con el mismo rigor) de `clone → configurar → migrar → ejecutar` contra infraestructura propia del probador, sin secretos oficiales | **Sí** |
| GitHub Security lista | Capturas o confirmación de Secret Scanning activo, Push Protection de repositorio activada, branch protection mínima y Dependabot, todo visible en Settings el día de apertura | **Sí** |
| Issues con higiene mínima | Plantilla de Issue publicada; regla de "sin disclosure de vulnerabilidades en Issues públicos" reflejada en `SECURITY.md` | **Recomendable — degradable a inmediatamente después, no bloqueante** |
| Deployment provenance | Decisión documentada (§22): mecanismo adoptado, o limitación aceptada y comunicada explícitamente en el README | **No bloquea — pero exige decisión explícita, no silencio** |
