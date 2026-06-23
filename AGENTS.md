<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context — Delivery App

## Overview
Delivery app for agua-ya. Connects sellers, logistic admins, and choferes to manage water bottle delivery orders. Three apps coexist: this one (delivery), the seller app (`proyecto-b-seller-agua-ya`), and the buyer app (`proyecto-b-buyer-agua-ya`).

- **Seller App**: Pushes ready orders via `POST /api/ready-orders`; vendors fetched via `GET /api/vendors`
- **Buyer App**: Receives order status sync via PATCH `/api/orders/[id]` with `x-api-key` header

## Architecture
- **Framework**: Next.js 16.2.6 (webpack)
- **Database**: PostgreSQL (Neon) via Prisma 7
- **Auth**: Clerk (publicMetadata.roles as canonical key, plural)
- **Vendor Integration**: Fetches real vendor data from seller app at `GET /api/vendors` with `X-API-Key` header
- **Order Integration**: Seller app pushes ready orders via `POST /api/ready-orders` with `Bearer DELIVERY_API_KEY`
- **Buyer Sync**: Delivery app syncs order status changes (ready, en_camino, entregado, cancelado, revision) to buyer app via PATCH `/api/orders/[id]` with `x-api-key` header

## Key Decisions
- **`idVendedor` → `String`**: aligns with seller app's CUID-based IDs
- **No fallback to mocks**: `lib/mocks/` deleted; if seller API is unreachable, empty lists shown
- **Clerk metadata key `roles` (plural)**: both apps must write to the same key. The old `role` (singular) is treated as legacy/migration
- **Companies for choferes**: sourced from `UserProfile` where `role = 'logistic_admin'`, not from seller API
- **`proxy.ts:ensureProperRoles`**: preserves `seller` role when adding `logistic_admin`; only filters out `delivery`
- **`revokeAllClerkSessions`**: called *after* `prisma.userProfile.upsert()` to avoid premature logout
- **`getCompanyContext`**: uses truthy check (`vendedorId`) instead of `vendedorId !== undefined` to prevent creating zones/vehicles with empty-string vendor ID
- **Buyer status mapping**: `ready→READY`, `en_camino→IN_DELIVERY`, `entregado→DELIVERED`, `cancelado→CANCELLED`, `revision→IN_REVISION`; `asignado` is not sent to buyer

## Current State
- Database in clean/reset state
- `pnpm tsc --noEmit` passes cleanly
- `pnpm next build` succeeds

## Important File Locations
| File | Purpose |
|------|---------|
| `proxy.ts` | Clerk middleware, role sync + session management |
| `lib/roles.ts` | Role normalization, `syncClerkRoleMetadata`, `resolveRolesFromClaims` |
| `lib/vendors.ts` | Vendor fetching from seller API |
| `lib/logistic-admin/data.ts` | Data aggregation, vendor inference, `UserProfile` upsert |
| `lib/actions/vendors.ts` | Server action for chofer onboarding |
| `lib/actions/logistic-admin.ts` | Server actions for zones, vehicles, orders (status sync to buyer included) |
| `lib/actions/chofer.ts` | Server actions for chofer (order status update + buyer sync) |
| `lib/notify-buyer.ts` | Buyer app sync — maps delivery status to buyer status and makes PATCH call |
| `app/api/ready-orders/route.ts` | Order ingestion from seller app |
| `app/api/admin/deliveries/[id]/status/route.ts` | External admin API for delivery status (also syncs to buyer) |
| `prisma/schema.prisma` | Database schema (Pedido, Chofer, Vehiculo, etc.) |

## API Keys (`.env.local`)
- `VENDORS_API_URL` — seller app vendors endpoint
- `VENDORS_API_KEY` — `vendor-secret-key-2026`
- `DELIVERY_API_KEY` — `delivery-app-secret-key-2026`
- `BUYER_API_URL` — buyer app orders endpoint (`https://proyecto-b-buyer-agua-ya.vercel.app/api/orders/[order_id]`)
- `BUYER_API_KEY` — API key for buyer app authentication

## Known Issues
- **Race condition with seller app**: seller app may still write to `publicMetadata.role` (singular), causing role flickering. Need to migrate seller app to `roles` (plural) too.
- **`proxy.ts` warning**: Next.js infers wrong root due to multiple lockfiles; `outputFileTracingRoot` not set in `next.config.ts`.
- **Database is empty** after reset; first login for any `logistic_admin` triggers upsert + Clerk sync + session revoke.
- **Prisma migration timeout on Vercel**: Neon free tier pauses after inactivity; `prisma migrate deploy` during build times out. Fix: set `PRISMA_MIGRATION_LOCK_TIMEOUT=30000` in Vercel env vars.
- **Env vars on Vercel**: `.env.local` is not deployed; `BUYER_API_URL` and `BUYER_API_KEY` must be configured manually in Vercel dashboard.
