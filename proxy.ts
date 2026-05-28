import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CLERK_API_BASE = "https://api.clerk.com";
const DEFAULT_ROLE = "delivery";
const MANAGED_ROLES = ["delivery", "logistic_admin"] as const;
const SELLER_ROLE = "seller";
const LOGISTIC_ADMIN_ROLE = "logistic_admin";

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

function getEffectiveRoles(rawRoles: string[]): string[] {
  const roles = [...new Set(rawRoles)];
  const hasSeller = roles.includes(SELLER_ROLE);
  const hasManagedRole = MANAGED_ROLES.some((managedRole) => roles.includes(managedRole));

  if (hasSeller) {
    return [...new Set([...roles.filter((role) => role !== DEFAULT_ROLE), LOGISTIC_ADMIN_ROLE])];
  }

  if (!hasManagedRole) {
    return [...roles, DEFAULT_ROLE];
  }

  return roles;
}

async function resolveRoles(userId: string) {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;

    // Read DB roles (if any)
    const dbRecord = await prisma.userRole
      .findUnique({ where: { clerkUserId: userId }, select: { role: true } })
      .catch(() => null);

    const dbRoles = normalizeRoles(dbRecord?.role);

    // Read Clerk roles if we can; fall back to DB-only when Clerk is unavailable
    let clerkRoles: string[] = [];
    if (secretKey) {
      try {
        const response = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (response.ok) {
          const user = await response.json();
          const metadata = user.public_metadata ?? user.publicMetadata ?? {};
          clerkRoles = normalizeRoles(metadata.role);
        }
      } catch {
        clerkRoles = [];
      }
    }

    const combined = [...dbRoles, ...clerkRoles];
    return getEffectiveRoles(normalizeRoles(combined));
  } catch {
    return [] as string[];
  }
}

export const proxy = clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!isDashboard) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const roles = await resolveRoles(userId);
  const isDelivery = roles.includes("delivery");
  const isLogisticAdmin = roles.includes("logistic_admin");
  const isSeller = roles.includes("seller");
  const isAdmin = isLogisticAdmin || isSeller;

  if (pathname === "/dashboard") {
    if (isDelivery) {
      const dbChofer = await prisma.chofer.findUnique({ where: { clerkUserId: userId } }).catch(() => null);
      if (dbChofer?.estado === "activo") return NextResponse.redirect(new URL("/dashboard/chofer", request.url));
      return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
    }
    if (isAdmin) return NextResponse.redirect(new URL("/dashboard/logistic-admin", request.url));
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (pathname.startsWith("/dashboard/chofer")) {
    if (!isDelivery) return NextResponse.redirect(new URL("/dashboard", request.url));

    const dbChofer = await prisma.chofer.findUnique({ where: { clerkUserId: userId } }).catch(() => null);
    const choferRequest = await prisma.choferRequest.findUnique({ where: { clerkUserId: userId } }).catch(() => null);
    const hasActiveChofer = dbChofer?.estado === "activo";

    if (!hasActiveChofer) {
      if (!pathname.startsWith("/dashboard/chofer/onboarding")) {
        return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
      }
    }

    if (choferRequest?.status === "pending" && !pathname.startsWith("/dashboard/chofer/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
    }
  }

  if (pathname.startsWith("/dashboard/logistic-admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ["/((?!.*\\..*|_next|signin).*)"],
};
