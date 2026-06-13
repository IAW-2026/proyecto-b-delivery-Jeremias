import { redirect } from "next/navigation";
import { getLogisticAdminData } from "@/lib/logistic-admin/data";
import LogisticAdminPedidosUi from "@/components/logistic-admin/pedidos-ui";
import { pageSize } from "@/lib/shared/utils";
import { parsePedidosFilters, filterOrders, type SearchParamsInput } from "@/lib/logistic-admin/pedidos-utils";

export default async function LogisticAdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const ordersKey = data.orders.map((order) => `${order.idPedido}:${order.status}:${order.assignedToChoferId ?? "none"}`).join("|");
  const { searchQuery, statusFilter, assignmentFilter, requestedPage } = parsePedidosFilters(query);

  const filteredOrders = filterOrders(data.orders, searchQuery, statusFilter, assignmentFilter, data.vendorNames);
  const totalFilteredOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (requestedPage !== safePage) {
    const nextQuery = new URLSearchParams();
    if (searchQuery.trim()) nextQuery.set("query", searchQuery.trim());
    if (assignmentFilter !== "todos") nextQuery.set("assign", assignmentFilter);
    if (statusFilter !== "todos") nextQuery.set("status", statusFilter);
    if (safePage > 1) nextQuery.set("page", String(safePage));

    redirect(nextQuery.toString() ? `/dashboard/logistic-admin/pedidos?${nextQuery.toString()}` : "/dashboard/logistic-admin/pedidos");
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
        allFilteredOrders={filteredOrders}
        choferes={data.choferes}
        searchQuery={searchQuery}
        assignmentFilter={assignmentFilter}
        statusFilter={statusFilter}
        page={safePage}
        totalPages={totalPages}
        totalFilteredOrders={totalFilteredOrders}
        vendorNames={data.vendorNames}
      />
    </div>
  );
}
