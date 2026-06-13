export const DEFAULT_ROLE = "delivery";
export const ADMIN_DELIVERY_ROLE = "admin_delivery";
export const LOGISTIC_ADMIN_ROLE = "logistic_admin";
const SELLER_ROLE = "seller";
export const ALLOWED_LOCAL_ROLES = [DEFAULT_ROLE, LOGISTIC_ADMIN_ROLE] as const;
const MANAGED_ROLES = [DEFAULT_ROLE, LOGISTIC_ADMIN_ROLE, ADMIN_DELIVERY_ROLE] as const;

export function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

export function getEffectiveRoles(rawRoles: string[]): string[] {
  const roles = [...new Set(rawRoles)];
  const hasSeller = roles.includes(SELLER_ROLE);
  const hasManagedRole = MANAGED_ROLES.some((managedRole) => roles.includes(managedRole));
  const hasAdminRole = roles.includes(LOGISTIC_ADMIN_ROLE) || hasSeller || roles.includes(ADMIN_DELIVERY_ROLE);

  if (roles.includes(ADMIN_DELIVERY_ROLE)) {
    return [...new Set(roles.filter((role) => role !== DEFAULT_ROLE || !hasAdminRole).filter((role) => role !== SELLER_ROLE))];
  }

  if (hasSeller) {
    return [...new Set([...roles.filter((role) => role !== DEFAULT_ROLE && role !== SELLER_ROLE), LOGISTIC_ADMIN_ROLE])];
  }

  if (roles.includes(LOGISTIC_ADMIN_ROLE) && roles.includes(DEFAULT_ROLE)) {
    return roles.filter((role) => role !== DEFAULT_ROLE);
  }

  if (!hasManagedRole) {
    return [...roles, DEFAULT_ROLE];
  }

  return roles.filter((role) => role !== SELLER_ROLE);
}

export function resolveRolesFromClaims(sessionClaims: unknown): string[] {
  if (!sessionClaims || typeof sessionClaims !== "object") {
    return [];
  }

  const claims = sessionClaims as Record<string, unknown>;
  const claimSources = [
    claims.publicMetadata,
    claims.metadata,
    claims.unsafeMetadata,
    claims.org_metadata,
  ];

  const claimRoles = [
    ...claimSources.flatMap((source) => {
      if (!source || typeof source !== "object") return [];
      const record = source as Record<string, unknown>;
      // `role` es la clave canónica; `roles` es legacy (tolerada en transición)
      return [...normalizeRoles(record.role), ...normalizeRoles(record.roles)];
    }),
    ...normalizeRoles(claims.role),
    ...normalizeRoles(claims.roles),
    ...normalizeRoles(claims.org_role),
  ];

  return getEffectiveRoles(claimRoles);
}

export async function syncClerkRoleMetadata(userId: string, role: string): Promise<boolean> {
  if (!role) return false;

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    // Fetch current user to preserve other metadata
    let current: any = {};
    try {
      current = await client.users.getUser(userId);
    } catch {
      current = {};
    }

    const metadata = (current.publicMetadata ?? current.public_metadata ?? {}) as Record<string, unknown>;

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...metadata,
        role: [role],
        // Eliminar la clave legacy `roles` para evitar roles fantasma
        roles: null,
      },
    });

    return true;
  } catch (err) {
    console.error("Error syncing Clerk role via SDK:", err);
    return false;
  }
}

export async function revokeAllClerkSessions(userId: string): Promise<boolean> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const list = await client.sessions.getSessionList({ userId });
    const sessions = Array.isArray((list as any).data) ? (list as any).data : (list as any).sessions ?? (list as any).data ?? [];

    for (const s of sessions) {
      const sid = s.id ?? s.session_id ?? s.sid;
      if (!sid) continue;
      try {
        await client.sessions.revokeSession(sid);
      } catch (e) {
        // best-effort
      }
    }

    return true;
  } catch (err) {
    console.error("Error revoking Clerk sessions via SDK:", err);
    return false;
  }
}