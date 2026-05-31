const CLERK_API_BASE = "https://api.clerk.com";

export const DEFAULT_ROLE = "delivery";
export const ADMIN_DELIVERY_ROLE = "admin_delivery";
export const LOGISTIC_ADMIN_ROLE = "logistic_admin";
export const SELLER_ROLE = "seller";
export const ALLOWED_LOCAL_ROLES = [DEFAULT_ROLE, LOGISTIC_ADMIN_ROLE, SELLER_ROLE] as const;
export const MANAGED_ROLES = [DEFAULT_ROLE, LOGISTIC_ADMIN_ROLE, ADMIN_DELIVERY_ROLE] as const;

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
    return [...new Set(roles.filter((role) => role !== DEFAULT_ROLE || !hasAdminRole))];
  }

  if (hasSeller) {
    return [...new Set([...roles.filter((role) => role !== DEFAULT_ROLE), LOGISTIC_ADMIN_ROLE])];
  }

  if (roles.includes(LOGISTIC_ADMIN_ROLE) && roles.includes(DEFAULT_ROLE)) {
    return roles.filter((role) => role !== DEFAULT_ROLE);
  }

  if (!hasManagedRole) {
    return [...roles, DEFAULT_ROLE];
  }

  return roles;
}

export function resolveRolesFromSources({
  dbRoles,
  clerkRoles = [],
  hasAdminDelivery = false,
}: {
  dbRoles: string[];
  clerkRoles?: string[];
  hasAdminDelivery?: boolean;
}): string[] {
  const sourceRoles = dbRoles.length > 0 ? dbRoles : clerkRoles;
  return getEffectiveRoles([...(hasAdminDelivery ? [ADMIN_DELIVERY_ROLE] : []), ...sourceRoles]);
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
      return normalizeRoles((source as Record<string, unknown>).role);
    }),
    ...normalizeRoles(claims.role),
    ...normalizeRoles(claims.org_role),
  ];

  return getEffectiveRoles(claimRoles);
}

export async function fetchClerkRoles(userId: string): Promise<string[]> {
  const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;

  if (!secretKey) {
    return [];
  }

  try {
    const response = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const user = await response.json();
    const metadata = user.public_metadata ?? user.publicMetadata ?? {};
    return normalizeRoles(metadata.role);
  } catch {
    return [];
  }
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