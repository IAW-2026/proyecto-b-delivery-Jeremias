"use client";

import { useEffect, useState } from "react";
import RoleDashboardShell from "../_components/RoleDashboardShell";
import { choferNavigationItems } from "./navigation";

export default function ChoferLayoutClient({
  children,
  displayName,
  choferEstado,
}: {
  children: React.ReactNode;
  displayName: string | null;
  choferEstado: string | null;
}) {
  const [canSeeOperationalPages, setCanSeeOperationalPages] = useState(choferEstado === "activo");

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

  const navigationItems = choferNavigationItems.map((item) =>
    item.href === "/dashboard/chofer" ? item : { ...item, disabled: !canSeeOperationalPages }
  );

  return (
    <RoleDashboardShell displayName={displayName} navigationItems={navigationItems}>
      {children}
    </RoleDashboardShell>
  );
}
