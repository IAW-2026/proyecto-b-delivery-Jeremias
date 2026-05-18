# Cambios en dashboard

**Fecha:** Mayo 17, 2026

## Objetivo

Separar el dashboard común del panel específico del chofer para que la sidebar del chofer no se mezcle con una navegación genérica anterior.

## Cambios realizados

- `app/dashboard/layout.tsx` quedó solo como protección de acceso con Clerk.
- `app/dashboard/page.tsx` pasó a ser un punto de entrada por rol.
- Si el usuario tiene rol `delivery`, se redirige a `/dashboard/chofer`.
- Si el usuario tiene rol `logistic_admin`, se redirige a `/dashboard/rutas`.
- Si no hay rol asignado, se muestra un mensaje simple de aviso.

## Resultado esperado

- El chofer entra directo a su panel propio.
- La sidebar de chofer vive únicamente dentro de `app/dashboard/chofer/layout.tsx`.
- `/dashboard` ya no actúa como panel visual compartido, sino como router de acceso.

## Observaciones

- La lógica de rol sigue consultando `/api/user-role`.
- El cambio es mínimo y no modifica la UI del chofer.