import type { LogisticAdminViewData } from "./data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export type Zona = LogisticAdminViewData["zonas"][number] & { idVendedor?: number };
export type ZonaFueraCatalogo = LogisticAdminViewData["zonasFueraCatalogo"][number];

export type SearchParamsInput = {
  query?: string | string[];
  page?: string | string[];
};

export type ZonasFilterState = {
  searchQuery: string;
  requestedPage: number;
};

export function parseZonasFilters(query: SearchParamsInput): ZonasFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";

  return {
    searchQuery: searchValue,
    requestedPage: parsePage(query.page),
  };
}

export function filterZonas(zonas: Zona[], searchQuery: string) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  if (!normalizedQuery) {
    return zonas;
  }

  return zonas.filter((zona) => normalizeSearchValue(zona.zona).includes(normalizedQuery));
}

export function buildZonasQueryHref(
  nextValues: { query?: string; page?: number },
  currentState: ZonasFilterState,
  basePath = "/dashboard/logistic-admin/zonas"
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? currentState.searchQuery;
  const nextPage = nextValues.page ?? currentState.requestedPage;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function statCardClass(kind: "blue" | "emerald" | "amber" | "slate") {
  switch (kind) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}
