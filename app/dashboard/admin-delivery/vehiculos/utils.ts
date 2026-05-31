import type { LogisticAdminViewData } from "../../logistic-admin/data";

export const pageSize = 8;

export const statusOptions = ["activo", "pausado"] as const;
export const searchOptions = ["patente", "tipo"] as const;

export type Vehiculo = LogisticAdminViewData["vehiculos"][number];
export type VehiculoStatus = (typeof statusOptions)[number];
export type SearchBy = (typeof searchOptions)[number];

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

export function isVehiculoStatus(value: string | undefined): value is VehiculoStatus {
  return typeof value === "string" && statusOptions.includes(value as VehiculoStatus);
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
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
