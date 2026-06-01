import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";
import {
  ADMIN_DELIVERY_ROLE,
  ALLOWED_LOCAL_ROLES,
  resolveRolesFromClaims,
  syncClerkRoleMetadata,
  revokeAllClerkSessions,
} from "@/lib/roles";

async function hasAdminDeliveryAccess(request: NextRequest) {
  const { sessionClaims } = getAuth(request);
  const roles = resolveRolesFromClaims(sessionClaims);

  return roles.includes(ADMIN_DELIVERY_ROLE);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasAdminDeliveryAccess(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getAdminDeliveryUsersData({ excludeClerkUserId: userId });
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

    if (!(await hasAdminDeliveryAccess(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          clerkUserId?: unknown;
          action?: unknown;
          nombre?: unknown;
          telefono?: unknown;
      role?: unknown;
      idVendedor?: unknown;
      nombreEmpresa?: unknown;
      blockedReason?: unknown;
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
      if (targetUserId === userId) {
        return NextResponse.json({ error: "Cannot revoke your own global access" }, { status: 400 });
      }

      await prisma.adminDelivery.deleteMany({ where: { clerkUserId: targetUserId } });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (action === "set_local_role") {
      const role = typeof body.role === "string" ? body.role.trim() : "";

      if (!ALLOWED_LOCAL_ROLES.includes(role as (typeof ALLOWED_LOCAL_ROLES)[number])) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      const existingRole = await prisma.userRole.findUnique({
        where: { clerkUserId: targetUserId },
        select: { idVendedor: true, nombreEmpresa: true },
      });

      let idVendedor: number;
      if (body.idVendedor !== null && body.idVendedor !== undefined && body.idVendedor !== "") {
        const parsed = Number(body.idVendedor);
        idVendedor = Number.isFinite(parsed) && parsed >= 0 ? parsed : (existingRole?.idVendedor ?? 0);
      } else {
        idVendedor = existingRole?.idVendedor ?? 0;
      }

      const nombreEmpresa = typeof body.nombreEmpresa === "string"
        ? body.nombreEmpresa.trim() || null
        : (existingRole?.nombreEmpresa ?? null);

      if (role === "delivery" && idVendedor > 0) {
        const client = await clerkClient();
        let nombre = "Chofer";
        try {
          const clerkUser = await client.users.getUser(targetUserId);
          const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
          if (fullName) nombre = fullName;
        } catch {
          // fallback to default
        }

        await prisma.chofer.upsert({
          where: { clerkUserId: targetUserId },
          create: {
            clerkUserId: targetUserId,
            nombre,
            idVendedor,
            nombreEmpresa,
            estado: "activo",
            disponible: true,
          },
          update: {
            nombre,
            idVendedor,
            nombreEmpresa,
            estado: "activo",
          },
        });
      }

      const synced = await syncClerkRoleMetadata(targetUserId, role);
      console.debug("syncClerkRoleMetadata result", targetUserId, role, synced);
      const revoked = await revokeAllClerkSessions(targetUserId).catch(() => false);
      console.debug("revokeAllClerkSessions result", targetUserId, revoked);

      const userRole = await prisma.userRole.upsert({
        where: { clerkUserId: targetUserId },
        create: {
          clerkUserId: targetUserId,
          role,
          idVendedor,
          nombreEmpresa,
        },
        update: {
          role,
          idVendedor,
          nombreEmpresa,
        },
      });

      return NextResponse.json({ ok: true, userRole }, { status: 200 });
    }

    if (action === "block_user" || action === "unblock_user") {
      if (action === "block_user" && targetUserId === userId) {
        return NextResponse.json({ error: "Cannot block your own account" }, { status: 400 });
      }

      const blockedReason = typeof body.blockedReason === "string" ? body.blockedReason.trim() : "";
      const isBlocked = action === "block_user";

      const accessControl = await prisma.userAccessControl.upsert({
        where: { clerkUserId: targetUserId },
        create: {
          clerkUserId: targetUserId,
          isBlocked,
          blockedReason: isBlocked ? blockedReason || null : null,
          blockedByClerkUserId: isBlocked ? userId : null,
          blockedAt: isBlocked ? new Date() : null,
        },
        update: {
          isBlocked,
          blockedReason: isBlocked ? blockedReason || null : null,
          blockedByClerkUserId: isBlocked ? userId : null,
          blockedAt: isBlocked ? new Date() : null,
        },
      });

      if (isBlocked) {
        await revokeAllClerkSessions(targetUserId).catch(() => false);
      }

      return NextResponse.json({ ok: true, accessControl }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("admin-delivery users PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}