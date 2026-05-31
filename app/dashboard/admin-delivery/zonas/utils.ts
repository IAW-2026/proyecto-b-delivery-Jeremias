import type { LogisticAdminViewData } from "../../logistic-admin/data";

export const pageSize = 8;

export type Zona = LogisticAdminViewData["zonas"][number];

export type SearchParamsInput = {
  query?: string | string[];
  page?: string | string[];
};

export type ZonasFilterState = {
  searchQuery: string;
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
