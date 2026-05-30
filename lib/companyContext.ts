import { currentUser, getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const LOGISTIC_ADMIN_ROLE = "logistic_admin";
const SELLER_ROLE = "seller";
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

export type CompanyContext = {
  userId: string;
  idVendedor: number | null;
  roles: string[];
};

export async function getCompanyContext(request: NextRequest): Promise<CompanyContext | null> {
  const { userId } = getAuth(request);
  if (!userId) return null;

  const clerkUser = await currentUser().catch(() => null);
  const clerkRoles = normalizeRoles(clerkUser?.publicMetadata?.role);

  const userRole = await prisma.userRole.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true, role: true },
  });
  const adminDelivery = await prisma.adminDelivery.findUnique({
    where: { clerkUserId: userId },
    select: { clerkUserId: true },
  });

  const dbRoles = normalizeRoles(userRole?.role);
  const canAccess =
    clerkRoles.includes(ADMIN_DELIVERY_ROLE) ||
    dbRoles.includes(LOGISTIC_ADMIN_ROLE) ||
    dbRoles.includes(SELLER_ROLE) ||
    dbRoles.includes(ADMIN_DELIVERY_ROLE) ||
    Boolean(adminDelivery);

  if (!canAccess) return null;

  return {
    userId,
    roles: [...new Set([...dbRoles, ...clerkRoles, ...(adminDelivery ? [ADMIN_DELIVERY_ROLE] : [])])],
    idVendedor: userRole?.idVendedor ?? null,
  };
}