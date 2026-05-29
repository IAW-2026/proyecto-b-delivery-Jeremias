"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

function resolveRoleLabel(roles: string[]) {
  if (roles.includes("logistic_admin")) return "Logistic admin";
  if (roles.includes("delivery")) return "Delivery";
  if (roles.includes("seller")) return "Seller";
  return roles[0] ?? "Sin rol";
}

export default function UserMenu({ initialDisplayName }: { initialDisplayName?: string }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [resolvedRole, setResolvedRole] = useState<string>("Sin rol");
  const [displayName, setDisplayName] = useState<string>(initialDisplayName?.trim() || "Usuario");

  useEffect(() => {
    if (initialDisplayName?.trim()) {
      setDisplayName(initialDisplayName.trim());
    }
  }, [initialDisplayName]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    async function loadRole() {
      try {
        const response = await fetch("/api/user-role", {
          cache: "no-store",
        });

        const data = (await response.json()) as { role?: string[] };
        const roles = Array.isArray(data.role) ? data.role : [];
        setResolvedRole(resolveRoleLabel(roles));
      } catch {
        setResolvedRole("Sin rol");
      }
    }

    void loadRole();
  }, [isLoaded, isSignedIn, user?.id]);

  return (
    <div className="flex items-center gap-3 p-1 rounded-md">
      <UserButton appearance={{ elements: { avatarBox: "w-12 h-12 rounded-full" } }} />
      <div className="select-none">
        <p className="font-semibold text-gray-900">
          {displayName}
        </p>
        <p className="text-sm text-gray-500">{resolvedRole}</p>
      </div>
    </div>
  );
}
