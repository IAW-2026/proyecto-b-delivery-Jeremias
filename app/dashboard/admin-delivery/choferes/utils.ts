import type { LogisticAdminViewData } from "../../logistic-admin/data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions = ["activo", "inactivo", "pendiente", "rechazado"] as const;

export type Chofer = LogisticAdminViewData["choferes"][number];
export type ChoferStatus = (typeof statusOptions)[number];

export type SearchParamsInput = {
  query?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type ChoferesFilterState = {
  searchQuery: string;
  statusFilter: "todos" | ChoferStatus;
  requestedPage: number;
};

export function isChoferStatus(value: string | undefined): value is ChoferStatus {
  return typeof value === "string" && statusOptions.includes(value as ChoferStatus);
}

export function parseChoferesFilters(query: SearchParamsInput): ChoferesFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    statusFilter:
      statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos",
    requestedPage: parsePage(query.page),
  };
}

export function filterChoferes(
  choferes: Chofer[],
  searchQuery: string,
  statusFilter: "todos" | ChoferStatus,
  vendorNames?: Record<number, string>
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return choferes.filter((chofer) => {
    if (statusFilter !== "todos" && chofer.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystacks = [
      chofer.nombre,
      chofer.telefono ?? "",
      vendorNames?.[chofer.idVendedor] ?? "",
    ].map((s) => normalizeSearchValue(s));
    return haystacks.some((h) => h.includes(normalizedQuery));
  });
}
