import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MisPedidosUI from "./ui";
import { getChoferStatus } from "@/lib/choferStatus";

type Pedido = Awaited<ReturnType<typeof getChoferStatus>>["pedidos"][number];

type SearchParams = Promise<{ query?: string | string[]; status?: string | string[]; page?: string | string[] }>;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isPedidoStatus(value: string): value is Pedido["estado"] {
  return value === "ready" || value === "asignado" || value === "en_camino" || value === "entregado" || value === "cancelado" || value === "revision";
}

function filterPedidos(pedidos: Pedido[], searchQuery: string, statusFilter: "todos" | Pedido["estado"]) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return pedidos.filter((pedido) => {
    if (statusFilter !== "todos" && pedido.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue([pedido.cliente, pedido.direccion, pedido.zona].join(" "));
    return haystack.includes(normalizedQuery);
  });
}

export default async function MisPedidosPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  const data = await getChoferStatus(userId);
  const query = await searchParams;

  const searchValue = typeof query.query === "string" ? query.query : "";
  const statusValue = typeof query.status === "string" && isPedidoStatus(query.status) ? query.status : "todos";
  const requestedPage = parsePage(query.page);

  const filteredPedidos = filterPedidos(data.pedidos, searchValue, statusValue);
  const pendingPedidos = filteredPedidos.filter((pedido) => pedido.estado !== "entregado" && pedido.estado !== "cancelado");
  const pageSize = 8;
  const totalFiltered = filteredPedidos.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(requestedPage, totalPages);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();
    if (searchValue) params.set("query", searchValue);
    if (statusValue !== "todos") params.set("status", statusValue);
    params.set("page", String(safePage));

    redirect(`/dashboard/chofer/mis-pedidos?${params.toString()}`);
  }

  const start = (safePage - 1) * pageSize;
  const paginatedPedidos = filteredPedidos.slice(start, start + pageSize);

  return (
    <MisPedidosUI
      pedidos={paginatedPedidos}
      totalFiltered={pendingPedidos.length}
      totalBidones={pendingPedidos.reduce((sum, pedido) => sum + pedido.cantBidones, 0)}
      searchQuery={searchValue}
      statusFilter={statusValue}
      page={safePage}
      totalPages={totalPages}
    />
  );
}
