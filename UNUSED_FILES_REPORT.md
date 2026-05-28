Informe de detección de código potencialmente obsoleto

Fecha: 2026-05-27

Resumen rápido
- Escaneo inicial realizado en el árbol `lib/` y en rutas relacionadas.
- No se encontraron archivos "claramente sin referencias" que puedan borrarse de forma completamente segura sin revisión manual.

Resumen por archivo/carpeta (lib/)
- lib/prisma.ts — Referencias encontradas (ej. `proxy.ts`, documentación). NO eliminar.
- lib/logisticAdminStore.ts — Importado por la UI admin/chofer. NO eliminar.
- lib/choferStatus.ts — Importado y usado para payloads de chofer. NO eliminar.
- lib/companyContext.ts — Usado en rutas y helpers de contexto. NO eliminar.
- lib/readyOrdersStore.ts — Archivo presente; revisar uso en `app/api/ready-orders` o flujos de ingest. MARCAR PARA REVISIÓN.
- lib/vendors.ts — Endpoints `api/vendors` y mocks referencian este módulo. NO eliminar sin reemplazo.
- lib/mocks/* — Contiene datos mock (`chofer.ts`, `pedidos.ts`, `vendors.ts`). Son usados por `logisticAdminStore.ts` y endpoints mock; pueden eliminarse si ya no necesitas mocks, pero requiere validar flujos que dependen de datos de prueba.

Observaciones adicionales
- Muchos bundles y artefactos en `.next/` y `app/generated/prisma/` son generados automáticamente; no deben borrarse manualmente en el repo (se regeneran).
- Hay scripts en `scripts/` usados para tareas (p.ej. `associate_vendor_dev.js`) — conservar si se usan.

Recomendación
1. Revisar manualmente `lib/readyOrdersStore.ts` y `lib/mocks/` para confirmar si los mocks siguen en uso en entorno de desarrollo. Si NO son necesarios, puedo moverlos a `lib/mocks/ARCHIVED/` o eliminarlos en un commit separado.
2. Proponer una lista final de archivos a eliminar y ejecutar `pnpm build` después de cada cambio.

Siguiente acción sugerida
- ¿Autorizas que mueva `lib/mocks/` a `lib/mocks/ARCHIVED/` y ejecute `pnpm build` para verificar? O prefieres que primero listemos archivos concretos para borrar.
