"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { LOGISTIC_ADMIN_ROLE, ADMIN_DELIVERY_ROLE, resolveRolesFromClaims, syncClerkRoleMetadata, revokeAllClerkSessions } from "@/lib/roles";

export async function getUserRole(): Promise<string[]> {
  const { sessionClaims } = await auth();
  return resolveRolesFromClaims(sessionClaims);
}

export async function setUserRole(role: string, idVendedor: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  if (role === ADMIN_DELIVERY_ROLE) {
    throw new Error("admin_delivery no puede asignarse desde la app");
  }

  if (!idVendedor) throw new Error("Falta idVendedor");

  const synced = await syncClerkRoleMetadata(userId, role);
  const revoked = await revokeAllClerkSessions(userId).catch(() => false);

  await prisma.userProfile.upsert({
    where: { clerkUserId: userId },
    update: { idVendedor, role },
    create: { clerkUserId: userId, idVendedor, role },
  });
}
