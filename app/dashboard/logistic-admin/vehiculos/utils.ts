import type { LogisticAdminViewData } from "../data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions = [
  { value: "activo", label: "Activos" },
  { value: "pausado", label: "Pausados" },
] as const;

export const searchOptions = [
  { value: "patente", label: "Patente", placeholder: "Buscar por patente" },
  { value: "tipo", label: "Tipo", placeholder: "Buscar por tipo" },
] as const;

export type Vehiculo = LogisticAdminViewData["vehiculos"][number];
export type VehiculoStatus = (typeof statusOptions)[number]["value"];
export type SearchBy = (typeof searchOptions)[number]["value"];

export type SearchParamsInput = {
  query?: string | string[];
  searchBy?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type VehiculosFilterState = {
  searchQuery: string;
  searchBy: SearchBy;
  statusFilter: "todos" | VehiculoStatus;
  requestedPage: number;
};

export function isVehiculoStatus(value: string | undefined): value is VehiculoStatus {
  return typeof value === "string" && statusOptions.some((option) => option.value === value);
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.some((option) => option.value === value);
}

export function parseVehiculosFilters(query: SearchParamsInput): VehiculosFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    searchBy: isSearchBy(searchByValue) ? searchByValue : "patente",
    statusFilter: statusValue === undefined || statusValue === "todos" ? "todos" : isVehiculoStatus(statusValue) ? statusValue : "todos",
    requestedPage: parsePage(query.page),
  };
}

export function filterVehiculos(vehiculos: Vehiculo[], searchQuery: string, searchBy: SearchBy, statusFilter: "todos" | VehiculoStatus) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return vehiculos.filter((vehiculo) => {
    if (statusFilter !== "todos" && vehiculo.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue(searchBy === "tipo" ? vehiculo.tipo : vehiculo.patente);
    return haystack.includes(normalizedQuery);
  });
}

export function buildVehiculosQueryHref(
  nextValues: { query?: string; searchBy?: SearchBy; status?: "todos" | VehiculoStatus; page?: number },
  currentState: VehiculosFilterState,
  basePath = "/dashboard/logistic-admin/vehiculos"
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? currentState.searchQuery;
  const nextSearchBy = nextValues.searchBy ?? currentState.searchBy;
  const nextStatus = nextValues.status ?? currentState.statusFilter;
  const nextPage = nextValues.page ?? currentState.requestedPage;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
  }

  if (nextSearchBy !== "patente") {
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