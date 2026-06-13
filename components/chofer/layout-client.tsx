"use client";

import { useEffect, useState } from "react";
import RoleDashboardShell from "@/components/role-dashboard-shell";
import { choferNavigationItems } from "@/lib/chofer/navigation";
import { getChoferStatusData } from "@/lib/actions/chofer";

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
        const statusData = await getChoferStatusData();
        if (!cancelled) {
          setCanSeeOperationalPages(statusData?.chofer?.estado === "activo");
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
