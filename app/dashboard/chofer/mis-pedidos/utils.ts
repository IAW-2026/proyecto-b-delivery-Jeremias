import { normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const searchOptions = ["cliente", "direccion", "zona"] as const;

export type SearchBy = (typeof searchOptions)[number];

export type PedidoStatus = "ready" | "en_camino" | "entregado" | "cancelado" | "revision";

export type PedidoForSearch = {
  cliente: string;
  direccion: string;
  zona: string;
  estado: PedidoStatus;
};

export type SearchParamsInput = {
  query?: string | string[];
  searchBy?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export function isPedidoStatus(value: string): value is PedidoStatus {
  return value === "ready" || value === "en_camino" || value === "entregado" || value === "cancelado" || value === "revision";
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
}

export function filterPedidos<T extends PedidoForSearch>(pedidos: T[], searchQuery: string, searchBy: SearchBy, statusFilter: "todos" | PedidoStatus) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return pedidos.filter((pedido) => {
    if (statusFilter !== "todos" && pedido.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystackByField = {
      cliente: pedido.cliente,
      direccion: pedido.direccion,
      zona: pedido.zona,
    } as const;

    const haystack = normalizeSearchValue(haystackByField[searchBy]);
    return haystack.includes(normalizedQuery);
  });
}

export function buildQueryHref(
  nextValues: { query?: string; searchBy?: SearchBy; status?: "todos" | PedidoStatus; page?: number },
  currentQuery: string,
  currentSearchBy: SearchBy,
  currentStatus: "todos" | PedidoStatus,
  currentPage: number,
  basePath = "/dashboard/chofer/mis-pedidos"
) {
  const params = new URLSearchParams();
  const query = nextValues.query ?? currentQuery;
  const searchBy = nextValues.searchBy ?? currentSearchBy;
  const status = nextValues.status ?? currentStatus;
  const page = nextValues.page ?? currentPage;

  if (query) params.set("query", query);
  if (searchBy !== "cliente") params.set("searchBy", searchBy);
  if (status !== "todos") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}