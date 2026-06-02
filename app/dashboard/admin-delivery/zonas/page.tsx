import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import AdminDeliveryZonasUi from "./ui";
import { pageSize } from "@/lib/shared/utils";
import { filterZonas, parseZonasFilters, type SearchParamsInput } from "./utils";

const basePath = "/dashboard/admin-delivery";

export default async function AdminDeliveryZonasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const data = await getLogisticAdminData();

  const query = await searchParams;
  const { searchQuery, requestedPage } = parseZonasFilters(query);

  const filteredZonas = filterZonas(data.zonas, searchQuery, data.vendorNames);
  const totalFilteredZonas = filteredZonas.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredZonas / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedZonas = filteredZonas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const zonasConPedidos = data.zonas.filter((zona) => zona.pedidosTotales > 0).length;
  const totalPedidos = data.zonas.reduce((accumulator, zona) => accumulator + zona.pedidosTotales, 0);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `${basePath}/zonas?${params.toString()}` : `${basePath}/zonas`;
    redirect(nextUrl);
  }

  const zonasKey = [paginatedZonas.map((zona) => `${zona.idZona}:${zona.pedidosTotales}`).join("|"), searchQuery].join("|");

  return (
    <AdminDeliveryZonasUi
      key={zonasKey}
      zonas={paginatedZonas}
      zonasFueraCatalogo={data.zonasFueraCatalogo}
      searchQuery={searchQuery}
      page={safePage}
      totalPages={totalPages}
      totalFilteredZonas={totalFilteredZonas}
      totalZonas={data.zonas.length}
      zonasConPedidos={zonasConPedidos}
      zonasSinPedidos={data.zonas.length - zonasConPedidos}
      totalPedidos={totalPedidos}
      vendorNames={data.vendorNames}
      basePath={basePath}
    />
  );
}
