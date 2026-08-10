# 40 — Apertura pública de CONVOCA (OSR-3)

**Estado: el repositorio es PUBLIC desde la fecha/hora indicada abajo.** Este documento registra exactamente qué se activó y qué queda diferido — no contiene identificadores de infraestructura, credenciales ni configuración privada.

Continúa `seguridad/38_open_source_readiness_audit.md` (auditoría) y `seguridad/39_open_source_readiness_saneamiento.md` (saneamiento, PR #14 fusionado como `168790fa85dd0a9127fb689d76df44a4f199b95e`).

---

## 1. Apertura

| | |
|---|---|
| Fecha/hora de apertura (UTC) | 2026-08-10T12:37:05Z |
| HEAD publicado | `168790fa85dd0a9127fb689d76df44a4f199b95e` |
| Visibilidad previa | PRIVATE |
| Visibilidad tras la apertura | PUBLIC |
| Cambio realizado | Únicamente visibilidad (`gh repo edit --visibility public`) — ninguna otra opción del repositorio se modificó en la misma operación |
| Rama por defecto | `main`, sin cambios |

## 2. Precheck inmediatamente previo a la apertura

- Repositorio PRIVATE confirmado antes de actuar.
- `main == origin/main`, working tree sin cambios versionados pendientes.
- Último Security Baseline P0 en `main`: PASS.
- `LICENSE`, `SECURITY.md`, `README.md`, `CONTRIBUTING.md`, `THIRD_PARTY_LICENSES.md` presentes.
- Secret scan de `HEAD` (113 commits) y del historial completo alcanzable: **0 leaks** en ambos.
- Revisión de archivos trackeados potencialmente sensibles: únicamente las plantillas `.env.*.example` intencionadas, sin valores reales.
- Verificación dirigida de que ningún identificador ya redactado en el saneamiento (OSR-2) había reaparecido: limpio.

## 3. Secret scanning y Push Protection

- No estaban activados automáticamente por el simple cambio de visibilidad — se activaron explícitamente tras la apertura.
- **Secret scanning:** activado.
- **Secret scanning push protection:** activado.
- Alertas de secret scanning tras la activación: **0**.

## 4. Private Vulnerability Reporting

- Activado tras la apertura (requiere que el repositorio sea público; no estaba disponible antes).
- Usa el canal descrito en `SECURITY.md` — sin exponer ningún email personal como canal obligatorio.
- No se ha creado ningún advisory de prueba ni ficticio.

## 5. Dependabot

- **Dependabot alerts:** activado.
- **Dependabot security updates:** activado.
- **Dependabot version updates** (`dependabot.yml`): **no activado deliberadamente** — es mantenimiento ordinario, no un requisito de seguridad de esta fase, queda como mejora futura.
- Alertas existentes tras la activación: **0** (una activación reciente puede tardar en completar su primer escaneo; se revisará periódicamente, no es una acción pendiente de esta fase).

## 6. Protección de `main`

Configurada para un proyecto mantenido por una sola persona:

- Force-push a `main`: **bloqueado**.
- Borrado de `main`: **bloqueado**.
- Checks de estado requeridos antes de fusionar: los 8 jobs reales de `Security Baseline P0` que se ejecutan en cada `pull_request` (`resolve-base-ref`, `build-reproducible`, `migrations-structure`, `migrations-cleanroom`, `migrations-rls`, `code-static-checks`, `dependencies`, `secrets-diff`), en modo estricto (la rama debe estar actualizada respecto a `main` antes de fusionar). El job `secrets-full-history` **no** se incluyó como requerido — solo se ejecuta por `schedule`, nunca en un `pull_request`, y exigirlo habría bloqueado toda fusión de forma permanente.
- Aprobación de revisión de otra persona: **no exigida** — el proyecto lo mantiene una sola persona; exigirla habría bloqueado el propio flujo de trabajo normal.
- Vía de recuperación administrativa: conservada explícitamente (la protección no fuerza a los administradores del repositorio a pasar por las mismas restricciones), precisamente para no bloquear accidentalmente al propietario si algún check quedara roto o mal configurado en el futuro.

Verificado tras aplicar: la rama `main` aparece como protegida y la configuración anterior se confirmó leyéndola de vuelta desde la API, no solo asumida tras el `PUT`.

## 7. Workflow permissions / seguridad para forks

Revalidado ahora que el repositorio es público, sin ningún cambio de código:

- Ningún workflow usa `pull_request_target`.
- Ningún workflow referencia `secrets.*`.
- Ambos workflows declaran explícitamente `permissions: contents: read`.
- Permisos por defecto del token de Actions a nivel de repositorio: solo lectura.
- Sin cambios respecto a lo ya verificado en la auditoría OSR-1 — el estado ya coincidía con el objetivo de mínimo privilegio, no fue necesario modificar nada.

## 8. Verificación externa (perspectiva anónima, sin autenticación)

Comprobado con peticiones sin ningún token/sesión:

- API pública del repositorio: `private: false`, licencia detectada correctamente como AGPL-3.0.
- `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`: accesibles públicamente.
- Página principal del repositorio: accesible.
- Ejecuciones de GitHub Actions: visibles públicamente.
- `.env`, `.env.local`, `.env.oauth`, `.env.staging.secrets`: **no accesibles** (nunca estuvieron trackeados; confirmado que tampoco lo están ahora que el repositorio es público).

## 9. Integridad tras la apertura

- El cambio de visibilidad y la configuración de GitHub Security **no modificaron ningún archivo del repositorio**.
- `HEAD` de `main` idéntico antes y después de toda esta fase: `168790fa85dd0a9127fb689d76df44a4f199b95e`.
- Ningún commit nuevo se introdujo como efecto de estos cambios de configuración.
- El Security Baseline P0 más reciente en `main` sigue siendo el mismo run en verde de antes de la apertura.

## 10. Riesgos y mejoras diferidas (backlog, no bloqueadores)

- Pinning de GitHub Actions de terceros a SHA (en vez de tags de versión).
- Provenance commit↔deployment.
- Parametrización completa de la marca CONVOCA para facilitar forks/reutilización.
- Licencia específica para contenido no-código.
- Dependabot version updates (`dependabot.yml`).
- Mejoras P1/P2 futuras del propio Security Baseline.

Ninguno de estos ítems bloqueaba la apertura; se mantienen como trabajo futuro ordinario.

---

## Resultado

Apertura ejecutada, verificada en cada punto contra el estado real de GitHub (no asumida): visibilidad, secret scanning, push protection, Private Vulnerability Reporting, Dependabot, protección de `main` con checks reales (no inventados) y sin riesgo de bloqueo del propietario, seguridad de workflows para forks revalidada, y verificación externa anónima confirmando lo esperado y descartando cualquier archivo sensible accesible.

**CONVOCA OPEN SOURCE — REPOSITORIO PÚBLICO, GATE COMPLETO**
