import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import { pageSize, normalizeSearchValue, parsePage } from "@/lib/shared/utils";

export const statusOptions: OrderStatus[] = ["ready", "en_camino", "entregado", "cancelado", "revision"];

export type SearchParamsInput = {
  query?: string | string[];
  quickFilter?: string | string[];
  assign?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

export type PedidosFilterState = {
  searchQuery: string;
  statusFilter: "todos" | OrderStatus;
  assignmentFilter: "todos" | "sin_asignar";
  requestedPage: number;
};

export function isOrderStatus(value: string | undefined): value is OrderStatus {
  return typeof value === "string" && statusOptions.includes(value as OrderStatus);
}

export function parsePedidosFilters(query: SearchParamsInput): PedidosFilterState {
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const quickFilterValue = Array.isArray(query.quickFilter) ? query.quickFilter[0] : query.quickFilter;
  const assignValue = Array.isArray(query.assign) ? query.assign[0] : query.assign;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;

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
    searchQuery: searchValue,
    statusFilter,
    assignmentFilter,
    requestedPage: parsePage(query.page),
  };
}

export function filterOrders(
  orders: LogisticOrder[],
  searchQuery: string,
  statusFilter: "todos" | OrderStatus,
  assignmentFilter: "todos" | "sin_asignar",
  vendorNames?: Record<number, string>
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return orders.filter((order) => {
    if (statusFilter !== "todos" && order.status !== statusFilter) {
      return false;
    }

    if (assignmentFilter === "sin_asignar" && order.assignedToChoferId !== null) {
      return false;
    }

    if (normalizedQuery) {
      const haystacks = [
        order.cliente,
        order.direccion,
        order.assignedToChoferName ?? "",
        order.zona,
        order.idVendedor ? vendorNames?.[order.idVendedor] ?? "" : "",
      ].map((s) => normalizeSearchValue(s));

      if (!haystacks.some((h) => h.includes(normalizedQuery))) {
        return false;
      }
    }

    return true;
  });
}
