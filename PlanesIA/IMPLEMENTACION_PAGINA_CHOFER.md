# Implementación: Página del Chofer 👨‍🚚

**Fecha:** Mayo 17, 2026  
**Estado:** En Desarrollo  
**Versión:** 1.0

---

## 📋 Resumen

Implementación completa de las páginas del chofer con:
- Dashboard principal del chofer
- Vista de sus pedidos ready
- Vista de su zona asignada
- Vista de su vehículo
- **Datos mockeados** (sin endpoints reales por ahora)

---

## 🎯 Objetivos

✅ Crear páginas funcionales con UI/UX limpia  
✅ Usar datos de ejemplo (mock data)  
✅ Estructura reutilizable para integración futura de APIs  
✅ Layout consistente con sidebar  
✅ Responsive design con Tailwind CSS  

---

## 🗂️ Estructura de Carpetas (Actual vs Nueva)

### Estructura Actual:
```
app/dashboard/
├── choferes/                    ← EXISTENTE
│   ├── page.tsx                 (vacio, será dashboard)
│   ├── layout.tsx               (layout compartido)
│   ├── mi-vehiculo/
│   │   └── page.tsx             (vacio)
│   ├── mis-pedidos/             (no existe)
│   └── mi-zona/                 (no existe)
```

### Estructura Nueva (Post-implementación):
```
app/dashboard/
├── chofer/                      ✨ RENOMBRADO (opcional)
│   ├── layout.tsx               (layout sidebar chofer)
│   ├── page.tsx                 (dashboard principal)
│   ├── mis-pedidos/
│   │   └── page.tsx             ✨ NUEVA - tabla/lista de pedidos
│   ├── mi-zona/
│   │   └── page.tsx             ✨ NUEVA - mapa/info zona
│   └── mi-vehiculo/
│       └── page.tsx             ✨ NUEVA - detalles vehículo
│
├── lib/
│   └── mockData/                ✨ NUEVA CARPETA
│       ├── choferData.ts        (datos mockeados)
│       └── types.ts             (tipos compartidos)
```

---

## 📊 Datos Mockeados (Mock Data)

### Estructura del Chofer:
```typescript
interface ChoferData {
  id: number;
  nombre: string;
  telefono: string;
  estado: string;
}

const choferActual: ChoferData = {
  id: 1,
  nombre: "Juan Pérez",
  telefono: "1234567890",
  estado: "activo"
};
```

### Estructura de Ruta del Día:
```typescript
interface Ruta {
  idRuta: number;
  idChofer: number;
  fecha: Date;
  zona: string;
  estado: string;
}

const rutaDelDia: Ruta = {
  idRuta: 101,
  idChofer: 1,
  fecha: new Date("2026-05-17"),
  zona: "Palihue",
  estado: "activa"
};
```

### Estructura de Pedidos:
```typescript
interface Pedido {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "entregado" | "cancelado";
}

const pedidosDelDia: Pedido[] = [
  {
    idPedido: 5,
    cliente: "Juan García",
    direccion: "Calle 123, Apto 4",
    telefono: "1111111",
    cantBidones: 2,
    zona: "Palihue",
    estado: "ready"
  },
  // ... más pedidos
];
```

### Estructura de Vehículo:
```typescript
interface Vehiculo {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
}

const vehiculoAsignado: Vehiculo = {
  idVehiculo: 1,
  patente: "ABC123",
  tipo: "Furgón",
  capacidadBidones: 50
};
```

---

## 🏗️ Plan de Implementación (Paso a Paso)

### **Paso 1: Crear archivo de Mock Data** 📄
- **Archivo:** `app/lib/mockData/choferData.ts`
- **Contenido:**
  - Constantes con datos del chofer
  - Lista de pedidos mockeados
  - Datos de vehículo
  - Datos de zona/ruta
- **Status:** [ ] No iniciado

### **Paso 2: Crear tipos compartidos** 🔧
- **Archivo:** `app/lib/mockData/types.ts`
- **Contenido:**
  - `interface Pedido`
  - `interface Vehiculo`
  - `interface Ruta`
  - `interface Zona`
- **Status:** [ ] No iniciado

### **Paso 3: Crear Layout del Chofer** 🎨
- **Archivo:** `app/dashboard/chofer/layout.tsx`
- **Contenido:**
  - Sidebar con navegación (Pedidos, Zona, Vehículo)
  - Header con nombre del chofer
  - Layout responsive
  - Breadcrumbs
- **Status:** [ ] No iniciado

### **Paso 4: Dashboard Principal** 📊
- **Archivo:** `app/dashboard/chofer/page.tsx`
- **Contenido:**
  - Cards resumidas (zona, vehículo, pedidos pendientes)
  - Información del día
  - Estadísticas rápidas
  - Botones de acceso rápido
- **Status:** [ ] No iniciado

### **Paso 5: Página Mis Pedidos** 📦
- **Archivo:** `app/dashboard/chofer/mis-pedidos/page.tsx`
- **Contenido:**
  - Tabla/lista con todos los pedidos ready
  - Columnas: Cliente, Dirección, Teléfono, Bidones, Estado
  - Filtros (por estado, zona, etc.)
  - Botón "Marcar como entregado" (solo UI por ahora)
  - Total de bidones a llevar
- **Status:** [ ] No iniciado

### **Paso 6: Página Mi Zona** 🗺️
- **Archivo:** `app/dashboard/chofer/mi-zona/page.tsx`
- **Contenido:**
  - Nombre de la zona asignada
  - Hora inicio/fin de la ruta
  - Descripción/mapa (opcional por ahora)
  - Cantidad de pedidos en la zona
  - Información de la ruta
- **Status:** [ ] No iniciado

### **Paso 7: Página Mi Vehículo** 🚛
- **Archivo:** `app/dashboard/chofer/mi-vehiculo/page.tsx`
- **Contenido:**
  - Patente del vehículo
  - Tipo de vehículo
  - Capacidad total de bidones
  - Bidones disponibles (calc. automático)
  - Estado del vehículo
- **Status:** [ ] No iniciado

---

## 💅 Componentes Reutilizables

Se crearán componentes React para facilitar la reutilización:

```
app/components/
└── chofer/
    ├── PedidoCard.tsx           (tarjeta individual de pedido)
    ├── PedidosTable.tsx         (tabla de pedidos)
    ├── VehiculoInfo.tsx         (info del vehículo)
    ├── ZonaInfo.tsx             (info de la zona)
    ├── StatCard.tsx             (tarjeta de estadística)
    └── ChoferSidebar.tsx        (navegación lateral)
```

---

## 🎨 Estilo Visual

- **Color primario:** `#00AEEF` (azul, según proyecto)
- **Color secundario:** `#575757` (gris oscuro)
- **Fondo:** Blanco/gris claro
- **Tailwind CSS:** Para todos los estilos
- **Responsive:** Mobile, tablet, desktop

---

## 🔄 Flujo de Navegación

```
LOGIN (Clerk)
    ↓
/dashboard/chofer (Dashboard)
    ├─ Mis Pedidos
    ├─ Mi Zona
    └─ Mi Vehículo
```

---

## 📌 Características Implementadas

✅ **Dashboard del Chofer:**
- Resumen del día
- Tarjetas con información rápida
- Links a otras secciones

✅ **Mis Pedidos:**
- Lista/tabla de pedidos ready
- Información: cliente, dirección, bidones
- Total de bidones a llevar
- UI para marcar como entregado (sin funcionalidad)

✅ **Mi Zona:**
- Nombre de la zona asignada
- Horario de la ruta
- Cantidad de pedidos

✅ **Mi Vehículo:**
- Información del vehículo
- Patente, tipo, capacidad
- Disponibilidad de bidones

---

## 📝 Datos de Ejemplo (Mock)

### Chofer:
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "telefono": "1234567890",
  "estado": "activo",
  "idVehiculo": 1
}
```

### Ruta del Día:
```json
{
  "idRuta": 101,
  "idChofer": 1,
  "fecha": "2026-05-17",
  "zona": "Palihue",
  "horaInicio": "08:00",
  "horaFin": "18:00",
  "estado": "activa"
}
```

### Pedidos (5 ejemplos):
```json
[
  {
    "idPedido": 5,
    "cliente": "Juan García",
    "direccion": "Calle 123, Apto 4",
    "telefono": "1111111",
    "cantBidones": 2,
    "zona": "Palihue",
    "estado": "ready"
  },
  {
    "idPedido": 6,
    "cliente": "María López",
    "direccion": "Avenida 456",
    "telefono": "2222222",
    "cantBidones": 3,
    "zona": "Palihue",
    "estado": "ready"
  },
  // ... más
]
```

### Vehículo:
```json
{
  "idVehiculo": 1,
  "patente": "ABC123",
  "tipo": "Furgón",
  "capacidadBidones": 50,
  "idVendedor": 1
}
```

---

## 🔐 Consideraciones de Seguridad

- ⚠️ Datos mockeados (seguridad no aplicable aún)
- Cuando se integren APIs: validar `clerkUserId`
- Cuando se integren APIs: verificar que el chofer solo vea SUS datos

---

## 🚀 Próximos Pasos (Post-implementación)

1. **Crear endpoints API:**
   - `GET /api/chofer/mis-pedidos`
   - `GET /api/chofer/mi-zona`
   - `GET /api/chofer/mi-vehiculo`

2. **Reemplazar mock data con llamadas reales**
3. **Agregar funcionalidad "Marcar como entregado"**
4. **Agregar paginación/filtros avanzados**
5. **Tests E2E de la página del chofer**

---

## ✅ Checklist

- [ ] Crear `app/lib/mockData/types.ts`
- [ ] Crear `app/lib/mockData/choferData.ts`
- [ ] Crear `app/dashboard/chofer/layout.tsx`
- [ ] Crear `app/dashboard/chofer/page.tsx` (dashboard)
- [ ] Crear `app/dashboard/chofer/mis-pedidos/page.tsx`
- [ ] Crear `app/dashboard/chofer/mi-zona/page.tsx`
- [ ] Actualizar `app/dashboard/chofer/mi-vehiculo/page.tsx`
- [ ] Crear componentes reutilizables (opcional)
- [ ] Verificar responsive design
- [ ] Testing manual

---

## 📞 Notas

- Se usa mock data para simular los endpoints
- La estructura es preparada para integrar APIs después
- Tailwind CSS + Clerk ya están configurados en el proyecto
- Se recomienda test manual en móvil/tablet

---

**Versión:** 1.0 | **Último update:** 17 de Mayo, 2026
