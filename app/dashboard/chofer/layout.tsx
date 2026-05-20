"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "@/app/components/UserMenu";

export default function ChoferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [canOperate, setCanOperate] = useState(false);

  const navigationItems = [
    {
      href: "/dashboard/chofer",
      label: "Inicio",
      icon: "📊",
    },
    {
      href: "/dashboard/chofer/mis-pedidos",
      label: "Pedidos",
      icon: "📦",
      requiresVerification: true,
    },
    {
      href: "/dashboard/chofer/mi-zona",
      label: "Zona",
      icon: "🗺️",
      requiresVerification: true,
    },
    {
      href: "/dashboard/chofer/mi-vehiculo",
      label: "Vehículo",
      icon: "🚛",
      requiresVerification: true,
    },
    {
      href: "/dashboard/chofer/perfil",
      label: "Perfil",
      icon: "👤",
    },
  ];

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/chofer/status", { cache: "no-store" });
        const data = (await response.json()) as { canOperate?: boolean };
        setCanOperate(Boolean(data.canOperate));
      } catch {
        setCanOperate(false);
      }
    }

    void loadStatus();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <UserMenu />
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const isLocked = Boolean(item.requiresVerification) && !canOperate;

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg mb-2 text-gray-400 bg-gray-50 cursor-not-allowed"
                  title="Disponible cuando logística verifique tu solicitud"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-xs">🔒</span>
                </div>
              );
            }

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

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-end items-center">
          {/* menú superior derecho eliminado */}
        </div>

        {/* Content */}
        <div className="p-8 flex-1">
          <div className="bg-white rounded-lg shadow-sm p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
