import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import AdminDeliveryPedidosUi from "./ui";
import { filterOrders, pageSize, parsePedidosFilters, type SearchParamsInput } from "./utils";

const basePath = "/dashboard/admin-delivery";

export default async function AdminDeliveryPedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, searchBy, statusFilter, assignmentFilter, requestedPage } = parsePedidosFilters(query);

  const filteredOrders = filterOrders(data.orders, searchQuery, searchBy, statusFilter, assignmentFilter);
  const totalFilteredOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
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

  const ordersKey = [
    paginatedOrders.map((order) => `${order.idPedido}:${order.status}:${order.assignedToChoferId ?? "none"}`).join("|"),
    searchQuery,
    searchBy,
    assignmentFilter,
    statusFilter,
  ].join("|");

  return (
    <AdminDeliveryPedidosUi
      key={ordersKey}
      orders={paginatedOrders}
      choferes={data.choferes}
      searchQuery={searchQuery}
      searchBy={searchBy}
      assignmentFilter={assignmentFilter}
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredOrders={totalFilteredOrders}
      basePath={basePath}
    />
  );
}
