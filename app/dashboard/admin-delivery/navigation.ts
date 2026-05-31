import type { RoleNavigationItem } from "../_components/RoleDashboardShell";

export const adminDeliveryNavigationItems: RoleNavigationItem[] = [
  { href: "/dashboard/admin-delivery", label: "Inicio global", icon: "🧭" },
  { href: "/dashboard/admin-delivery/usuarios", label: "Usuarios", icon: "🪪" },
  { href: "/dashboard/admin-delivery/pedidos", label: "Pedidos", icon: "📦" },
  { href: "/dashboard/admin-delivery/choferes", label: "Choferes", icon: "🚚" },
  { href: "/dashboard/admin-delivery/vehiculos", label: "Vehículos", icon: "🛻" },
  { href: "/dashboard/admin-delivery/zonas", label: "Zonas", icon: "🗺️" },
  { href: "/dashboard/admin-delivery/perfil", label: "Perfil", icon: "👤" },
];