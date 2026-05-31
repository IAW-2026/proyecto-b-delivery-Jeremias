"use client";

import RoleDashboardShell from "../_components/RoleDashboardShell";
import { logisticAdminNavigationItems } from "./navigation";

export default function LogisticAdminLayoutClient({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string | null;
}) {
  return <RoleDashboardShell displayName={displayName} navigationItems={logisticAdminNavigationItems}>{children}</RoleDashboardShell>;
}
