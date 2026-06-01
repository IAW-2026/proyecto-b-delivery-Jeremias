import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUserBlocked } from "@/lib/userAccess";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

async function resolveRoles(sessionClaims: unknown) {
  return resolveRolesFromClaims(sessionClaims);
}

export const proxy = clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/blocked") {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();

  if (pathname.startsWith("/api/")) {
    if (userId && (await isUserBlocked(userId))) {
      return NextResponse.json({ error: "Blocked" }, { status: 403 });
    }

    return NextResponse.next();
  }

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!isDashboard) {
    return NextResponse.next();
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (await isUserBlocked(userId)) {
    return NextResponse.redirect(new URL("/blocked", request.url));
  }

  const roles = await resolveRoles(sessionClaims);
  const isDelivery = roles.includes("delivery");
  const isLogisticAdmin = roles.includes("logistic_admin");
  const isAdminDelivery = roles.includes("admin_delivery");
  const isSeller = roles.includes("seller");
  const isAdmin = isLogisticAdmin || isSeller;

  if (pathname === "/dashboard") {
    if (isAdminDelivery) {
      return NextResponse.redirect(new URL("/dashboard/admin-delivery", request.url));
    }
    if (isDelivery) {
      const dbChofer = await prisma.chofer.findUnique({ where: { clerkUserId: userId } }).catch(() => null);
      if (dbChofer?.estado === "activo") return NextResponse.redirect(new URL("/dashboard/chofer", request.url));
      if (dbChofer?.estado === "inactivo" || dbChofer?.estado === "rechazado") return NextResponse.redirect(new URL("/dashboard/chofer", request.url));
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
    const isInactiveOrRejected = dbChofer?.estado === "inactivo" || dbChofer?.estado === "rechazado";

    if (!hasActiveChofer && !isInactiveOrRejected) {
      if (!pathname.startsWith("/dashboard/chofer/onboarding")) {
        return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
      }
    }

    if (isInactiveOrRejected && pathname.startsWith("/dashboard/chofer/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard/chofer", request.url));
    }

    if (choferRequest?.status === "pending" && !pathname.startsWith("/dashboard/chofer/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard/chofer/onboarding", request.url));
    }
  }

  if (pathname.startsWith("/dashboard/logistic-admin") && isAdminDelivery) {
    return NextResponse.redirect(new URL("/dashboard/admin-delivery", request.url));
  }

  if (pathname.startsWith("/dashboard/logistic-admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard/admin-delivery") && !isAdminDelivery) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ["/((?!.*\\..*|_next|signin).*)"],
};
