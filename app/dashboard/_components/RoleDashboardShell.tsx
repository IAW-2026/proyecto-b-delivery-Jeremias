"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";

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
      <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="border-b border-gray-200 p-6">
          <UserMenu initialDisplayName={displayName ?? undefined} />
        </div>

        <nav className="p-4">{navigationItems.map(renderNavItem)}</nav>
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