"use client";

import RoleDashboardShell from "@/components/role-dashboard-shell";
import { adminDeliveryNavigationItems } from "@/lib/admin-delivery/navigation";

export default function AdminDeliveryLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  return <RoleDashboardShell displayName={displayName} navigationItems={adminDeliveryNavigationItems}>{children}</RoleDashboardShell>;
}
