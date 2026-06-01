import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUserBlocked } from "@/lib/userAccess";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

async function resolveRoles(sessionClaims: unknown) {
  return resolveRolesFromClaims(sessionClaims);
}

// Asegura que un usuario autenticado tenga los roles adecuados en Clerk.
// Clave canónica: publicMetadata.role (arreglo). `roles` es la clave legacy.
async function ensureProperRoles(userId: string) {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const user = await client.users.getUser(userId);
    const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

    const canonicalRoles = Array.isArray(publicMetadata.role)
      ? (publicMetadata.role as string[])
      : typeof publicMetadata.role === "string"
        ? [publicMetadata.role as string]
        : [];
    const legacyRoles = Array.isArray(publicMetadata.roles) ? (publicMetadata.roles as string[]) : [];

    // Fusionar clave canónica + legacy (migración)
    const rolesArray = [...new Set([...canonicalRoles, ...legacyRoles])];
    const hasLegacyKey = publicMetadata.roles !== undefined;

    let updatedRoles = [...rolesArray];
    let needsUpdate = hasLegacyKey;

    // Regla 1: si no hay roles, asignar delivery
    if (rolesArray.length === 0) {
      updatedRoles = ["delivery"];
      needsUpdate = true;
    }
    // Regla 2: si no tiene delivery, agregarlo
    else if (!rolesArray.includes("delivery")) {
      updatedRoles = [...rolesArray, "delivery"];
      needsUpdate = true;
    }

    // Regla 3: si tiene seller, agregar logistic_admin (si no lo tiene)
    if (rolesArray.includes("seller") && !updatedRoles.includes("logistic_admin")) {
      updatedRoles = [...updatedRoles, "logistic_admin"];
      needsUpdate = true;
    }

    if (needsUpdate) {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: updatedRoles,
          // Eliminar la clave legacy para evitar roles fantasma
          roles: null,
        },
      });
      console.log(`[Role Assignment] Updated roles for user ${userId}: ${JSON.stringify(rolesArray)} -> ${JSON.stringify(updatedRoles)}`);
    }

    return updatedRoles;
  } catch (error) {
    console.error(`[Role Assignment Error] Failed to ensure proper roles for user ${userId}:`, error);
    // No bloqueamos el acceso si falla la asignación de roles
    return [];
  }
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

  // Asegurar/persistir los roles del usuario en Clerk al navegar la app
  if (userId) {
    await ensureProperRoles(userId);
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
