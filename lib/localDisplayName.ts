import { prisma } from "@/lib/prisma";

type NameDelegate = {
  findUnique?: (args: {
    where: { clerkUserId: string };
    select: { nombre: true };
  }) => Promise<{ nombre: string | null } | null>;
};

async function getTrimmedName(delegate: NameDelegate | undefined, clerkUserId: string) {
  if (!delegate?.findUnique) {
    return null;
  }

  const record = await delegate.findUnique({
    where: { clerkUserId },
    select: { nombre: true },
  }).catch(() => null);

  return record?.nombre?.trim() ? record.nombre.trim() : null;
}

export async function getLocalDisplayName(clerkUserId?: string | null): Promise<string | null> {
  if (!clerkUserId) return null;

  const chofer = await getTrimmedName((prisma as { chofer?: NameDelegate }).chofer, clerkUserId);
  if (chofer) {
    return chofer;
  }

  const logisticAdmin = await getTrimmedName((prisma as { logisticAdmin?: NameDelegate }).logisticAdmin, clerkUserId);
  if (logisticAdmin) {
    return logisticAdmin;
  }

  const admin = await getTrimmedName((prisma as { adminDelivery?: NameDelegate }).adminDelivery, clerkUserId);
  if (admin) {
    return admin;
  }

  return null;
}
