# 47 — Resultados de la promoción real de 0044 a producción

**Estado: `0044` aplicada realmente a producción y validada. `delete-account` desplegada realmente a producción. No se ha necesitado rollback.** Continúa `seguridad/41`–`46`. Ningún dato ciudadano real fue creado, modificado ni borrado durante esta promoción — todos los fixtures fueron sintéticos, propios, y se limpiaron por completo.

---

## T1 — Precheck inmediato

Repetido justo antes de escribir, todo idéntico a `seguridad/46`:

- `main == origin/main` (`daf8644`), working tree limpio.
- Producción: `migration list` → 43/44 con remote, `0044` pendiente (sin cambios desde el preflight).
- `db push --linked --dry-run` → exclusivamente `0044`.
- Precheck `p_community`: `3 VALID / 0 NULL / 0 INVALID` (sin cambios).
- Backup PRE-0044: existe, SHA-256 idéntico al documentado (`f070dfb7...b7858a2`).

Nada cambió desde `seguridad/46`. Sin motivo de DETENTE.

---

## T2 — Aplicación de 0044

```
supabase db push --linked
→ Applying migration 0044_post_review_abuse_and_visibility_hardening.sql...
→ inicio: 2026-08-12T22:16:21Z · fin: 2026-08-12T22:16:27Z (~6s)
→ exit code 0, sin warnings ni errores
→ únicamente 0044_post_review_abuse_and_visibility_hardening.sql
```

---

## T3 — Gates estructurales post-DB (13/13 PASS)

| Gate | Resultado |
|---|---|
| `migration list` | 44/44, `local == remote` |
| `db push --dry-run` | vacío (`upToDate: true`) |
| `write_rate_limits` existe | Sí |
| RLS activo | Sí |
| Policies propias | 0 |
| ACL `write_rate_limits` | `{postgres=arwdDxtm, service_role=arwdDxtm}` — sin `PUBLIC`/`anon`/`authenticated` |
| 3 triggers presentes y `ENABLED` (`O`) | Sí, los 3 |
| `enforce_write_rate_limit`: `SECURITY DEFINER`, `search_path=public`, `pg_advisory_xact_lock` presente | Sí, los 3 |
| `enforce_write_rate_limit`/`purge_old_write_rate_limits`: `EXECUTE` | Solo `postgres`/`service_role` |
| Cron `purge-old-write-rate-limits` | Presente, activo |
| `get_attendance_counts`: filtro de estado presente | Sí |
| `set_concern_listening_survey_response`: normalización + catálogo de 19 presentes | Sí, ambos |
| Grants legítimos preservados | `get_attendance_counts`: `anon`+`authenticated`; `set_concern_listening_survey_response`: `authenticated`, sin `anon` |

Resultado idéntico, gate a gate, al de staging (`seguridad/45`).

---

## T4 — Smoke funcional mínimo

**Attendance (vía API pública real, como `anon`, con datos reales existentes — sin crear fixtures):**
- `get_attendance_counts()` sin argumentos → 3 eventos reales, todos con estado público confirmado por consulta privilegiada aparte (`3/3` públicos).
- ID explícito de uno de esos eventos → mismo conteo, sin regresión.
- ID inexistente (no había eventos no públicos reales en producción en el momento de la prueba para ejercer el caso negativo con datos reales) → `[]`, sin filtrar nada.
- Confirmado además, por consulta privilegiada: **0 eventos no públicos en toda la base de producción en este momento** — no había ningún caso real de exclusión que demostrar; la protección ya quedó demostrada exhaustivamente en staging (`seguridad/45` §5) y en el entorno desechable (`seguridad/44`).

**Páginas públicas:** `/`, `/pulso/soluciones/vivienda-plan-vivienda-2036`, `/pulso/proximo-bloque`, `/pulso/escucha/sanidad` → **200 las 4**.

---

## T5 — Prueba controlada community + rate limit (fixtures mínimos, limpiados)

Una única cuenta sintética (`t5prod_<timestamp>@example.test`), sesión real vía `signInWithPassword`, contra la API pública real de producción. Fixtures reutilizados de datos ya existentes donde fue posible (un evento público real y una ronda de escucha abierta real, ambos sin modificar — solo referenciados por FK desde filas de prueba ya eliminadas):

| # | Prueba | Resultado |
|---|---|---|
| 1 | `community`: valor inventado (`categoria_inventada_t5`) | Rechazado — `Selecciona una comunidad autónoma válida.` |
| 2 | `community`: valor real (`Andalucía`) | Aceptado |
| 3 | Verificación: el valor inventado no persistió en ninguna fila | Confirmado |
| 4 | `reports`: 4 intentos secuenciales | `[true,true,true,false]` — 3 OK, 4º rechazado |
| 5 | Concurrencia mínima controlada: 4 inserts simultáneos (`Promise.all`) tras resetear el cupo | **Exactamente 3 aceptadas** — confirma que producción usa realmente la función nueva con el advisory lock, no la versión anterior |

**5/5 PASS.**

**Cleanup verificado por conteo tras la limpieza automática:** `auth.users` (`email like 't5prod_%'`), `write_rate_limits`, `reports`, `concern_listening_survey_responses`, `organizers` — **0 en las 5 tablas**. Ni el evento real ni la ronda real usados como referencia quedaron modificados (solo se les apuntó desde filas de prueba, ya eliminadas).

---

## T6 — Observabilidad post-0044

- `inspect db locks` → solo la propia consulta de inspección (autolock esperado, `age 00:00:00`); ningún otro lock exclusivo.
- `inspect db blocking` → vacío, sin queries bloqueantes.
- `inspect db long-running-queries` → vacío, sin queries lentas.
- Páginas públicas críticas: **200 las 4**, re-confirmado después de la actividad de T5.
- Ningún error 5xx observado, ningún rechazo de rate-limit inesperado (los únicos rechazos observados fueron los intencionales de las propias pruebas T4/T5, indistinguibles de un rate-limit legítimo funcionando como se diseñó).

**Sin ninguna señal de regresión atribuible a `0044`.**

---

## T7 — Despliegue de `delete-account`

```
supabase functions deploy delete-account --project-ref <producción>
→ Bundling Function: delete-account
→ Deploying Function: delete-account (script size: 684 kB)
→ inicio: 2026-08-12T22:25:02Z · fin: 2026-08-12T22:25:09Z (~7s)
→ exit code 0, sin warnings
→ {"functions":["delete-account"], ...} — únicamente esa función
```

---

## T8 — Smoke de `delete-account` (sin cuentas reales)

| Prueba | Resultado |
|---|---|
| `POST` sin cabecera `Authorization` | `401 UNAUTHORIZED_NO_AUTH_HEADER` |
| `POST` con `Authorization: Bearer <token inválido>` | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` |
| `GET` (método no soportado) con token inválido | `401` (el gate de `verify_jwt` de la plataforma actúa antes de que el código de la función compruebe el método) |

**Función viva, responde, y el gate `verify_jwt: true` de la plataforma sigue bloqueando el acceso no autorizado exactamente como antes del despliegue** — sin necesidad de crear ni borrar ninguna cuenta real para confirmarlo, tal como se pidió.

---

## T9 — Estado final

| Verificación | Resultado |
|---|---|
| Migraciones en producción | **44/44**, `local == remote` |
| `db push --dry-run` | Vacío (`upToDate: true`) |
| Gates estructurales (T3) | 13/13 PASS |
| Páginas públicas | 4/4 en 200 |
| Fixtures sintéticos restantes | **0** (T5, verificado por conteo) |
| `delete-account` | Desplegada correctamente, único código desplegado en esta fase |
| Otro código desplegado | Ninguno |
| Rollback | **No necesario, no ejecutado** |
| Nuevos 5xx inmediatos | Ninguno observado |

---

## Rollback

**No se ha ejecutado.** No se dio ninguna de las condiciones que lo justificarían (fallo crítico atribuible a `0044`). `seguridad/43_rollback_0044_candidata.sql` sigue disponible, validado en round-trip completo (`seguridad/44`) y revalidado contra el estado real de producción tanto antes (`seguridad/46`) como conceptualmente después de esta promoción (los mismos 7 objetos que borraría ahora sí existen, con las firmas exactas esperadas).

---

## Riesgos residuales

**El principal riesgo residual conocido: `set_attendance` (`0014`) podría compartir la misma carrera `INSERT → COUNT` sin advisory lock que tenía `enforce_write_rate_limit` antes de la corrección de `0044`-R2.** No está confirmado empíricamente contra ningún entorno. No forma parte de `0044`. No bloquea el cierre de esta promoción. Queda como candidato explícito a un hallazgo/issue de backlog independiente, a evaluar en una revisión futura separada.

Riesgos ya cerrados en fases anteriores (sin novedad en esta): datos históricos de `p_community` (0 INVALID, confirmado dos veces); compatibilidad de frontend (confirmada sin necesidad de deploy web); ACL de `write_rate_limits` (confirmada cerrada en producción real).

---

# 0044 — PRODUCCIÓN PROMOVIDA, HARDENING CERRADO
