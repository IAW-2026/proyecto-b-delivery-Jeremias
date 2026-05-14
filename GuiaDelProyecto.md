# 📦 Guía Completa del Proyecto - Aplicación de Entregas

¡Bienvenido al proyecto! Esta guía te ayudará a entender la estructura, archivos y carpetas del proyecto. Si es tu primera vez, lee esto para orientarte.

---

## 🏗️ Estructura General del Proyecto

```
proyecto-b-delivery-Jeremias/
├── app/                          # Código principal de la aplicación Next.js
├── lib/                           # Funciones y utilidades reutilizables
├── prisma/                        # Configuración de la base de datos
├── public/                        # Archivos estáticos (imágenes, iconos, etc)
├── node_modules/                  # Dependencias instaladas (NO editar)
├── package.json                   # Dependencias y scripts del proyecto
├── next.config.ts                 # Configuración de Next.js
├── tsconfig.json                  # Configuración de TypeScript
├── eslint.config.mjs              # Configuración de linter (validador de código)
├── tailwind.config.js             # Configuración de estilos CSS
├── postcss.config.mjs             # Configuración de procesamiento CSS
├── pnpm-workspace.yaml            # Configuración del gestor de paquetes
└── README-PROYECTO.md             # Este archivo
```

---

## 📂 Descripción de Carpetas y Archivos

### 📁 **app/** - Núcleo de la Aplicación

Esta carpeta contiene toda la lógica y páginas de la aplicación. Usa la estructura App Router de Next.js 16.

#### **app/layout.tsx**
- **Qué es:** Plantilla base que envuelve todas las páginas
- **Contiene:** Configuración de fuentes, estilos globales, autenticación con Clerk
- **Importante:** Define `<html>`, `<head>` y el proveedor de Clerk para toda la app

#### **app/page.tsx**
- **Qué es:** Página de inicio (home)
- **Función:** Verifica si el usuario está autenticado
  - Si NO está autenticado → redirecciona a `/signin`
  - Si ESTÁ autenticado → redirecciona a `/dashboard`

#### **app/globals.css**
- **Qué es:** Estilos globales de toda la aplicación
- **Contiene:** Variables CSS, estilos base, configuración de Tailwind CSS

#### **app/api/** - Rutas API del Servidor

Aquí están los endpoints que la aplicación usa para obtener/enviar datos.

##### **app/api/user-role/route.ts**
- **Qué hace:** Obtiene el rol del usuario autenticado
- **Endpoint:** `/api/user-role`
- **Usa:** Header `X-User-ID` para identificar al usuario
- **Retorna:** Rol del usuario (admin_delivery, chofer, vendedor, etc)

##### **app/api/vendors/route.ts**
- **Qué hace:** Obtiene datos de los vendedores/proveedores
- **Endpoint:** `/api/vendors`
- **Retorna:** Lista de vendedores registrados en el sistema

#### **app/dashboard/** - Panel Principal del Usuario

Páginas que ve el usuario después de autenticarse.

##### **app/dashboard/layout.tsx**
- **Qué es:** Plantilla específica del dashboard
- **Contiene:** Estructura de navegación, barra superior, menú lateral
- **Aplica a:** Todas las páginas dentro de `/dashboard`

##### **app/dashboard/page.tsx**
- **Qué es:** Página principal del dashboard
- **Contiene:**
  - Barra superior con información del usuario
  - Menú de usuario (UserMenuClient)
  - Lógica para mostrar contenido diferente según el rol:
    - Admin delivery
    - Chofer (conductor)
    - Vendedor

##### **app/dashboard/user-menu.tsx**
- **Qué es:** Componente del menú de usuario
- **Función:** Mostrar opciones de perfil, configuración, cerrar sesión
- **Tipo:** Cliente (usa `'use client'` para interactividad)

##### **app/dashboard/choferes/page.tsx**
- **Qué es:** Página para gestionar choferes/conductores
- **Función:** Lista de choferes, crear, editar, eliminar
- **Acceso:** Probablemente solo para admin_delivery

##### **app/dashboard/perfil/page.tsx**
- **Qué es:** Página del perfil del usuario
- **Función:** Ver y editar información personal
- **Datos:** Nombre, email, teléfono, rol, etc.

##### **app/dashboard/rutas/page.tsx**
- **Qué es:** Página para gestionar rutas de entrega
- **Función:** Crear, editar, ver rutas
- **Contiene:** Información de entregas, paradas, choferes asignados

#### **app/protected/page.tsx**
- **Qué es:** Página protegida (solo usuarios autenticados)
- **Función:** Sirve como ejemplo de página privada

#### **app/signin/[[...rest]]/page.tsx**
- **Qué es:** Página de inicio de sesión
- **Contiene:** Formulario de login
- **Usa:** Clerk para autenticación

#### **app/generated/prisma/** - Código Generado Automáticamente

**⚠️ NO EDITAR - Se regenera automáticamente**

Contiene tipos e interfaces generadas a partir del schema de Prisma.

##### **app/generated/prisma/client.ts**
- Cliente de Prisma para consultas a base de datos

##### **app/generated/prisma/enums.ts**
- Enumeraciones (valores fijos)
- Ej: roles (admin, chofer, vendedor)

##### **app/generated/prisma/models.ts**
- Tipos de datos para: Vehiculo, Chofer, Ruta, UserRole, AdminDelivery

---

### 📁 **lib/** - Funciones y Utilidades

Archivos reutilizables en toda la aplicación.

#### **lib/prisma.ts**
- **Qué es:** Instancia de cliente de Prisma
- **Función:** Conectar la aplicación a la base de datos PostgreSQL
- **Uso:** Importar en archivos que necesiten consultar la BD
  ```typescript
  import prisma from "@/lib/prisma";
  const users = await prisma.userRole.findMany();
  ```

#### **lib/vendors.ts**
- **Qué es:** Funciones para gestionar vendedores
- **Función:** Obtener, crear, actualizar vendedores
- **Exporta:** Funciones de utilidad

---

### 📁 **prisma/** - Configuración de Base de Datos

#### **prisma/schema.prisma**
- **Qué es:** Esquema de la base de datos
- **Define:** Tablas y relaciones de datos
- **Modelos principales:**

##### **Vehiculo**
```
- idVehiculo (ID único)
- patente (matrícula)
- tipo (camión, van, etc)
- capacidadBidones (tanques que puede llevar)
- idVendedor (a qué vendedor pertenece)
- Relación: Un vehículo puede tener muchos choferes
```

##### **Chofer**
```
- idChofer (ID único)
- nombre (nombre del conductor)
- teléfono (contacto)
- estado (activo, inactivo, etc)
- idVehiculo (a qué vehículo está asignado)
- Relación: Muchos choferes pueden tener muchas rutas
```

##### **Ruta**
- Información de rutas de entrega

##### **RutaPedido**
- Asociación de pedidos con rutas

##### **UserRole**
```
- id (ID único)
- clerkUserId (ID del usuario en Clerk)
- role (admin_delivery, chofer, vendedor)
- idVendedor (a qué vendedor está vinculado)
```

##### **AdminDelivery**
```
- idAdmin (ID único)
- clerkUserId (ID del usuario en Clerk)
- nombre (nombre del admin)
```

---

### 📁 **public/** - Archivos Estáticos

Aquí van:
- 🖼️ Imágenes
- 🎨 Iconos
- 📄 PDFs
- Otros archivos que se sirven sin procesar

---

## 🔧 Archivos de Configuración

### **package.json**
- **Qué es:** Archivo de configuración del proyecto
- **Contiene:**
  - Nombre: `delivery-app`
  - Versión: `0.1.0`
  - Scripts disponibles (ver más abajo)
  - Dependencias principales:
    - `next` - Framework web
    - `react` - Librería de UI
    - `@prisma/client` - Cliente de base de datos
    - `@clerk/nextjs` - Autenticación
    - `tailwindcss` - Estilos CSS
    - `typescript` - Lenguaje tipado

### **next.config.ts**
- **Qué es:** Configuración de Next.js
- **Contiene:** Configuración de Turbopack (compilador rápido)

### **tsconfig.json**
- **Qué es:** Configuración de TypeScript
- **Función:** Define cómo TypeScript compila el código
- **Importante:** Alias de importación (`@/` = carpeta raíz)

### **eslint.config.mjs**
- **Qué es:** Reglas para validar calidad del código
- **Función:** Detectar errores antes de ejecutar

### **tailwind.config.js** / **postcss.config.mjs**
- **Qué son:** Configuración de estilos CSS
- **PostCSS:** Procesa y optimiza CSS
- **Tailwind:** Framework de utilidades CSS

### **pnpm-workspace.yaml**
- **Qué es:** Configuración del gestor de paquetes
- **Función:** Gestiona múltiples proyectos si es necesario

---

## 🚀 Scripts Disponibles

En la terminal, puedes ejecutar:

```bash
# Desarrollo - Inicia servidor local en http://localhost:3000
pnpm run dev

# Build - Compila para producción
pnpm run build

# Producción - Inicia servidor compilado
pnpm start

# Linter - Valida código (busca errores)
pnpm run lint
```

---

## 🗄️ Base de Datos

### Tipo: PostgreSQL
### ORM: Prisma

### Modelos Principales:

| Tabla | Descripción |
|-------|-----------|
| **vehiculo** | Vehículos de entrega (camiones, vans) |
| **chofer** | Conductores/operarios de entregas |
| **ruta** | Rutas de entrega programadas |
| **ruta_pedido** | Asociación de pedidos en rutas |
| **user_role** | Roles de usuarios (admin, chofer, vendedor) |
| **admin_delivery** | Administradores del sistema |

---

## 🔐 Autenticación

### Sistema: Clerk

- Plataforma moderna para autenticación
- Gestiona login, registro, 2FA
- Los datos del usuario se guardan en tabla `user_role` y `admin_delivery`
- El `clerkUserId` vincula usuarios de Clerk con datos locales

---

## 🎨 Estilos

### Framework: Tailwind CSS

- Utilidades CSS predefinidas
- Ejemplo: `bg-blue-500`, `text-white`, `p-4`
- Configurable en `tailwind.config.js`

---

## 📊 Tecnologías Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **Next.js** | 16.2.6 | Framework web principal |
| **React** | 19.2.4 | Librería de UI |
| **TypeScript** | ^5 | Lenguaje tipado |
| **Prisma** | ^7.8.0 | ORM para base de datos |
| **Clerk** | ^7.3.2 | Autenticación |
| **Tailwind CSS** | ^4 | Estilos |
| **PostgreSQL** | - | Base de datos |

---

## 🔄 Flujo de la Aplicación

```
1. Usuario entra a http://localhost:3000
   ↓
2. app/page.tsx verifica autenticación
   ├─ NO autenticado → Redirecciona a /signin
   └─ Autenticado → Redirecciona a /dashboard
   ↓
3. En dashboard:
   ├─ Obtiene rol del usuario vía /api/user-role
   ├─ Muestra contenido según rol:
   │  ├─ admin_delivery → Ver choferes, vehículos, rutas
   │  ├─ chofer → Ver su ruta asignada
   │  └─ vendedor → Ver sus entregas
   ↓
4. Usuario puede:
   ├─ Ver perfil
   ├─ Gestionar choferes (si es admin)
   ├─ Gestionar rutas (si es admin)
   └─ Cerrar sesión
```

---

## 💡 Primeros Pasos

### 1️⃣ Entender la estructura
- Lee esta guía
- Abre los archivos en `app/` para ver la estructura

### 2️⃣ Ver la base de datos
- Abre `prisma/schema.prisma`
- Lee los modelos disponibles

### 3️⃣ Ejecutar el proyecto
```bash
pnpm install      # Si no lo hiciste
pnpm run dev      # Inicia servidor
```

### 4️⃣ Navegar el código
- `app/page.tsx` → Punto de entrada
- `app/dashboard/page.tsx` → Página principal del usuario
- `lib/prisma.ts` → Conexión BD

---

## 🆘 Dudas Comunes

### ¿Qué es `@/`?
Alias para la carpeta raíz del proyecto. Ejemplo:
```typescript
import prisma from "@/lib/prisma";
// Es lo mismo que:
import prisma from "../../../lib/prisma";
```

### ¿Dónde agrego nuevas páginas?
En la carpeta `app/`. Cada carpeta/archivo `.tsx` es una ruta.
```
app/dashboard/nuevapagina/page.tsx → http://localhost:3000/dashboard/nuevapagina
```

### ¿Cómo consulto la base de datos?
```typescript
import prisma from "@/lib/prisma";

const choferes = await prisma.chofer.findMany();
```

### ¿Cómo obtengo el usuario actual?
```typescript
import { currentUser } from "@clerk/nextjs/server";

const user = await currentUser();
console.log(user.id); // clerkUserId
```

---

## 📝 Notas Importantes

- ✅ Edita archivos en `app/`, `lib/`, `prisma/schema.prisma`
- ❌ NO edites `app/generated/` (se regenera automáticamente)
- ❌ NO edites `node_modules/` (dependencias)
- ✅ Para cambios en BD: modifica `prisma/schema.prisma` y ejecuta `prisma db push`
- ✅ Usa `pnpm` en lugar de `npm` (más rápido)

---

## 📚 Recursos Útiles

- [Documentación Next.js](https://nextjs.org/docs)
- [Documentación Prisma](https://www.prisma.io/docs/)
- [Documentación Clerk](https://clerk.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**¡Listo! Ahora ya conoces la estructura del proyecto. ¡A programar! 🚀**
