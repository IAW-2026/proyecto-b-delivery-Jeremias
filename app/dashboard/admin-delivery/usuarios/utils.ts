import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";
import { normalizeSearchValue } from "@/lib/shared/utils";

export const editableRoles = ["delivery", "logistic_admin"] as const;

export type UserFilter = "all" | "active" | "blocked" | "delivery" | "logistic_admin";

type FilterValues = {
  query: string;
  filter: UserFilter;
};

export function isUserFilter(value: string | null): value is UserFilter {
  return value === "all" || value === "active" || value === "blocked" || value === "delivery" || value === "logistic_admin";
}

export function parseUsersFilters(searchParams: { get: (name: string) => string | null }): FilterValues {
  const query = searchParams.get("query") ?? "";
  const filter = isUserFilter(searchParams.get("filter")) ? (searchParams.get("filter") as UserFilter) : "all";

  return { query, filter };
}

export function buildUsersQueryHref(pathname: string, values: FilterValues) {
  const params = new URLSearchParams();
  const trimmedQuery = values.query.trim();

  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  }

  if (values.filter !== "all") {
    params.set("filter", values.filter);
  }

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function normalizeStoredRole(role: string) {
  return role === "seller" ? "logistic_admin" : role;
}

export function roleLabel(role: string) {
  if (role === "blocked") return "Bloqueado";
  if (role === "admin_delivery") return "Admin delivery";
  if (role === "logistic_admin") return "Logistic admin";
  if (role === "delivery") return "Delivery";
  return role;
}

export function getDisplayRole(user: AdminDeliveryUserRow) {
  if (user.localRole && user.localRole !== "Sin rol") {
    return normalizeStoredRole(user.localRole);
  }

  return normalizeStoredRole(user.effectiveRole);
}

export function getInitialRoleDraft(user: AdminDeliveryUserRow) {
  // Preferimos el rol local; si no es editable (p. ej. "Sin rol"),
  // caemos al rol efectivo de Clerk para no degradar accidentalmente a delivery.
  const candidates = [normalizeStoredRole(user.localRole), normalizeStoredRole(user.effectiveRole)];
  const match = candidates.find((role) => editableRoles.includes(role as (typeof editableRoles)[number]));
  return match ?? "delivery";
}

export function filterUsers(users: AdminDeliveryUserRow[], values: FilterValues) {
  const normalizedQuery = normalizeSearchValue(values.query.trim());

  return users.filter((user) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [user.fullName, user.email, user.clerkUserId, user.nombreEmpresa ?? ""]
        .map((s) => normalizeSearchValue(s))
        .some((s) => s.includes(normalizedQuery));

    const localRole = normalizeStoredRole(user.localRole);

    const matchesFilter =
      values.filter === "all" ||
      (values.filter === "active" && !user.isBlocked) ||
      (values.filter === "blocked" && user.isBlocked) ||
      (values.filter === "delivery" && localRole === "delivery") ||
      (values.filter === "logistic_admin" && localRole === "logistic_admin");

    return matchesQuery && matchesFilter;
  });
}
