import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

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
  const { sessionClaims } = getAuth(request);
  const roles = resolveRolesFromClaims(sessionClaims);

  const canAccess = roles.includes(ADMIN_DELIVERY_ROLE) || roles.includes("logistic_admin");

  if (!canAccess) return null;

  return {
    userId,
    roles,
    idVendedor: userRole?.idVendedor ?? null,
  };
}