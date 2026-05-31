import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import LogisticAdminPedidosUi from "../../logistic-admin/pedidos/ui";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";

const pageSize = 8;
const basePath = "/dashboard/admin-delivery";

const statusOptions: OrderStatus[] = ["ready", "en_camino", "entregado", "cancelado", "revision"];
const searchOptions = ["cliente", "calle", "chofer", "zona"] as const;

type SearchBy = (typeof searchOptions)[number];

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return typeof value === "string" && statusOptions.includes(value as OrderStatus);
}

function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
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

    if (normalizedQuery) {
      const haystackByField = {
        cliente: order.cliente,
        calle: order.direccion,
        chofer: order.assignedToChoferName ?? "",
        zona: order.zona,
      } as const;

      const haystack = normalizeSearchValue(haystackByField[searchBy]);
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export default async function AdminDeliveryPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; searchBy?: string | string[]; quickFilter?: string | string[]; chofer?: string | string[]; assign?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const ordersKey = data.orders.map((order) => `${order.idPedido}:${order.status}:${order.assignedToChoferId ?? "none"}`).join("|");
  const searchValueFromQuery = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const legacyChoferValue = Array.isArray(query.chofer) ? query.chofer[0] : query.chofer ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const quickFilterValue = Array.isArray(query.quickFilter) ? query.quickFilter[0] : query.quickFilter;
  const assignValue = Array.isArray(query.assign) ? query.assign[0] : query.assign;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const searchBy: SearchBy = isSearchBy(searchByValue)
    ? searchByValue
    : legacyChoferValue
      ? "chofer"
      : "cliente";
  const searchValue = searchValueFromQuery || (legacyChoferValue && searchBy === "chofer" ? legacyChoferValue : "");
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
  const assignmentFilter: "todos" | "sin_asignar" =
    quickFilterValue === "sin_asignar" || assignValue === "sin_asignar" ? "sin_asignar" : "todos";
  const requestedPage = parsePage(query.page);

  const filteredOrders = filterOrders(data.orders, searchValue, searchBy, statusFilter, assignmentFilter);
  const totalFilteredOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
    }

    if (searchBy !== "cliente") {
      params.set("searchBy", searchBy);
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

    const nextUrl = params.toString() ? `${basePath}/pedidos?${params.toString()}` : `${basePath}/pedidos`;
    redirect(nextUrl);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel global</p>
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
        searchBy={searchBy}
        assignmentFilter={assignmentFilter}
        statusFilter={statusFilter}
        page={safePage}
        totalPages={totalPages}
        totalFilteredOrders={totalFilteredOrders}
        basePath={basePath}
      />
    </div>
  );
}
