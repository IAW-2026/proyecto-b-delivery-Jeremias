"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/UserMenu";

const navigationItems = [
  { href: "/dashboard/admin-delivery", label: "Inicio global", icon: "🧭" },
  { href: "/dashboard/admin-delivery/usuarios", label: "Usuarios", icon: "🪪" }
];

export default function AdminDeliveryLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_45%),radial-gradient(circle_at_right,_rgba(16,185,129,0.12),_transparent_35%)]" />
      <div className="relative flex min-h-screen">
        <aside className="w-[290px] shrink-0 border-r border-white/10 bg-slate-950/95 backdrop-blur">
          <div className="border-b border-white/10 p-6">
            <div className="mb-4 inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">
              Admin delivery
            </div>
            <UserMenu initialDisplayName={displayName ?? undefined} />
          </div>

          <nav className="p-4">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      isActive
                        ? "border border-sky-400/40 bg-sky-400/10 text-sky-100"
                        : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5"
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
          <div className="flex items-center justify-end border-b border-white/10 bg-slate-950/80 p-4 backdrop-blur" />

          <div className="flex-1 p-8">
            <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-[0_30px_80px_rgba(2,6,23,0.28)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}