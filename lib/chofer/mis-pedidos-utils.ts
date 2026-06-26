import { normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export type PedidoStatus = "ready" | "en_camino" | "entregado" | "cancelado" | "revision";

export type PedidoForSearch = {
  cliente: string;
  direccion: string;
  zona: string;
  estado: PedidoStatus;
};

export function filterPedidos<T extends PedidoForSearch>(pedidos: T[], searchTerm: string, filterStatus: string | null): T[] {
  const search = normalizeSearchValue(searchTerm);

  return (pedidos ?? []).filter((pedido) => {
    if (filterStatus && pedido.estado !== filterStatus) return false;
    if (search && !normalizeSearchValue(pedido.cliente).includes(search)) return false;
    return true;
  });
}

export function isPedidoStatus(value: string | null): value is PedidoStatus {
  return value === "ready" || value === "en_camino" || value === "entregado" || value === "cancelado" || value === "revision";
}

export type SearchParamsInput = {
  q?: string;
  status?: string;
  page?: string;
};

export function buildQueryHref(basePath: string, params: SearchParamsInput) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page) sp.set("page", params.page);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function parseMisPedidosFilters(searchParams: SearchParamsInput) {
  const searchTerm = searchParams.q ?? "";
  const status = isPedidoStatus(searchParams.status ?? null) ? searchParams.status : null;
  const currentPage = parsePage(searchParams.page);

  return { searchTerm, status, currentPage };
}
