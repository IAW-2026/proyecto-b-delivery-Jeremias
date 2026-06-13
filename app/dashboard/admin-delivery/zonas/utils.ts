import type { LogisticAdminViewData } from "../../logistic-admin/data";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export type Zona = LogisticAdminViewData["zonas"][number];

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

export function filterZonas(zonas: Zona[], searchQuery: string, vendorNames?: Record<number, string>) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  if (!normalizedQuery) {
    return zonas;
  }

  return zonas.filter((zona) => {
    if (normalizeSearchValue(zona.zona).includes(normalizedQuery)) return true;
    if (vendorNames && zona.empresas) {
      for (const e of zona.empresas) {
        const empresa = normalizeSearchValue(vendorNames[Number(e)] ?? "");
        if (empresa.includes(normalizedQuery)) return true;
      }
    }
    return false;
  });
}
