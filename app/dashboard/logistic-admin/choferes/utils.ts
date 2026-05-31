import type { LogisticAdminViewData } from "../data";

export const pageSize = 8;

export const statusOptions = [
  { value: "activo", label: "Activos" },
  { value: "inactivo", label: "Inactivos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "rechazado", label: "Rechazados" },
] as const;

export const searchOptions = [
  { value: "nombre", label: "Nombre", placeholder: "Buscar por nombre" },
  { value: "telefono", label: "Teléfono", placeholder: "Buscar por teléfono" },
] as const;

export type ChoferStatus = (typeof statusOptions)[number]["value"];
export type SearchBy = (typeof searchOptions)[number]["value"];

export type SearchParamsInput = {
  query?: string | string[];
  searchBy?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type ChoferesFilterState = {
  searchQuery: string;
  searchBy: SearchBy;
  statusFilter: "todos" | ChoferStatus;
  requestedPage: number;
};

export type Chofer = LogisticAdminViewData["choferes"][number];

export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function isChoferStatus(value: string | undefined): value is ChoferStatus {
  return typeof value === "string" && statusOptions.some((option) => option.value === value);
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.some((option) => option.value === value);
}

export function parseChoferesFilters(query: SearchParamsInput): ChoferesFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    searchBy: isSearchBy(searchByValue) ? searchByValue : "nombre",
    statusFilter: statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos",
    requestedPage: parsePage(query.page),
  };
}

export function filterChoferes(choferes: Chofer[], searchQuery: string, searchBy: SearchBy, statusFilter: "todos" | ChoferStatus) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return choferes.filter((chofer) => {
    if (statusFilter !== "todos" && chofer.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue(searchBy === "telefono" ? chofer.telefono ?? "" : chofer.nombre);
    return haystack.includes(normalizedQuery);
  });
}

export function buildChoferesQueryHref(
  nextValues: { query?: string; searchBy?: SearchBy; status?: "todos" | ChoferStatus; page?: number },
  currentState: ChoferesFilterState,
  basePath = "/dashboard/logistic-admin/choferes"
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? currentState.searchQuery;
  const nextSearchBy = nextValues.searchBy ?? currentState.searchBy;
  const nextStatus = nextValues.status ?? currentState.statusFilter;
  const nextPage = nextValues.page ?? currentState.requestedPage;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
  }

  if (nextSearchBy !== "nombre") {
    params.set("searchBy", nextSearchBy);
  }

  if (nextStatus !== "todos") {
    params.set("status", nextStatus);
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}