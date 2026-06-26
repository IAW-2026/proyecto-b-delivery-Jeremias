import type { RoleNavigationItem } from "@/components/role-dashboard-shell";

export const choferNavigationItems: RoleNavigationItem[] = [
  { href: "/dashboard/chofer", label: "Inicio", icon: "📊" },
  { href: "/dashboard/chofer/mis-pedidos", label: "Pedidos", icon: "📦" },
  { href: "/dashboard/chofer/mi-zona", label: "Zona", icon: "🗺️" },
  { href: "/dashboard/chofer/mi-vehiculo", label: "Vehículo", icon: "🚛" },
  { href: "/dashboard/chofer/perfil", label: "Perfil", icon: "👤" },
];
