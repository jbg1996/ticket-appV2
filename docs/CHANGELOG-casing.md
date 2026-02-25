# Casing migration: status, priority, ticket type

## Qué se cambió
- Se migraron los catálogos `Status`, `Priority` y `TicketType` para usar `code` en camelCase interno (`inProgress`, `onHold`, etc.) y `label` para UI.
- Se mantuvo `name` por compatibilidad, pero ahora se sincroniza con `code`.
- Backend y frontend usan `code` internamente y muestran `label` (o `formatLabel` como fallback).

## Cómo se migró
- Nueva migración SQL en Prisma que:
  - agrega columnas `code` y `label`;
  - transforma valores legacy (uppercase/snake_case) a camelCase;
  - sincroniza `name = code`;
  - crea índices únicos por `code`.
- El seed quedó actualizado para usar catálogos camelCase con labels Title Case.

## Cómo se muestra en UI
- Se agregó util `formatLabel` para transformar `camelCase` y `snake_case` legacy a Title Case.
- Listados, badges y selects de status/priority/type renderizan `label` y fallback con `formatLabel`.

## Cómo verificar
1. Ejecutar migraciones sin reset.
2. Ejecutar seed.
3. Crear ticket y validar que persiste códigos camelCase (`status.code = inProgress`).
4. Validar que la UI muestra etiquetas tipo `In Progress`.
5. Ejecutar búsqueda global para asegurar que no hay literales legacy uppercase de status/priority/type.
