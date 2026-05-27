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
    if (!secretKey) return [] as string[];

    const response = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [] as string[];

    const user = await response.json();
    const metadata = user.public_metadata ?? user.publicMetadata ?? {};
    return getEffectiveRoles(normalizeRoles(metadata.role));
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
      // Check whether the delivery user already has a Chofer record or a pending request.
      const dbChofer = await prisma.chofer.findUnique({ where: { clerkUserId: userId } }).catch(() => null);

      if (dbChofer) return NextResponse.redirect(new URL("/dashboard/chofer", request.url));
      // If there's a pending request, or no chofer yet, send to onboarding (selection or waiting view)
      return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
    }
    if (isAdmin) return NextResponse.redirect(new URL("/dashboard/logistic-admin", request.url));
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (pathname.startsWith("/dashboard/chofer")) {
    if (!isDelivery) return NextResponse.redirect(new URL("/dashboard", request.url));

    // If the user is a delivery role, ensure they either have a Chofer record
    // or allow only the onboarding flow until they create/request association.
    const dbChofer = await prisma.chofer.findUnique({ where: { clerkUserId: userId } }).catch(() => null);
    const pendingRequest = await prisma.choferRequest.findFirst({ where: { clerkUserId: userId, status: "pending" } }).catch(() => null);

    if (!dbChofer && !pendingRequest) {
      // Allow the onboarding page, but block other chofer subroutes until association.
      if (!pathname.startsWith("/dashboard/chofer/onboarding")) {
        return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
      }
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
