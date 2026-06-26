import { prisma } from "@/lib/prisma";

export async function isUserBlocked(userId: string) {
  const access = await prisma.userAccessControl
    .findUnique({ where: { clerkUserId: userId }, select: { isBlocked: true } })
    .catch(() => null);

  return Boolean(access?.isBlocked);
}

export async function getUserAccessControl(userId: string) {
  return prisma.userAccessControl
    .findUnique({
      where: { clerkUserId: userId },
      select: {
        clerkUserId: true,
        isBlocked: true,
        blockedReason: true,
        blockedByClerkUserId: true,
        blockedAt: true,
        updatedAt: true,
      },
    })
    .catch(() => null);
}
