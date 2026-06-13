"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_DELIVERY_ROLE,
  ALLOWED_LOCAL_ROLES,
  resolveRolesFromClaims,
  syncClerkRoleMetadata,
  revokeAllClerkSessions,
} from "@/lib/roles";

async function assertAdminDeliveryAccess() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("No autorizado");

  const roles = resolveRolesFromClaims(sessionClaims);
  if (!roles.includes(ADMIN_DELIVERY_ROLE)) throw new Error("Acceso denegado");

  return { userId };
}

export async function setLocalRole(
  targetUserId: string,
  role: string,
  idVendedor: number,
  nombreEmpresa: string | null
) {
  await assertAdminDeliveryAccess();

  if (!ALLOWED_LOCAL_ROLES.includes(role as (typeof ALLOWED_LOCAL_ROLES)[number])) {
    throw new Error("Rol inválido");
  }

  if (role === "delivery" && idVendedor > 0) {
    const nameProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: targetUserId },
      select: { nombre: true },
    });
    let nombre = nameProfile?.nombre?.trim() || "Chofer";

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
      update: { nombre, idVendedor, nombreEmpresa, estado: "activo" },
    });
  }

  await syncClerkRoleMetadata(targetUserId, role);
  await revokeAllClerkSessions(targetUserId).catch(() => false);

  await prisma.userProfile.upsert({
    where: { clerkUserId: targetUserId },
    create: { clerkUserId: targetUserId, role, idVendedor, nombreEmpresa },
    update: { role, idVendedor, nombreEmpresa },
  });

  revalidatePath("/dashboard/admin-delivery/usuarios");
}

export async function promoteAdminDelivery(targetUserId: string, nombre: string, telefono: string) {
  await assertAdminDeliveryAccess();

  await prisma.userProfile.upsert({
    where: { clerkUserId: targetUserId },
    create: {
      clerkUserId: targetUserId,
      role: "admin_delivery",
      idVendedor: 0,
      nombre: nombre || targetUserId,
      telefono: telefono || null,
    },
    update: {
      role: "admin_delivery",
      nombre: nombre || targetUserId,
      telefono: telefono || null,
    },
  });

  revalidatePath("/dashboard/admin-delivery/usuarios");
}

export async function revokeAdminDelivery(targetUserId: string) {
  const { userId } = await assertAdminDeliveryAccess();
  if (targetUserId === userId) throw new Error("No podés revocar tu propio acceso global");

  await prisma.userProfile.updateMany({
    where: { clerkUserId: targetUserId, role: "admin_delivery" },
    data: { role: "delivery", nombre: null, telefono: null },
  });

  revalidatePath("/dashboard/admin-delivery/usuarios");
}

export async function blockUser(targetUserId: string, blockedReason: string) {
  const { userId } = await assertAdminDeliveryAccess();
  if (targetUserId === userId) throw new Error("No podés bloquear tu propia cuenta");

  await prisma.userAccessControl.upsert({
    where: { clerkUserId: targetUserId },
    create: {
      clerkUserId: targetUserId,
      isBlocked: true,
      blockedReason: blockedReason || null,
      blockedByClerkUserId: userId,
      blockedAt: new Date(),
    },
    update: {
      isBlocked: true,
      blockedReason: blockedReason || null,
      blockedByClerkUserId: userId,
      blockedAt: new Date(),
    },
  });

  await revokeAllClerkSessions(targetUserId).catch(() => false);

  revalidatePath("/dashboard/admin-delivery/usuarios");
}

export async function unblockUser(targetUserId: string) {
  await assertAdminDeliveryAccess();

  await prisma.userAccessControl.upsert({
    where: { clerkUserId: targetUserId },
    create: {
      clerkUserId: targetUserId,
      isBlocked: false,
      blockedReason: null,
      blockedByClerkUserId: null,
      blockedAt: null,
    },
    update: {
      isBlocked: false,
      blockedReason: null,
      blockedByClerkUserId: null,
      blockedAt: null,
    },
  });

  revalidatePath("/dashboard/admin-delivery/usuarios");
}
