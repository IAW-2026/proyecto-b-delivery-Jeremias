import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ role: [] }, { status: 401 });
    }

    // Obtener usuario de Clerk como fuente de verdad para el rol.
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

    try {
      const roleRow = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });
      if (roleRow && roleRow.role !== updatedRole[0]) {
        await prisma.userRole.update({
          where: { clerkUserId: userId },
          data: { role: updatedRole[0] },
        });
      }
    } catch (err) {
      console.debug("user-role DB sync failed:", err);
    }

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

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error("Error assigning default role:", patchRes.status, text);
      }
    }

    return NextResponse.json({ role: updatedRole }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: [], error: "Error fetching role" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const idVendedor = Number(body.idVendedor ?? body.id_vendedor ?? 0);
    const role = typeof body.role === "string" ? body.role : LOGISTIC_ADMIN_ROLE;

    if (!idVendedor) return NextResponse.json({ error: "Missing idVendedor" }, { status: 400 });

    await prisma.userRole.upsert({
      where: { clerkUserId: userId },
      update: { idVendedor, role },
      create: { clerkUserId: userId, idVendedor, role },
    });

    // Also update Clerk public metadata so Clerk-based reads see the role
    try {
      const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
      if (secretKey) {
        const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_metadata: { role: [role] } }),
        });

        if (!clerkRes.ok) {
          const txt = await clerkRes.text();
          console.debug("Clerk patch returned: ", clerkRes.status, txt);
        }
      }
    } catch (err) {
      console.debug("Failed to patch Clerk metadata:", err);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("user-role POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}