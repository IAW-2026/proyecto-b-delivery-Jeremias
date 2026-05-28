"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";

const navigationItems = [
  {
    href: "/dashboard/logistic-admin",
    label: "Inicio",
    icon: "📊",
  },
  {
    href: "/dashboard/logistic-admin/pedidos",
    label: "Pedidos",
    icon: "📦",
  },
  {
    href: "/dashboard/logistic-admin/choferes",
    label: "Choferes",
    icon: "🧑‍✈️",
  },
  {
    href: "/dashboard/logistic-admin/zonas",
    label: "Zonas",
    icon: "🗺️",
  },
  {
    href: "/dashboard/logistic-admin/vehiculos",
    label: "Vehículos",
    icon: "🚛",
  },
];

export default function LogisticAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-[280px] shrink-0 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <UserMenu />
        </div>

        <nav className="p-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
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

      <main className="flex-1 flex flex-col">
        <div className="bg-white shadow-sm p-4 flex justify-end items-center" />

        <div className="p-8 flex-1">
          <div className="bg-white rounded-lg shadow-sm p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
