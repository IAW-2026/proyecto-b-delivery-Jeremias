import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const LOGISTIC_ADMIN_ROLE = "logistic_admin";
const SELLER_ROLE = "seller";

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

  const userRole = await prisma.userRole.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true, role: true },
  });

  const dbRoles = normalizeRoles(userRole?.role);
  const canAccess = dbRoles.includes(LOGISTIC_ADMIN_ROLE) || dbRoles.includes(SELLER_ROLE);

  if (!canAccess) return null;

  return {
    userId,
    roles: [...new Set(dbRoles)],
    idVendedor: userRole?.idVendedor ?? null,
  };
}