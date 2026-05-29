"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";

const navigationItems = [
  { href: "/dashboard/logistic-admin", label: "Inicio", icon: "📊" },
  { href: "/dashboard/logistic-admin/pedidos", label: "Pedidos", icon: "📦" },
  { href: "/dashboard/logistic-admin/choferes", label: "Choferes", icon: "🧑‍✈️" },
  { href: "/dashboard/logistic-admin/zonas", label: "Zonas", icon: "🗺️" },
  { href: "/dashboard/logistic-admin/vehiculos", label: "Vehículos", icon: "🚛" },
  { href: "/dashboard/logistic-admin/perfil", label: "Perfil", icon: "👤" },
];

export default function LogisticAdminLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-[280px] shrink-0 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <UserMenu initialDisplayName={displayName ?? undefined} />
        </div>

        <nav className="p-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive ? "border-l-4 border-blue-600 bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-end bg-white p-4 shadow-sm" />

        <div className="flex-1 p-8">
          <div className="rounded-lg bg-white p-6 shadow-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
