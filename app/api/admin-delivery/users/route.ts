import { currentUser, getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";

const ADMIN_DELIVERY_ROLE = "admin_delivery";

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

async function hasAdminDeliveryAccess(userId: string) {
  const [clerkUser, userRole, adminDelivery] = await Promise.all([
    currentUser().catch(() => null),
    prisma.userRole.findUnique({ where: { clerkUserId: userId }, select: { role: true } }),
    prisma.adminDelivery.findUnique({ where: { clerkUserId: userId }, select: { clerkUserId: true } }),
  ]);

  const clerkRoles = normalizeRoles(clerkUser?.publicMetadata?.role);
  const dbRoles = normalizeRoles(userRole?.role);

  return clerkRoles.includes(ADMIN_DELIVERY_ROLE) || dbRoles.includes(ADMIN_DELIVERY_ROLE) || Boolean(adminDelivery);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasAdminDeliveryAccess(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getAdminDeliveryUsersData();
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (error) {
    console.error("admin-delivery users GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasAdminDeliveryAccess(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          clerkUserId?: unknown;
          action?: unknown;
          nombre?: unknown;
          telefono?: unknown;
        }
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const targetUserId = typeof body.clerkUserId === "string" ? body.clerkUserId.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing clerkUserId" }, { status: 400 });
    }

    if (action === "promote_admin_delivery") {
      const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
      const telefono = typeof body.telefono === "string" ? body.telefono.trim() : "";

      const adminDelivery = await prisma.adminDelivery.upsert({
        where: { clerkUserId: targetUserId },
        create: {
          clerkUserId: targetUserId,
          nombre: nombre || targetUserId,
          telefono: telefono.length > 0 ? telefono : null,
        },
        update: {
          nombre: nombre || targetUserId,
          telefono: telefono.length > 0 ? telefono : null,
        },
      });

      return NextResponse.json({ ok: true, adminDelivery }, { status: 200 });
    }

    if (action === "revoke_admin_delivery") {
      await prisma.adminDelivery.deleteMany({ where: { clerkUserId: targetUserId } });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("admin-delivery users PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}