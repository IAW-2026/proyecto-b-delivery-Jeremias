import type { LogisticAdminViewData } from "../data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions = [
  { value: "activo", label: "Activos" },
  { value: "inactivo", label: "Inactivos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "rechazado", label: "Rechazados" },
] as const;

export type ChoferStatus = (typeof statusOptions)[number]["value"];

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

export type Chofer = LogisticAdminViewData["choferes"][number];

export function isChoferStatus(value: string | undefined): value is ChoferStatus {
  return typeof value === "string" && statusOptions.some((option) => option.value === value);
}

export function parseChoferesFilters(query: SearchParamsInput): ChoferesFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  return {
    searchQuery: searchValue,
    statusFilter: statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos",
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

export function buildChoferesQueryHref(
  nextValues: { query?: string; status?: "todos" | ChoferStatus; page?: number },
  currentState: ChoferesFilterState,
  basePath = "/dashboard/logistic-admin/choferes"
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