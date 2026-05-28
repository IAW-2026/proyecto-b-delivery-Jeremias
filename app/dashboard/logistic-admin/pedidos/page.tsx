import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import LogisticAdminPedidosUi from "./ui";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";

const pageSize = 8;

const statusOptions: OrderStatus[] = ["ready", "asignado", "en_camino", "entregado", "cancelado", "revision"];

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return typeof value === "string" && statusOptions.includes(value as OrderStatus);
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function filterOrders(
  orders: LogisticOrder[],
  searchQuery: string,
  choferQuery: string,
  statusFilter: "todos" | OrderStatus,
  assignmentFilter: "todos" | "sin_asignar"
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());
  const normalizedChoferQuery = normalizeSearchValue(choferQuery.trim());

  return orders.filter((order) => {
    if (statusFilter !== "todos" && order.status !== statusFilter) {
      return false;
    }

    if (assignmentFilter === "sin_asignar" && order.assignedToChoferId !== null) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = normalizeSearchValue([order.cliente, order.direccion].join(" "));
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    if (normalizedChoferQuery) {
      const choferHaystack = normalizeSearchValue(order.assignedToChoferName ?? "");
      if (!choferHaystack.includes(normalizedChoferQuery)) {
        return false;
      }
    }

    return true;
  });
}

export default async function LogisticAdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; chofer?: string | string[]; assign?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const ordersKey = data.orders.map((order) => `${order.idPedido}:${order.status}:${order.assignedToChoferId ?? "none"}`).join("|");
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const choferValue = Array.isArray(query.chofer) ? query.chofer[0] : query.chofer ?? "";
  const assignValue = Array.isArray(query.assign) ? query.assign[0] : query.assign;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const statusFilter: "todos" | OrderStatus = statusValue === undefined || statusValue === "todos" ? "todos" : isOrderStatus(statusValue) ? statusValue : "todos";
  const assignmentFilter: "todos" | "sin_asignar" = assignValue === "sin_asignar" ? "sin_asignar" : "todos";
  const requestedPage = parsePage(query.page);

  const filteredOrders = filterOrders(data.orders, searchValue, choferValue, statusFilter, assignmentFilter);
  const totalFilteredOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
    }

    if (choferValue.trim()) {
      params.set("chofer", choferValue.trim());
    }

    if (assignmentFilter !== "todos") {
      params.set("assign", assignmentFilter);
    }

    if (statusFilter !== "todos") {
      params.set("status", statusFilter);
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `/dashboard/logistic-admin/pedidos?${params.toString()}` : "/dashboard/logistic-admin/pedidos";
    redirect(nextUrl);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Pedidos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vista completa de pedidos para asignación, seguimiento operativo y control de estado.
        </p>
      </header>

      <LogisticAdminPedidosUi
        key={ordersKey}
        orders={paginatedOrders}
        choferes={data.choferes}
        searchQuery={searchValue}
        choferQuery={choferValue}
        assignmentFilter={assignmentFilter}
        statusFilter={statusFilter}
        page={safePage}
        totalPages={totalPages}
        totalFilteredOrders={totalFilteredOrders}
      />
    </div>
  );
}
