import { prisma } from "@/lib/prisma";

export async function getLocalDisplayName(clerkUserId?: string | null): Promise<string | null> {
  if (!clerkUserId) return null;

  const chofer = await prisma.chofer
    .findUnique({ where: { clerkUserId }, select: { nombre: true } })
    .catch(() => null);
  if (chofer?.nombre?.trim()) return chofer.nombre.trim();

  const profile = await prisma.userProfile
    .findUnique({ where: { clerkUserId }, select: { nombre: true } })
    .catch(() => null);
  if (profile?.nombre?.trim()) return profile.nombre.trim();

  return null;
}
