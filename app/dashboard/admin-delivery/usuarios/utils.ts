import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";

export const searchOptions = [
  { value: "nombre", label: "Nombre", placeholder: "Buscar por nombre" },
  { value: "email", label: "Correo", placeholder: "Buscar por correo" },
  { value: "clerkUserId", label: "ID de Clerk", placeholder: "Buscar por ID de Clerk" },
] as const;

export const editableRoles = ["delivery", "logistic_admin"] as const;

export type UserSearchBy = (typeof searchOptions)[number]["value"];
export type UserFilter = "all" | "active" | "blocked" | "delivery" | "logistic_admin";

type FilterValues = {
  query: string;
  searchBy: UserSearchBy;
  filter: UserFilter;
};

export function isSearchBy(value: string | null): value is UserSearchBy {
  return typeof value === "string" && searchOptions.some((option) => option.value === value);
}

export function isUserFilter(value: string | null): value is UserFilter {
  return value === "all" || value === "active" || value === "blocked" || value === "delivery" || value === "logistic_admin";
}

export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parseUsersFilters(searchParams: { get: (name: string) => string | null }): FilterValues {
  const query = searchParams.get("query") ?? "";
  const searchBy = isSearchBy(searchParams.get("searchBy")) ? (searchParams.get("searchBy") as UserSearchBy) : "nombre";
  const filter = isUserFilter(searchParams.get("filter")) ? (searchParams.get("filter") as UserFilter) : "all";

  return { query, searchBy, filter };
}

export function buildUsersQueryHref(pathname: string, values: FilterValues) {
  const params = new URLSearchParams();
  const trimmedQuery = values.query.trim();

  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  }

  if (values.searchBy !== "nombre") {
    params.set("searchBy", values.searchBy);
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
  const normalizedRole = normalizeStoredRole(user.localRole);
  return editableRoles.includes(normalizedRole as (typeof editableRoles)[number]) ? normalizedRole : "delivery";
}

export function filterUsers(users: AdminDeliveryUserRow[], values: FilterValues) {
  const normalizedQuery = normalizeSearchValue(values.query.trim());

  return users.filter((user) => {
    const searchCandidate =
      values.searchBy === "email"
        ? user.email
        : values.searchBy === "clerkUserId"
          ? user.clerkUserId
          : user.fullName;

    const matchesQuery = normalizedQuery.length === 0 || normalizeSearchValue(searchCandidate).includes(normalizedQuery);
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
