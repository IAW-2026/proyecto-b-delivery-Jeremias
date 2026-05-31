import type { LogisticAdminViewData } from "../../logistic-admin/data";

export const pageSize = 8;

export const statusOptions = ["activo", "inactivo", "pendiente", "rechazado"] as const;
export const searchOptions = ["nombre", "telefono"] as const;

export type Chofer = LogisticAdminViewData["choferes"][number];
export type ChoferStatus = (typeof statusOptions)[number];
export type SearchBy = (typeof searchOptions)[number];

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
  return typeof value === "string" && statusOptions.includes(value as ChoferStatus);
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
}

export function parseChoferesFilters(query: SearchParamsInput): ChoferesFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    searchBy: isSearchBy(searchByValue) ? searchByValue : "nombre",
    statusFilter:
      statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos",
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
