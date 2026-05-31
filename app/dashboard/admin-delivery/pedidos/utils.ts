import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";

export const pageSize = 8;

export const statusOptions: OrderStatus[] = ["ready", "en_camino", "entregado", "cancelado", "revision"];
export const searchOptions = ["cliente", "calle", "chofer", "zona"] as const;

export type SearchBy = (typeof searchOptions)[number];

export type SearchParamsInput = {
  query?: string | string[];
  searchBy?: string | string[];
  quickFilter?: string | string[];
  chofer?: string | string[];
  assign?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type PedidosFilterState = {
  searchQuery: string;
  searchBy: SearchBy;
  statusFilter: "todos" | OrderStatus;
  assignmentFilter: "todos" | "sin_asignar";
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

export function isOrderStatus(value: string | undefined): value is OrderStatus {
  return typeof value === "string" && statusOptions.includes(value as OrderStatus);
}

export function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
}

export function parsePedidosFilters(query: SearchParamsInput): PedidosFilterState {
  const searchValueFromQuery = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const legacyChoferValue = Array.isArray(query.chofer) ? query.chofer[0] : query.chofer ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const quickFilterValue = Array.isArray(query.quickFilter) ? query.quickFilter[0] : query.quickFilter;
  const assignValue = Array.isArray(query.assign) ? query.assign[0] : query.assign;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

  const searchBy: SearchBy = isSearchBy(searchByValue) ? searchByValue : legacyChoferValue ? "chofer" : "cliente";
  const searchQuery = searchValueFromQuery || (legacyChoferValue && searchBy === "chofer" ? legacyChoferValue : "");
  const statusFilter: "todos" | OrderStatus =
    quickFilterValue === "sin_asignar"
      ? "todos"
      : quickFilterValue !== undefined && isOrderStatus(quickFilterValue)
        ? quickFilterValue
        : statusValue === undefined || statusValue === "todos"
          ? "todos"
          : isOrderStatus(statusValue)
            ? statusValue
            : "todos";
  const assignmentFilter: "todos" | "sin_asignar" = quickFilterValue === "sin_asignar" || assignValue === "sin_asignar" ? "sin_asignar" : "todos";

  return {
    searchQuery,
    searchBy,
    statusFilter,
    assignmentFilter,
    requestedPage: parsePage(query.page),
  };
}

export function filterOrders(
  orders: LogisticOrder[],
  searchQuery: string,
  searchBy: SearchBy,
  statusFilter: "todos" | OrderStatus,
  assignmentFilter: "todos" | "sin_asignar"
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return orders.filter((order) => {
    if (statusFilter !== "todos" && order.status !== statusFilter) {
      return false;
    }

    if (assignmentFilter === "sin_asignar" && order.assignedToChoferId !== null) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystackByField = {
      cliente: order.cliente,
      calle: order.direccion,
      chofer: order.assignedToChoferName ?? "",
      zona: order.zona,
    } as const;

    return normalizeSearchValue(haystackByField[searchBy]).includes(normalizedQuery);
  });
}
