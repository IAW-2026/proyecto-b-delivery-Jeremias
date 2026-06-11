import type { LogisticAdminViewData } from "../../logistic-admin/data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions = ["activo", "pausado"] as const;

export type Vehiculo = LogisticAdminViewData["vehiculos"][number];
export type VehiculoStatus = (typeof statusOptions)[number];

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
  return typeof value === "string" && statusOptions.includes(value as VehiculoStatus);
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
