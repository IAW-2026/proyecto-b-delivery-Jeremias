import type { RoleNavigationItem } from "../_components/RoleDashboardShell";

export const logisticAdminNavigationItems: RoleNavigationItem[] = [
  { href: "/dashboard/logistic-admin", label: "Inicio", icon: "📊" },
  { href: "/dashboard/logistic-admin/pedidos", label: "Pedidos", icon: "📦" },
  { href: "/dashboard/logistic-admin/choferes", label: "Choferes", icon: "🧑‍✈️" },
  { href: "/dashboard/logistic-admin/zonas", label: "Zonas", icon: "🗺️" },
  { href: "/dashboard/logistic-admin/vehiculos", label: "Vehículos", icon: "🚛" },
  { href: "/dashboard/logistic-admin/perfil", label: "Perfil", icon: "👤" },
];