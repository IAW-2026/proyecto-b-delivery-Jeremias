import type { LogisticAdminViewData } from "./data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions = [
  { value: "activo", label: "Activos" },
  { value: "pausado", label: "Pausados" },
] as const;

export type Vehiculo = LogisticAdminViewData["vehiculos"][number];
export type VehiculoStatus = (typeof statusOptions)[number]["value"];

export type SearchParamsInput = {
  query?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type VehiculosFilterState = {
  searchQuery: string;
  statusFilter: "todos" | VehiculoStatus;
  requestedPage: number;
};

export function isVehiculoStatus(value: string | undefined): value is VehiculoStatus {
  return typeof value === "string" && statusOptions.some((option) => option.value === value);
}

export function parseVehiculosFilters(query: SearchParamsInput): VehiculosFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    statusFilter: statusValue === undefined || statusValue === "todos" ? "todos" : isVehiculoStatus(statusValue) ? statusValue : "todos",
    requestedPage: parsePage(query.page),
  };
}

export function filterVehiculos(
  vehiculos: Vehiculo[],
  searchQuery: string,
  statusFilter: "todos" | VehiculoStatus,
  vendorNames?: Record<number, string>
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return vehiculos.filter((vehiculo) => {
    if (statusFilter !== "todos" && vehiculo.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystacks = [
      vehiculo.patente,
      vehiculo.tipo,
      vendorNames?.[vehiculo.idVendedor] ?? "",
    ].map((s) => normalizeSearchValue(s));
    return haystacks.some((h) => h.includes(normalizedQuery));
  });
}

export function buildVehiculosQueryHref(
  nextValues: { query?: string; status?: "todos" | VehiculoStatus; page?: number },
  currentState: VehiculosFilterState,
  basePath = "/dashboard/logistic-admin/vehiculos"
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? currentState.searchQuery;
  const nextStatus = nextValues.status ?? currentState.statusFilter;
  const nextPage = nextValues.page ?? currentState.requestedPage;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
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
