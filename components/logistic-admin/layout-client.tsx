"use client";

import RoleDashboardShell from "@/components/role-dashboard-shell";
import { logisticAdminNavigationItems } from "@/lib/logistic-admin/navigation";

export default function LogisticAdminLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  return <RoleDashboardShell displayName={displayName} navigationItems={logisticAdminNavigationItems}>{children}</RoleDashboardShell>;
}
