"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "@/app/components/UserMenu";

export default function ChoferLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  const pathname = usePathname();
  const [canSeeOperationalPages, setCanSeeOperationalPages] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadChoferAccess() {
      try {
        const response = await fetch("/api/chofer/status", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { chofer?: { estado?: string } };
        if (!cancelled) {
          setCanSeeOperationalPages(payload.chofer?.estado === "activo");
        }
      } catch {
        if (!cancelled) {
          setCanSeeOperationalPages(false);
        }
      }
    }

    void loadChoferAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const navigationItems = [{ href: "/dashboard/chofer", label: "Inicio", icon: "📊" }];

  const operationalItems = [
    { href: "/dashboard/chofer/mis-pedidos", label: "Pedidos", icon: "📦" },
    { href: "/dashboard/chofer/mi-zona", label: "Zona", icon: "🗺️" },
    { href: "/dashboard/chofer/mi-vehiculo", label: "Vehículo", icon: "🚛" },
  ];

  function renderNavItem(item: { href: string; label: string; icon: string }, disabled = false) {
    const isActive = pathname === item.href;

    const content = (
      <div
        className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
          disabled
            ? "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
            : isActive
            ? "border-l-4 border-blue-600 bg-blue-50 text-blue-600"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className={`text-xl ${disabled ? "opacity-60" : ""}`}>{disabled ? "🔒" : item.icon}</span>
        <span className="font-medium">{item.label}</span>
      </div>
    );

    if (disabled) {
      return <div key={item.href}>{content}</div>;
    }

    return <Link key={item.href} href={item.href}>{content}</Link>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="border-b border-gray-200 p-6">
          <UserMenu initialDisplayName={displayName ?? undefined} />
        </div>

        <nav className="p-4">
          {navigationItems.map((item) => renderNavItem(item))}
          {operationalItems.map((item) => renderNavItem(item, !canSeeOperationalPages))}
          {renderNavItem({ href: "/dashboard/chofer/perfil", label: "Perfil", icon: "👤" })}
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
