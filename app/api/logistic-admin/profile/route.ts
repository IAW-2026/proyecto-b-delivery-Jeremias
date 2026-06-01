import { NextRequest, NextResponse } from "next/server";
import { clerkClient, currentUser, getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

type AdminProfilePayload = {
  nombre?: unknown;
  apellido?: unknown;
  telefono?: unknown;
  nombreEmpresa?: unknown;
};

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = resolveRolesFromClaims(sessionClaims);
    const isAdminDelivery = roles.includes(ADMIN_DELIVERY_ROLE);
    const clerkUser = await currentUser();
    const logisticAdminProfile = await prisma.logisticAdmin.findUnique({ where: { clerkUserId: userId } });
    const legacyAdminProfile = isAdminDelivery ? null : await prisma.adminDelivery.findUnique({ where: { clerkUserId: userId } });
    const admin = isAdminDelivery ? await prisma.adminDelivery.findUnique({ where: { clerkUserId: userId } }) : logisticAdminProfile ?? legacyAdminProfile;
    const userRole = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });

    const clerkName = `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();
    const nombreFull = isAdminDelivery ? admin?.nombre ?? clerkName : clerkName;
    const parts = nombreFull.trim().length > 0 ? nombreFull.trim().split(/\s+/) : [];
    const nombre = parts.shift() ?? "";
    const apellido = parts.join(" ");
    const telefono = isAdminDelivery ? admin?.telefono ?? null : null;

    return NextResponse.json({ ok: true, profile: { nombre: nombre || null, apellido: apellido || null, nombreEmpresa: userRole?.nombreEmpresa ?? null, telefono: telefono ?? null } }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin profile GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as AdminProfilePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();
    if (!fullName) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const { sessionClaims } = getAuth(request);
    const roles = resolveRolesFromClaims(sessionClaims);
    const isAdminDelivery = roles.includes(ADMIN_DELIVERY_ROLE);

    let savedName = fullName;
    let savedPhone: string | null = toOptionalString(body.telefono);

    if (isAdminDelivery) {
      const updatedAdmin = await prisma.adminDelivery.upsert({
        where: { clerkUserId: userId },
        create: { clerkUserId: userId, nombre: fullName, telefono: savedPhone },
        update: { nombre: fullName, telefono: savedPhone },
      });

      savedName = updatedAdmin.nombre;
      savedPhone = updatedAdmin.telefono ?? null;
    } else {
      const updatedLogisticAdmin = await prisma.logisticAdmin.upsert({
        where: { clerkUserId: userId },
        create: { clerkUserId: userId, nombre: fullName, telefono: savedPhone },
        update: { nombre: fullName, telefono: savedPhone },
      });

      await prisma.adminDelivery.deleteMany({ where: { clerkUserId: userId } });

      savedName = updatedLogisticAdmin.nombre;
      savedPhone = updatedLogisticAdmin.telefono ?? null;

      const client = await clerkClient();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts.shift() ?? "";
      const lastName = nameParts.join(" ");

      await client.users.updateUser(userId, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
    }

    // update userRole.nombreEmpresa if provided and exists
    const nombreEmpresa = toOptionalString(body.nombreEmpresa);
    let updatedUserRole = null;
    const existingRole = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });
    if (existingRole && nombreEmpresa !== null) {
      updatedUserRole = await prisma.userRole.update({ where: { clerkUserId: userId }, data: { nombreEmpresa } });
    }

    return NextResponse.json({ ok: true, profile: { nombre: savedName, nombreEmpresa: updatedUserRole?.nombreEmpresa ?? existingRole?.nombreEmpresa ?? null, telefono: savedPhone } }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin profile PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
