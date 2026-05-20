import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const CLERK_API_BASE = "https://api.clerk.com";
const DEFAULT_ROLE = "delivery";
const MANAGED_ROLES = ["delivery", "logistic_admin"] as const;
const SELLER_ROLE = "seller";
const LOGISTIC_ADMIN_ROLE = "logistic_admin";

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

function getEffectiveRoles(rawRoles: string[]): string[] {
  const roles = [...new Set(rawRoles)];
  const hasSeller = roles.includes(SELLER_ROLE);
  const hasManagedRole = MANAGED_ROLES.some((managedRole) => roles.includes(managedRole));

  if (hasSeller) {
    return [...new Set([...roles.filter((role) => role !== DEFAULT_ROLE), LOGISTIC_ADMIN_ROLE])];
  }

  if (!hasManagedRole) {
    return [...roles, DEFAULT_ROLE];
  }

  return roles;
}

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    // Compatibilidad: si llega por header lo usamos, si no usamos la sesión.
    const userId = request.headers.get("X-User-ID") || authUserId;
    if (!userId) {
      return NextResponse.json({ role: [] }, { status: 200 });
    }
      // Obtener usuario de Clerk
    const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
    if (!secretKey) {
      return NextResponse.json({ role: [] }, { status: 200 });
    }

    const res = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      await res.text();
      return NextResponse.json({ role: [] }, { status: 200 });
    }

    const user = await res.json();
    const metadata = user.public_metadata ?? user.publicMetadata ?? {};
    const role = normalizeRoles(metadata.role);
    const updatedRole = getEffectiveRoles(role);

    if (updatedRole.length !== role.length || updatedRole.some((value, index) => value !== role[index])) {
      const patchRes = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: {
            ...metadata,
            role: updatedRole,
          },
        }),
      });

      if (patchRes.ok) {
        return NextResponse.json({ role: updatedRole }, { status: 200 });
      }

      const text = await patchRes.text();
      console.error("Error assigning default role:", patchRes.status, text);
    }

    return NextResponse.json({ role: updatedRole }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: [], error: "Error fetching role" }, { status: 500 });
  }
}