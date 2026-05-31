import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import ZonasManager from "../../logistic-admin/zonas/ui";

const pageSize = 8;
const basePath = "/dashboard/admin-delivery";

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

function filterZonas(zonas: Awaited<ReturnType<typeof getLogisticAdminData>>["zonas"], searchQuery: string) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  if (!normalizedQuery) {
    return zonas;
  }

  return zonas.filter((zona) => {
    const haystack = normalizeSearchValue(zona.zona);
    return haystack.includes(normalizedQuery);
  });
}

export default async function AdminDeliveryZonasPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();

  const query = await searchParams;
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const requestedPage = parsePage(query.page);

  const filteredZonas = filterZonas(data.zonas, searchValue);
  const totalFilteredZonas = filteredZonas.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredZonas / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedZonas = filteredZonas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalZonas = totalFilteredZonas;
  const zonasConPedidos = filteredZonas.filter((zona) => zona.pedidosTotales > 0).length;
  const totalPedidos = filteredZonas.reduce((accumulator, zona) => accumulator + zona.pedidosTotales, 0);
  const totalRutas = filteredZonas.reduce((accumulator, zona) => accumulator + zona.rutasAsignadas, 0);

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `${basePath}/zonas?${params.toString()}` : `${basePath}/zonas`;
    redirect(nextUrl);
  }

  const zonasKey = paginatedZonas.map((zona) => `${zona.idZona}:${zona.pedidosTotales}:${zona.rutasAsignadas}`).join("|");

  return (
    <ZonasManager
      key={zonasKey}
      zonas={paginatedZonas}
      zonasFueraCatalogo={data.zonasFueraCatalogo}
      searchQuery={searchValue}
      page={safePage}
      totalPages={totalPages}
      totalFilteredZonas={totalFilteredZonas}
      totalZonas={totalZonas}
      zonasConPedidos={zonasConPedidos}
      zonasSinPedidos={totalZonas - zonasConPedidos}
      totalPedidos={totalPedidos}
      totalRutas={totalRutas}
      basePath={basePath}
    />
  );
}
