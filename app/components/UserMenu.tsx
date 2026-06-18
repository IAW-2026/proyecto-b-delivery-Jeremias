"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getUserRole } from "@/lib/actions/user-role";

function resolveRoleLabel(roles: string[]) {
  if (roles.includes("admin_delivery")) return "Admin delivery";
  if (roles.includes("logistic_admin")) return "Logistic admin";
  if (roles.includes("delivery")) return "Delivery";
  return roles[0] ?? "Sin rol";
}

export default function UserMenu({ initialDisplayName }: { initialDisplayName?: string }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [resolvedRole, setResolvedRole] = useState<string>("Sin rol");
  const displayName = initialDisplayName?.trim() || "Usuario";

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    async function loadRole() {
      try {
        const roles = await getUserRole();
        setResolvedRole(resolveRoleLabel(roles));
      } catch {
        setResolvedRole("Sin rol");
      }
    }

    void loadRole();
  }, [isLoaded, isSignedIn, user?.id]);

  return (
    <div className="flex items-center gap-3 p-1 rounded-md">
      <UserButton appearance={{ elements: { avatarBox: "size-10 md:size-12 rounded-full" } }} />
      <div className="select-none min-w-0 hidden md:block">
        <p className="font-semibold text-gray-900 truncate text-sm md:text-base">
          {displayName}
        </p>
        <p className="text-xs md:text-sm text-gray-500 truncate">{resolvedRole}</p>
      </div>
      <div className="select-none min-w-0 block md:hidden">
        <p className="text-xs font-semibold text-gray-500 truncate">{resolvedRole}</p>
      </div>
    </div>
  );
}
