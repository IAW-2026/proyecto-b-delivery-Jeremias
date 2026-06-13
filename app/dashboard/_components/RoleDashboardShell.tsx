"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import UserMenu from "@/app/components/UserMenu";
import { getUserRole } from "@/lib/actions/user-role";

export type RoleNavigationItem = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

type RoleDashboardShellProps = {
  children: React.ReactNode;
  displayName: string | null;
  navigationItems: RoleNavigationItem[];
};

export default function RoleDashboardShell({ children, displayName, navigationItems }: RoleDashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      window.location.href = "/signin";
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await getUserRole();
      } catch {
        window.location.href = "/signin";
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function renderNavItem(item: RoleNavigationItem) {
    const isActive = pathname === item.href;
    const content = (
      <div
        className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
          item.disabled
            ? "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
            : isActive
            ? "border-l-4 border-blue-600 bg-blue-50 text-blue-600"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className={`text-xl leading-none ${item.disabled ? "opacity-60" : ""}`} aria-hidden>
          {item.disabled ? <span aria-hidden="true">🔒</span> : <span>{item.icon}</span>}
        </span>
        <span className="font-medium">{item.label}</span>
      </div>
    );

    if (item.disabled) {
      return <div key={item.href}>{content}</div>;
    }

    return (
      <Link key={item.href} href={item.href} onClick={closeSidebar} aria-current={isActive ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-white shadow-lg
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="border-b border-gray-200 p-6">
          <UserMenu initialDisplayName={displayName ?? undefined} />
        </div>

        <nav className="p-4" aria-label="Navegación principal">
          {navigationItems.map(renderNavItem)}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between bg-white p-4 shadow-sm md:justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú de navegación"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4 md:p-8 min-w-0">
          <div className="rounded-lg bg-white p-4 md:p-6 shadow-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}