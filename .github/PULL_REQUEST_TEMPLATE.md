## Qué hace este PR

<!-- Descripción breve y directa. -->

## Tipo de cambio

- [ ] Corrección de bug
- [ ] Funcionalidad nueva
- [ ] Cambio de seguridad (RLS, `SECURITY DEFINER`, Edge Functions, privacidad)
- [ ] Migración de base de datos nueva
- [ ] Documentación
- [ ] Otro

## Si toca RLS / `SECURITY DEFINER` / Edge Functions / privacidad

<!--
Explica: por qué es necesario, qué se comprobó (idealmente contra una
réplica desechable propia), y qué pasaría si el cambio estuviera mal.
Ver CONTRIBUTING.md.
-->

## Cómo se probó

- [ ] `pnpm test`
- [ ] `pnpm check`
- [ ] `pnpm lint`
- [ ] `pnpm security:baseline`
- [ ] Si toca migraciones: aplicado y verificado contra un proyecto Supabase propio, no la instancia oficial

## Checklist

- [ ] No incluye secretos, tokens ni credenciales de ningún tipo
- [ ] No incluye datos de participación ciudadana reales
- [ ] No se ha probado contra `convoca.cloud` de forma destructiva

<!--
¿Estás reportando una vulnerabilidad de seguridad en vez de proponer un
cambio? No lo hagas aquí — lee SECURITY.md.
-->
