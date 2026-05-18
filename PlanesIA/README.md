# Plan de Implementación: Sistema de Entregas 🚚

**Fecha:** Mayo 17, 2026  
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Implementación de un sistema de gestión de entregas con **tres roles principales**:

| Rol | Funcionalidades | Acceso |
|-----|-----------------|--------|
| **Seller** | Crea pedido (enviando POST a /api/pedidos) cuando el buyer paga | Externo |
| **Admin Logística** | Revisa pedidos ready, asigna a rutas/choferes, CRUD | Control total |
| **Chofer** | Ver pedidos asignados hoy, zona, vehículo | Solo lectura |

---

## 🗂️ Estructura de Datos Actual vs. Nueva

### Cambios en Prisma Schema

**AGREGAR** el modelo `Zona`:
```prisma
model Zona {
  idZona      Int      @id @default(autoincrement())
  nombre      String   @unique  // "Palihue", "12 de Octubre", etc.
  rutas       Ruta[]

  @@map("zona")
}
```

**AGREGAR** el modelo `Pedido`:
```prisma
model Pedido {
  idPedido    Int      @id @default(autoincrement())
  estado      String   @default("pendiente")  // "pendiente", "ready", "entregado"
  direccion   String
  cliente     String
  telefono    String?
  cantBidones Int
  zona        String   // nombre del barrio
  rutaPedidos RutaPedido[]

  @@map("pedido")
}
```

**ACTUALIZAR** el modelo `Ruta` (agregar FK a Zona):
```prisma
model Ruta {
  idRuta      Int            @id @default(autoincrement()) @map("id_ruta")
  idChofer    Int            @map("id_chofer")
  idVendedor  Int            @map("id_vendedor")
  idZona      Int            @map("id_zona")  // NUEVA
  fecha       DateTime
  horaInicio  DateTime?      @map("hora_inicio")
  horaFin     DateTime?      @map("hora_fin")
  estado      String         @default("pendiente")
  chofer      Chofer         @relation(fields: [idChofer], references: [idChofer])
  zona        Zona           @relation(fields: [idZona], references: [idZona])  // NUEVA
  rutaPedidos RutaPedido[]

  @@map("ruta")
}
```

**ACTUALIZAR** el modelo `RutaPedido` (agregar FK a Pedido):
```prisma
model RutaPedido {
  idRuta   Int  @map("id_ruta")
  idPedido Int  @map("id_pedido")  // NUEVA
  ruta     Ruta @relation(fields: [idRuta], references: [idRuta])
  pedido   Pedido @relation(fields: [idPedido], references: [idPedido])  // NUEVA

  @@id([idRuta, idPedido])
  @@map("ruta_pedido")
}
```

---

## 🏗️ Plan de Implementación (5 Fases)

### **Fase 1: Base de Datos** ⚙️
- Archivo: `prisma/schema.prisma`
- Tareas:
  - [ ] Agregar modelo `Zona`
  - [ ] Agregar modelo `Pedido`
  - [ ] Actualizar `Ruta` con FK a `Zona`
  - [ ] Actualizar `RutaPedido` con FK a `Pedido`
  - [ ] Ejecutar `pnpm prisma migrate dev`
  - [ ] Regenerar cliente Prisma

### **Fase 2: Endpoint para Recibir Pedidos del Seller** 📥
- Directorio: `app/api/`
- Archivos a crear:
  - [ ] `app/api/pedidos/route.ts` — POST crear pedido (desde seller cuando paga)

**Endpoint:**
```
POST /api/pedidos
{
  "cliente": "Juan Pérez",
  "direccion": "Calle 123, Apto 4",
  "telefono": "1234567890",
  "cantBidones": 2,
  "zona": "Palihue",
  "estado": "ready"  // El seller envía ready (ya fue pagado)
}
→ { idPedido: 5, success: true }
```

**Responsabilidades:**
- Recibir pedido del seller (POST)
- Validar datos (cliente, dirección, zona, bidones)
- Insertar en tabla `Pedido` con estado "ready"
- Responder con ID del pedido creado

### **Fase 3: APIs del Admin Logística** (Gestión) 🔧
- Directorio: `app/api/admin-logistica/`
- Archivos a crear:
  - [ ] `app/api/admin-logistica/pedidos/route.ts` — GET, PUT (listar y actualizar estado)
  - [ ] `app/api/admin-logistica/rutas/route.ts` — GET, POST (listar y crear/asignar rutas)

**Endpoints:**
```
GET    /api/admin-logistica/pedidos              → { pedidos: [...] }  // Todos los pedidos ready sin asignar
PUT    /api/admin-logistica/pedidos/[id]        → actualizar estado (ready → entregado)

GET    /api/admin-logistica/rutas               → { rutas: [...] }  // Todas las rutas activas
POST   /api/admin-logistica/rutas               → crear ruta + asignar pedidos
  {
    "idChofer": 1,
    "idZona": 1,
    "fecha": "2026-05-17",
    "pedidos": [5, 6, 7]  // IDs de pedidos a asignar
  }
```

**Responsabilidades:**
- Listar pedidos ready que no han sido asignados
- Crear rutas y asignar pedidos a través de RutaPedido
- Cambiar estado de pedidos (ready → entregado)
- Ver todas las rutas activas del día

### **Fase 4: APIs del Chofer** (Solo lectura) 🔒
- Directorio: `app/api/chofer/`
- Archivos a crear:
  - [ ] `app/api/chofer/mis-pedidos/route.ts` — GET pedidos asignados de su ruta hoy
  - [ ] `app/api/chofer/mi-zona/route.ts` — GET zona de su ruta hoy
  - [ ] `app/api/chofer/mi-vehiculo/route.ts` — GET vehículo asignado

**Endpoints:**
```
GET /api/chofer/mis-pedidos       → { pedidos: [...] }  // Pedidos de su ruta + zona
GET /api/chofer/mi-zona           → { zona: "Palihue" }
GET /api/chofer/mi-vehiculo       → { vehiculo: { patente, tipo, capacidad } }
```

**Responsabilidades:**
- Obtener ruta del chofer autenticado (hoy)
- Retornar todos los pedidos asociados a esa ruta
- Retornar la zona y vehículo de la ruta

### **Fase 5: UI del Chofer** 👨‍🚚 (Solo lectura)
- Directorio: `app/dashboard/chofer/`
- Archivos a crear:
  - [ ] `app/dashboard/chofer/layout.tsx` — Layout base del chofer
  - [ ] `app/dashboard/chofer/page.tsx` — Dashboard principal
  - [ ] `app/dashboard/chofer/mis-pedidos/page.tsx` — Listar pedidos ready
  - [ ] `app/dashboard/chofer/mi-zona/page.tsx` — Ver zona asignada
  - [ ] `app/dashboard/chofer/mi-vehiculo/page.tsx` — Ver vehículo

**Vista que vería el chofer:**
```
┌─────────────────────────────────────┐
│  Mi Zona: Palihue    │  Mi Vehículo  │
│  Capacidad: 50 bid.  │  Patente: XX  │
└─────────────────────────────────────┘
│
│ PEDIDOS PARA ENTREGAR HOY (5)
├─ [Ready] Juan Pérez - Dirección 1 - 2 bid.
├─ [Ready] María López - Dirección 2 - 3 bid.
├─ [Ready] Carlos Ruiz - Dirección 3 - 1 bid.
└─ ...
```

### **Fase 6: UI del Admin Logística** 🔐 (Gestión)
- Directorio: `app/dashboard/admin-logistica/`
- Archivos a crear:
  - [ ] `app/dashboard/admin-logistica/layout.tsx` — Layout base del admin
  - [ ] `app/dashboard/admin-logistica/page.tsx` — Dashboard principal
  - [ ] `app/dashboard/admin-logistica/pedidos/page.tsx` — Listar con CRUD
  - [ ] `app/dashboard/admin-logistica/pedidos/crear/page.tsx` — Formulario crear
  - [ ] `app/dashboard/admin-logistica/pedidos/[id]/page.tsx` — Editar
  - [ ] `app/dashboard/admin-logistica/rutas/page.tsx` — Gestionar rutas

**Funcionalidades:**
- Ver todos los pedidos ready sin asignar
- Crear ruta y asignar múltiples pedidos a ella
- Cambiar estado de pedido (ready → entregado)
- Eliminar/cancelar pedido
- Asignar zona a chofer por día (crear ruta)
- Ver todas las rutas activas

---

## 📁 Estructura de Carpetas (Post-implementación)

```
proyecto-b-delivery-Jeremias/
├── prisma/
│   └── schema.prisma           ✏️ MODIFICADO
│
├── app/
│   ├── api/
│   │   ├── chofer/                   ✨ NUEVA CARPETA
│   │   │   ├── mis-pedidos/route.ts
│   │   │   ├── mi-zona/route.ts
│   │   │   └── mi-vehiculo/route.ts
│   │   └── admin-logistica/          ✨ NUEVA CARPETA
│   │       ├── pedidos/route.ts
│   │       └── rutas/route.ts
│   │
│   └── dashboard/
│       ├── layout.tsx                ✏️ MODIFICADO (sidebar condicional)
│       ├── chofer/                   ✨ NUEVA CARPETA
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── mis-pedidos/page.tsx
│       │   ├── mi-zona/page.tsx
│       │   └── mi-vehiculo/page.tsx
│       └── admin-logistica/          ✨ NUEVA CARPETA
│           ├── layout.tsx
│           ├── page.tsx
│           ├── pedidos/
│           │   ├── page.tsx
│           │   ├── crear/page.tsx
│           │   └── [id]/page.tsx
│           └── rutas/page.tsx
│
└── PlanesIA/
    └── README.md                     ✏️ ESTE ARCHIVO
```

---

## 🔄 Flujo de Trabajo Completo

```
┌─────────────┐
│   BUYER     │
│  (Comprador)│
└──────┬──────┘
       │ Compra + Paga
       ↓
┌─────────────┐
│   SELLER    │
│  (Vendedor) │ Marca pedido como pagado
│             │ → Estado: "ready"
└──────┬──────┘
       │ POST /api/pedidos
       ↓
┌─────────────────────────┐
│  TABLA PEDIDO (DELIVERY)│
│  id, cliente, dir,      │
│  zona, bidones, ready   │
└──────┬──────────────────┘
       │
       ↓
┌────────────────────────────┐
│  ADMIN LOGÍSTICA           │
│  - Ve pedidos ready        │
│  - Asigna a chofer/ruta    │
│  - Crea RutaPedido         │
└──────┬─────────────────────┘
       │
       ↓
┌────────────────────────────┐
│  CHOFER                    │
│  GET /api/chofer/pedidos   │
│  - Ve sus pedidos del día  │
│  - Ve su zona + vehículo   │
└────────────────────────────┘
```

### Detalles por Rol:

**Seller:** Envía POST a `/api/pedidos` cuando el buyer paga
```json
{
  "cliente": "Juan Pérez",
  "direccion": "Calle 123",
  "telefono": "1234567",
  "cantBidones": 2,
  "zona": "Palihue",
  "estado": "ready"
}
```

**Admin Logística:**
1. Accede a `/dashboard/admin-logistica`
2. Ve todos los pedidos ready sin asignar
3. Crea ruta para chofer (especificando fecha, zona, chofer)
4. Asigna múltiples pedidos a esa ruta
5. Los pedidos se vinculan a través de `RutaPedido`

**Chofer:**
1. Se autentica con Clerk
2. Accede a `/dashboard/chofer`
3. Llama a `/api/chofer/mis-pedidos` → obtiene su ruta del día
4. Ve todos los pedidos de su ruta
5. Ve su zona asignada y vehículo disponible

---

## 🛠️ Tecnologías & Herramientas

- **Auth:** Clerk (ya integrado)
- **BD:** PostgreSQL + Prisma ORM
- **Frontend:** Next.js 15+ (app router)
- **Validación:** Zod (opcional pero recomendado)
- **Estilos:** Tailwind CSS (ya integrado)

---

## ✅ Checklist de Implementación

- [ ] **Fase 1:** Schema de BD actualizado + migraciones ejecutadas
- [ ] **Fase 2:** Endpoint POST /api/pedidos funcional (desde seller)
- [ ] **Fase 3:** APIs del admin logística funcionales (GET, POST rutas)
- [ ] **Fase 4:** APIs del chofer funcionales (GET pedidos, zona, vehículo)
- [ ] **Fase 5:** UI del chofer completada
- [ ] **Fase 6:** UI del admin logística completada
- [ ] Roles protegidos (middleware para validar rol)
- [ ] Autenticación del seller en POST /api/pedidos (si aplica)
- [ ] Tests básicos de APIs
- [ ] Testing manual end-to-end

---

## 📝 Decisiones & Suposiciones

✅ **Flujo de pedidos:** Buyer → Seller (marca ready) → POST /api/pedidos → Tabla Pedido
✅ **Seller envía POST** cuando el buyer paga (pedido estado: "ready")
✅ **Zona** es un string (nombre: "Palihue", "12 de Octubre")
✅ **Admin asigna zona por día** creando Rutas y vinculando Pedidos
✅ **Pedido tiene 3 estados:** "ready" (listo para entregar), "entregado", "cancelado" (opcional)
✅ **RutaPedido** conecta explícitamente Ruta ↔ Pedido
✅ **Chofer solo puede ver** sus pedidos asignados, no modificar ni crear
✅ **Admin puede crear rutas** y asignar múltiples pedidos a ellas
✅ **POST /api/pedidos** es el único endpoint que usa el seller (externo)

---

## 🔐 Consideraciones de Seguridad

- [x] Usar middleware para validar que el usuario sea Chofer o Admin
- [x] APIs deben verificar `clerkUserId` y rol antes de retornar datos
- [x] Admin solo ve/modifica pedidos de su empresa (`idVendedor`)
- [x] Chofer solo ve sus propios pedidos/zona/vehículo

---

## 📞 Preguntas Pendientes / A Definir

- ¿El seller necesita autenticación en POST /api/pedidos o es público?
- ¿El chofer puede marcar pedidos como "entregado" desde la app?
- ¿Se necesita historial de entregas? ¿En qué tabla?
- ¿Qué pasa si un pedido no se entrega en el día? ¿Crear nueva ruta para mañana?
- ¿El admin puede eliminar pedidos ya asignados o solo cambiar estado?

---

**Versión:** 1.0 | **Último update:** 17 de Mayo, 2026
