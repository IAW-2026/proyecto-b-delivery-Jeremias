import { clerkClient, User } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveRoles, normalizeRoles } from "@/lib/roles";

export type AdminDeliveryUserRow = {
  clerkUserId: string;
  fullName: string;
  email: string;
  effectiveRole: string;
  isGlobalAdmin: boolean;
  isAppUser: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  localRole: string;
  idVendedor: number | null;
  nombreEmpresa: string | null;
  adminPhone: string | null;
};

const ADMIN_DELIVERY_ROLE = "admin_delivery";

// Roles que identifican a un usuario como perteneciente a NUESTRA app.
// `seller` se incluye porque mapea a logistic_admin; `buyer` (u otros) quedan fuera.
const APP_ROLES = new Set(["delivery", "logistic_admin", "admin_delivery", "seller"]);

type GetAdminDeliveryUsersDataOptions = {
  excludeClerkUserId?: string | null;
};

function buildDisplayName(params: {
  clerkUser: User;
  choferName?: string | null;
  adminDeliveryName?: string | null;
  effectiveRole: string;
}) {
  const { clerkUser, choferName, adminDeliveryName, effectiveRole } = params;

  if (effectiveRole === "delivery") {
    const deliveryName = choferName?.trim();
    if (deliveryName) return deliveryName;
  }

  const adminName = adminDeliveryName?.trim();
  if (adminName) return adminName;

  const nameFromClerk = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
  if (nameFromClerk) {
    return nameFromClerk;
  }

  const username = clerkUser.username?.trim();
  if (username) {
    return username;
  }

  return "Usuario";
}

export async function getAdminDeliveryUsersData(options: GetAdminDeliveryUsersDataOptions = {}) {
  const { excludeClerkUserId = null } = options;
  let clerkUsers: User[] = [];
  let clerkUnavailable = false;

  // 1. Intentamos traer los usuarios de Clerk (paginación completa)
  try {
    const client = await clerkClient();
    const PAGE_SIZE = 500;
    let totalFetched = 0;
    let totalCount = 0;

    do {
      const clerkResponse = await client.users.getUserList({ limit: PAGE_SIZE, offset: totalFetched });
      clerkUsers.push(...clerkResponse.data);
      totalFetched += clerkResponse.data.length;
      totalCount = clerkResponse.totalCount;
    } while (totalFetched < totalCount);
  } catch (error) {
    console.error("Error al conectar con Clerk:", error);
    clerkUnavailable = true;
  }

  // 2. Traemos la data local de Prisma
  const dbUserRoles = await prisma.userRole.findMany();
  const dbAdminDeliveries = await prisma.adminDelivery.findMany();
  const dbAccessControls = await prisma.userAccessControl.findMany().catch(() => []);
  const dbChoferes = await prisma.chofer.findMany({
    select: { clerkUserId: true, nombre: true } 
  });

  // 3. Mapeamos y cruzamos los datos
  const allMappedUsers: AdminDeliveryUserRow[] = clerkUsers
    .filter((clerkUser) => clerkUser.id !== excludeClerkUserId)
    .map((clerkUser) => {
      const localRoleRecord = dbUserRoles.find((r: { clerkUserId: string }) => r.clerkUserId === clerkUser.id);
      const globalAdminRecord = dbAdminDeliveries.find((a: { clerkUserId: string }) => a.clerkUserId === clerkUser.id);
      const accessControlRecord = dbAccessControls.find((access: { clerkUserId: string }) => access.clerkUserId === clerkUser.id);
      const choferRecord = dbChoferes.find((c: { clerkUserId: string }) => c.clerkUserId === clerkUser.id);

      // Roles crudos de Clerk (sin el "delivery" que getEffectiveRoles agrega por defecto)
      const rawClerkRoles = normalizeRoles(
        (clerkUser as User & { publicMetadata?: { role?: unknown } }).publicMetadata?.role
      );
      const clerkRoles = getEffectiveRoles(rawClerkRoles);
      const clerkVisibleRole = clerkRoles[0] ?? null;
      const isGlobalAdmin = Boolean(globalAdminRecord) || clerkRoles.includes(ADMIN_DELIVERY_ROLE);
      const isBlocked = Boolean(accessControlRecord?.isBlocked);

      const localRole = localRoleRecord?.role || "Sin rol";

      // Pertenece a la app si tiene un rol de app en Clerk (crudo) o algún registro local.
      // Esto excluye buyers (rol no-app y sin datos en nuestra BD).
      const hasAppRoleInClerk = rawClerkRoles.some((role) => APP_ROLES.has(role));
      const hasLocalRecord = Boolean(localRoleRecord) || Boolean(globalAdminRecord) || Boolean(choferRecord);
      const isAppUser = hasAppRoleInClerk || hasLocalRecord;
      
      // CAMBIO CLAVE: El effectiveRole ahora prioriza Clerk y descarta los roles de Prisma
      const effectiveRole = isBlocked ? "blocked" : isGlobalAdmin ? ADMIN_DELIVERY_ROLE : clerkVisibleRole || "Sin rol";

      const primaryEmail = clerkUser.emailAddresses.find(
        (email: { id: string; emailAddress: string }) => email.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || "Sin correo";

      const fullName = buildDisplayName({
        clerkUser,
        choferName: choferRecord?.nombre,
        adminDeliveryName: globalAdminRecord?.nombre,
        effectiveRole,
      });

      return {
        clerkUserId: clerkUser.id,
        fullName,
        email: primaryEmail,
        effectiveRole,
        isGlobalAdmin,
        isAppUser,
        isBlocked,
        blockedReason: accessControlRecord?.blockedReason ?? null,
        blockedAt: accessControlRecord?.blockedAt ? accessControlRecord.blockedAt.toISOString() : null,
        localRole,
        idVendedor: localRoleRecord?.idVendedor ?? null,
        nombreEmpresa: localRoleRecord?.nombreEmpresa ?? null,
        adminPhone: null,
      };
    });

  // 4. FILTRO: el admin global ve TODOS los usuarios de la app (delivery,
  // logistic_admin y admin_delivery), y se excluyen los que no son de la app (buyers).
  const users = allMappedUsers.filter((user) => user.isAppUser);

  return {
    users,
    totalUsers: users.length,
    globalAdminCount: allMappedUsers.filter((u) => u.isGlobalAdmin).length,
    clerkUnavailable,
  };
}