# 35 — Bugfix: el mecanismo de override era inalcanzable desde cualquier PR

**Estado: bugfix implementado y probado (local + GitHub Actions real). No toca 0043 ni el PR #12, que permanecen congelados. No hay merge.**

## 1. Cómo se encontró

Al intentar registrar el override exigido por el gate B9 (`check-security-definer.mjs`) para las 10 funciones `SECURITY DEFINER` de `0043` (PR #12), se añadió un commit con los 10 trailers `Security-Baseline-Override: security-definer:<función>` exactos. El run de GitHub Actions volvió a fallar con el **mismo listado de FAIL**, como si el commit no existiera.

## 2. Causa raíz

`scripts/security/lib/override.mjs::getHeadCommitMessage()` ejecutaba `git log -1 --format=%B` sin argumento — lee el mensaje del commit que esté físicamente checkouteado en ese momento.

`.github/workflows/security-baseline.yml` usa `actions/checkout@v5` sin fijar `ref:` en los jobs `code-static-checks` y `migrations-structure`. Para el evento `pull_request`, ese es precisamente el caso en el que `actions/checkout` **no** hace checkout de la punta real de la rama del PR por defecto: hace checkout de `refs/pull/<N>/merge`, un **commit de merge sintético que genera GitHub** combinando el HEAD del PR con la base, con un mensaje autogenerado (`"Merge <head> into <base>"`).

Confirmado con evidencia directa contra el PR #12 (no supuesto):
- El propio step de checkout ejecuta `git log -1 --format=%H`: devolvió `352779c58c41d8d85178c927925d98678454f480`.
- El commit real de atestación era `afeaea30523bf4b9b7547f46d252c35d8828e077` — un hash distinto.
- `gh api .../commits/352779c5...` confirmó que el mensaje de ese commit checkouteado era literalmente `"Merge afeaea30523bf4b9b7547f46d252c35d8828e077 into e54db6223b079763396cab2daf8dfc7ec0bc9b2c"` — sin ningún trailer.

**Por qué local PASS y GitHub Actions FAIL:** al ejecutar `pnpm security:baseline` (o los scripts sueltos) localmente sobre una rama con commits reales, `git log -1` siempre lee el commit real de esa rama — no hay ningún merge sintético de por medio salvo que se simule explícitamente. Los "11/11" pruebas negativas originales de `seguridad/30_..._implementacion.md` (incluida la 4b, override local) se hicieron todas así: commits reales locales, revertidos después con `git reset --hard`. Ninguna de ellas pasaba por un checkout de `pull_request` de GitHub Actions, así que ninguna podía revelar este hueco — es estructural del evento `pull_request`, no de la lógica de comparación de trailers en sí.

`getChangedFiles()`/`getFileNow()` (para saber qué archivos son nuevos y su contenido) **no se ven afectados**: comparan árboles de contenido contra `BASE_REF`, y el árbol del commit de merge sintético refleja correctamente el contenido fusionado. Solo la lectura del **mensaje** del commit está afectada.

## 3. Solución implementada

**Principio de diseño respetado:** el checkout que valida el código (contenido, migraciones, build) sigue validando el resultado de la fusión sintética — no se ha tocado ese comportamiento. Solo se introduce una referencia explícita, adicional, al commit del que se deben leer los trailers de atestación.

- **`.github/workflows/security-baseline.yml`** — en los 2 jobs que ejecutan scripts consumidores del mecanismo de override (`code-static-checks`, `migrations-structure`), se añade:
  ```yaml
  SECURITY_BASELINE_OVERRIDE_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || '' }}
  ```
  Expresión genérica de contexto de GitHub Actions — no referencia ningún PR concreto, funciona igual para cualquier PR presente o futuro. Vacía a propósito en `push`/`schedule` (esos eventos ya checkoutean el commit real; forzar algo ahí sería innecesario).

  No hizo falta tocar `fetch-depth`: ambos jobs ya usaban `fetch-depth: 0` (historial completo), así que el commit real del PR ya está disponible como objeto git local (es ancestro directo del commit de merge sintético) sin necesidad de un `fetch` adicional ni de llamar a la API de GitHub.

- **`scripts/security/lib/override.mjs`** — `getHeadCommitMessage()` ahora:
  1. Si `SECURITY_BASELINE_OVERRIDE_SHA` está presente (no vacío), ejecuta `git log -1 --format=%B <ese-sha>` — lee el mensaje de ESE commit exacto, no del HEAD checkouteado.
  2. Si esa resolución falla (objeto no encontrado), **no** hace fallback al HEAD checkouteado ni a ningún otro commit: registra un error explícito por `stderr` y devuelve cadena vacía — equivalente a "sin overrides", lo que hace fallar el gate correspondiente de forma segura (fail-closed).
  3. Si `SECURITY_BASELINE_OVERRIDE_SHA` no está presente (push/schedule/ejecución local), se mantiene el comportamiento anterior exacto: `git log -1 --format=%B` sin argumento.

- **`scripts/security/lib/override.test.mjs`** (nuevo) — pruebas negativas reproducibles del mecanismo (§7).

## 4. Comportamiento antes/después

| | Antes | Después |
|---|---|---|
| `push`/`schedule`/local | `git log -1` lee el commit real (correcto) | Sin cambio — mismo camino de código |
| `pull_request`, sin `SECURITY_BASELINE_OVERRIDE_SHA` | `git log -1` lee el merge sintético — **override inalcanzable siempre** | N/A — el workflow ya fija la variable en este evento |
| `pull_request`, con el fix | (bug) | `git log -1 <head-real-del-pr>` — lee el commit correcto, el override funciona |
| `SECURITY_BASELINE_OVERRIDE_SHA` apunta a un commit inexistente | N/A (no existía la variable) | Fail-closed: se trata como "sin overrides", con diagnóstico explícito por `stderr`, nunca fallback silencioso |

## 5. Propiedad de seguridad del modelo — sin autorización retroactiva

La atestación siempre corresponde al **HEAD actual del PR en el momento de cada ejecución de CI**, nunca a un commit fijo o antiguo:

`SECURITY_BASELINE_OVERRIDE_SHA` se reevalúa en cada run a partir de `github.event.pull_request.head.sha`, que GitHub actualiza automáticamente cada vez que se empuja un commit nuevo a la rama del PR. Si tras un commit de atestación se añade un **nuevo commit funcional** (por ejemplo, una modificación real a una función `SECURITY DEFINER`), el nuevo HEAD pasa a ser ese commit — y `git log -1 --format=%B <nuevo-head>` solo ve el mensaje de ESE commit. Si no repite los trailers necesarios, el gate vuelve a fallar exigiendo una atestación nueva. Un trailer en un commit antiguo **nunca** autoriza cambios posteriores no revisados — confirmado explícitamente por el Caso C de las pruebas negativas (§7).

## 6. Pruebas negativas (`scripts/security/lib/override.test.mjs`)

Repositorio git desechable construido y destruido por el propio script en cada caso — no toca el historial real de este repositorio.

| Caso | Descripción | Resultado |
|---|---|---|
| A | HEAD sin trailer | **Sin override** (equivale a FAIL en el gate) |
| B | Commit real del PR con el trailer exacto; el "runner" está posicionado sobre un commit de merge sintético posterior sin trailer — reproduce exactamente el bug real. Comparado explícitamente sin y con el fix | **Sin fix: sin override (bug reproducido). Con fix: override encontrado** |
| C | Trailer en un commit anterior; el HEAD actual (nuevo commit funcional) no lo repite | **Sin override** — confirma la propiedad de §5 |
| D | Nombre de función incorrecto en el trailer | **Sin override** para la función real |
| E | Faltan uno de varios trailers necesarios | **Sin override** solo para la función sin trailer; la que sí lo tiene, override encontrado |
| F | Sin funciones `SECURITY DEFINER` nuevas/modificadas | No exige override — propiedad de `check-security-definer.mjs` (`newMigrations.length === 0` o ningún bloque `security definer` encontrado → PASS temprano antes de llamar a `isOverridden`), verificada leyendo ese script |
| extra | `SECURITY_BASELINE_OVERRIDE_SHA` apunta a un SHA inexistente | Fail-closed: sin overrides, diagnóstico explícito, **sin** fallback silencioso al HEAD real |

**8/8 casos con el resultado esperado.**

Además, reproducida localmente y de forma reversible (commit temporal + `git reset --hard` inmediato, mismo método que las 11 pruebas originales) la prueba #4/#4b original de `seguridad/30`: sin override → FAIL; con el trailer exacto en el commit → PASS con WARN. Sin cambios de comportamiento respecto al original para el camino local/push (confirmado, ver §4).

**No se ha reducido ninguna de las 11/11 pruebas negativas originales** — el fix solo añade una rama de resolución adicional (`SECURITY_BASELINE_OVERRIDE_SHA` presente), el camino sin esa variable es idéntico al código anterior.

## 7. Demostración real en GitHub Actions (no solo local)

Ver PR de este bugfix — `fix/security-baseline-pr-head-override → main`. Además de que el propio PR debe quedar verde (no introduce ninguna función `SECURITY DEFINER` nueva, por lo que `code-static-checks` pasa sin necesitar ningún override), se demostró el mecanismo en vivo con una migración de prueba temporal (`supabase/migrations/9999_test_override_temp.sql`, función `test_definer_inseguro()` inerte) añadida, empujada y **eliminada de nuevo antes de dejar el PR listo para revisión** — sin quedar como cambio permanente:

1. Commit con la migración de prueba, sin trailer → push → GitHub Actions real: `code-static-checks` **FAIL** (gate B9, como se espera).
2. Commit añadiendo `Security-Baseline-Override: security-definer:test_definer_inseguro` → push → GitHub Actions real, sobre el commit de merge sintético del PR (confirmado con el mismo método de la sección 2): `code-static-checks` **PASS**.
3. Commit eliminando `9999_test_override_temp.sql` → push → GitHub Actions real: **PASS**, limpio, sin ningún rastro de la función de prueba.

(Resultados y enlaces exactos de estos 3 runs — hashes de commit, IDs de run — en el resultado final de este bloque de trabajo, no repetidos aquí para no duplicar información que cambia con cada ejecución.)

## 8. Alcance

Este PR contiene exclusivamente: `.github/workflows/security-baseline.yml`, `scripts/security/lib/override.mjs`, `scripts/security/lib/override.test.mjs`, este documento. No toca `0043`, ningún archivo de privacidad, Supabase, Vercel, staging ni producción.
