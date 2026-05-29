import { prisma } from "@/lib/prisma";

export async function getLocalDisplayName(clerkUserId?: string | null): Promise<string | null> {
  if (!clerkUserId) return null;

  const chofer = await prisma.chofer.findUnique({
    where: { clerkUserId },
    select: { nombre: true },
  }).catch(() => null);

  if (chofer?.nombre?.trim()) {
    return chofer.nombre.trim();
  }

  const admin = await prisma.adminDelivery.findUnique({
    where: { clerkUserId },
    select: { nombre: true },
  }).catch(() => null);

  if (admin?.nombre?.trim()) {
    return admin.nombre.trim();
  }

  return null;
}
