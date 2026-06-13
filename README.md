# Delivery App — Proyecto IAW 2026

## Link al deploy de producción

[proyecto-b-delivery-jeremias.vercel.app](https://proyecto-b-delivery-jeremias.vercel.app)

## Usuarios disponibles para pruebas

| Rol | Email | Contraseña |
|-----|-------|-----------|
| `admin_delivery` | admin_delivery+clerk_test@iaw.com | iawuser# |
| `logistic_admin` | logistic_admin+clerk_test@iaw.com | iawuser# |
| `logistic_admin` | logistic_admin2+clerk_test@iaw.com | iawuser# |
| `delivery` | delivery+clerk_test@iaw.com | iawuser# |
| `delivery` | delivery2+clerk_test@iaw.com | iawuser# |
| `delivery` | delivery3+clerk_test@iaw.com | iawuser# |
| `delivery` | delivery4+clerk_test@iaw.com | iawuser# |
| `delivery` | delivery5+clerk_test@iaw.com | iawuser# |

## Instrucciones para utilizar/evaluar la aplicación

### Requisitos

- Node.js 20+
- pnpm 11+
- PostgreSQL (o la base configurada en el entorno)

### Configuración local

1. Clonar el repositorio y pararse en la raíz.
2. Copiar `.env.example` a `.env.local` y completar las variables de entorno:
   - `DATABASE_URL` — conexión a PostgreSQL
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` — credenciales de Clerk
3. Instalar dependencias:
   ```bash
   pnpm install
   ```
4. Ejecutar migraciones de Prisma y sembrar datos(Ya fueron hechos las siembras, si se quiere probar borrar los pedidos de la BD e intentar):
   ```bash
   pnpm prisma db push
   pnpm seed
   ```
5. Iniciar el servidor de desarrollo:
   ```bash
   pnpm dev
   ```
6. Abrir [http://localhost:3000](http://localhost:3000). El login se realiza con Google a través de Clerk.

### Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `delivery` | Chofer/repartidor. Ve pedidos asignados, su zona y su vehículo. |
| `logistic_admin` | Admin logístico de una empresa. Gestiona pedidos, choferes, vehículos y zonas. |
| `admin_delivery` | Admin global. Ve datos de todas las empresas, gestiona usuarios y roles. |

### Flujo de navegación

- Sin sesión → `/signin` 
- `delivery` → `/dashboard/chofer` (onboarding si es primera vez)
- `logistic_admin` → `/dashboard/logistic-admin`
- `admin_delivery` → `/dashboard/admin-delivery`
- Usuario bloqueado → `/blocked`

---

## Descripción del proyecto

**Delivery App** es un sistema de gestión de entregas a domicilio pensado para empresas que tercerizan su logística de reparto. La aplicación permite administrar pedidos, choferes, vehículos y zonas de cobertura desde paneles adaptados al perfil de cada usuario, con un enfoque en la simplicidad operativa y el control en tiempo real.

El sistema utiliza **Clerk** como proveedor de autenticación y gestiona los roles —chofer, administrador logístico y administrador global— tanto en Clerk como en una tabla local (`UserProfile`). Los roles determinan qué secciones del dashboard puede ver cada usuario. Los administradores globales tienen vista de todas las empresas, mientras que los administradores logísticos solo operan sobre los datos de su empresa.

La aplicación está construida con **Next.js 15** (App Router), **Prisma** como ORM sobre **PostgreSQL** y **Tailwind CSS** para el diseño. Incluye funcionalidades como reasignación de pedidos, actualización de estados en tiempo real (WebSocket simulado), y un sistema de solicitudes de registro para nuevos choferes con flujo de aprobación/rechazo.

---

## Notas y comentarios para la corrección

### Decisiones de diseño

- **UserProfile como tabla unificada**: Se migró desde tres tablas separadas (`UserRole`, `LogisticAdmin`, `AdminDelivery`) a una sola tabla `UserProfile`, eliminando redundancia y simplificando las consultas.
- **Nombres desde la base de datos**: Los nombres de usuario se almacenan y leen exclusivamente desde `UserProfile`, no desde Clerk. Clerk solo se usa para autenticación y roles.
- **Contexto de empresa (`idVendedor`)**: Cada pedido, chofer y vehículo está asociado a un `idVendedor`. El admin global (`admin_delivery`) ve todos los registros con una columna "Empresa" que resuelve el nombre desde `UserProfile`. Al asignar un chofer a un pedido, se filtran solo los choferes de la misma empresa.
- **Sidebar responsiva**: En mobile, la sidebar se oculta y se abre mediante un botón hamburguesa con overlay, para no sacrificar espacio de contenido.
- **Heartbeat de sesión**: Un polling cada 30 segundos verifica si el usuario fue bloqueado. Si recibe `403`, redirige a `/blocked` sin necesidad de refrescar manualmente.

### Funcionalidades destacadas

- **Asignación automática por zona**: El sistema asigna automáticamente pedidos listos al chofer activo de la misma zona (primero que llegó, se queda con la zona).
- **Edición en línea**: En las tablas de pedidos, choferes y vehículos se puede editar cada registro sin salir de la página (cambios in-place con selectores y confirmación).
- **Motivo de pausa de vehículos**: Al pausar un vehículo se solicita un motivo obligatorio que queda registrado y visible en un modal.
- **Solicitudes de chofer**: Los nuevos choferes pueden solicitar registro desde la app. El admin logístico recibe las solicitudes y las aprueba o rechaza, lo que crea automáticamente el perfil local y asigna el rol en Clerk.

### Limitaciones conocidas

- **Pedidos desde base de datos**: Los pedidos se almacenan y consultan directamente desde PostgreSQL. Pueden cargarse manualmente o mediante el endpoint `POST /api/ready-orders` diseñado para integración con sistemas externos de pedidos.
- **Sin caché de lectura de Clerk**: Algunas operaciones administrativas consultan la API de Clerk directamente, lo que puede generar latencia si Clerk no responde.
- **La edición de roles de usuario** requiere seleccionar empresa y rol en un mismo paso. El campo empresa se muestra siempre; si se selecciona un rol que no requiere empresa (como `logistic_admin`), el valor se almacena pero no afecta el comportamiento del usuario.

### Estructura del proyecto

```
app/
├── dashboard/
│   ├── admin-delivery/     # Panel del admin global
│   ├── chofer/             # Panel del chofer/repartidor
│   └── logistic-admin/     # Panel del admin logístico
├── signin/                 # Página de login
├── blocked/                # Página de usuario bloqueado
lib/
├── actions/                # Server actions (CRUD)
├── mocks/                  # Datos mock (archivados)
├── roles.ts                # Definición y resolución de roles
├── logisticAdminStore.ts   # Store en memoria para pedidos
├── adminDeliveryUsers.ts   # Data layer para admin global
├── choferStatus.ts         # Estado y pedidos del chofer
└── shared/utils.ts         # Utilidades compartidas
proxy.ts                    # Middleware de Clerk + roles
prisma/schema.prisma        # Modelo de datos
```
