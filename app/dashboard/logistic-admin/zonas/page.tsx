import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import ZonasManager from "./ui";
import { pageSize } from "@/lib/shared/utils";
import { filterZonas, parseZonasFilters } from "./utils";

export default async function LogisticAdminZonasPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, requestedPage } = parseZonasFilters(query);

  const filteredZonas = filterZonas(data.zonas, searchQuery);
  const totalFilteredZonas = filteredZonas.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredZonas / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedZonas = filteredZonas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalZonas = totalFilteredZonas;
  const zonasConPedidos = filteredZonas.filter((zona) => zona.pedidosTotales > 0).length;
  const totalPedidos = filteredZonas.reduce((accumulator, zona) => accumulator + zona.pedidosTotales, 0);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `/dashboard/logistic-admin/zonas?${params.toString()}` : "/dashboard/logistic-admin/zonas";
    redirect(nextUrl);
  }

  const zonasKey = [paginatedZonas.map((zona) => `${zona.idZona}:${zona.pedidosTotales}`).join("|"), searchQuery].join("|");

  return (
    <ZonasManager
      key={zonasKey}
      zonas={paginatedZonas}
      zonasFueraCatalogo={data.zonasFueraCatalogo}
      searchQuery={searchQuery}
      page={safePage}
      totalPages={totalPages}
      totalFilteredZonas={totalFilteredZonas}
      totalZonas={totalZonas}
      zonasConPedidos={zonasConPedidos}
      zonasSinPedidos={totalZonas - zonasConPedidos}
      totalPedidos={totalPedidos}
    />
  );
}