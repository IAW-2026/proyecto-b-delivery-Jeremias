import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MisPedidosUI from "./ui";
import { getChoferStatus } from "@/lib/choferStatus";
import { pageSize, parsePage } from "@/lib/shared/utils";
import { filterPedidos, isPedidoStatus, isSearchBy, type PedidoStatus, type SearchBy, type SearchParamsInput } from "./utils";

type SearchParams = Promise<SearchParamsInput>;

export default async function MisPedidosPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  const data = await getChoferStatus(userId);
  const query = await searchParams;

  const searchValue = typeof query.query === "string" ? query.query : "";
  const searchByValue = typeof query.searchBy === "string" ? query.searchBy : undefined;
  const searchBy: SearchBy = isSearchBy(searchByValue) ? searchByValue : "cliente";
  const statusValue: "todos" | PedidoStatus = typeof query.status === "string" && isPedidoStatus(query.status) ? query.status : "todos";
  const requestedPage = parsePage(query.page);

  const pendingPedidos = data.pedidos.filter((pedido) => pedido.estado !== "entregado" && pedido.estado !== "cancelado");
  const filteredPedidos = filterPedidos(data.pedidos, searchValue, searchBy, statusValue);
  const filteredCount = filteredPedidos.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(requestedPage, totalPages);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();
    if (searchValue) params.set("query", searchValue);
    if (searchBy !== "cliente") params.set("searchBy", searchBy);
    if (statusValue !== "todos") params.set("status", statusValue);
    params.set("page", String(safePage));

    redirect(`/dashboard/chofer/mis-pedidos?${params.toString()}`);
  }

  const start = (safePage - 1) * pageSize;
  const paginatedPedidos = filteredPedidos.slice(start, start + pageSize);

  return (
    <MisPedidosUI
      key={`${searchValue}:${searchBy}:${statusValue}:${safePage}`}
      pedidos={paginatedPedidos}
      totalFiltered={pendingPedidos.length}
      totalBidones={pendingPedidos.reduce((sum, pedido) => sum + pedido.cantBidones, 0)}
      searchQuery={searchValue}
      searchBy={searchBy}
      statusFilter={statusValue}
      page={safePage}
      totalPages={totalPages}
    />
  );
}
