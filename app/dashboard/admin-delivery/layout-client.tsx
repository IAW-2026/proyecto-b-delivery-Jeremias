"use client";

import RoleDashboardShell from "../_components/RoleDashboardShell";
import { adminDeliveryNavigationItems } from "./navigation";

export default function AdminDeliveryLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  return <RoleDashboardShell displayName={displayName} navigationItems={adminDeliveryNavigationItems}>{children}</RoleDashboardShell>;
}