import { redirect } from "next/navigation";
import { getLogisticAdminData } from "@/lib/logistic-admin/data";
import ChoferesManager from "@/components/logistic-admin/choferes-ui";
import { pageSize } from "@/lib/shared/utils";
import { buildChoferesQueryHref, filterChoferes, parseChoferesFilters, type SearchParamsInput } from "@/lib/logistic-admin/choferes-utils";

export default async function LogisticAdminChoferesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, statusFilter, requestedPage } = parseChoferesFilters(query);

  const filteredChoferes = filterChoferes(data.choferes, searchQuery, statusFilter, data.vendorNames);
  const totalFilteredChoferes = filteredChoferes.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredChoferes / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedChoferes = filteredChoferes.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = filteredChoferes.filter((chofer) => chofer.estado === "activo").length;
  const withZoneCount = filteredChoferes.filter((chofer) => chofer.idZona !== null).length;
  const withoutZoneCount = filteredChoferes.filter((chofer) => chofer.idZona === null).length;

  if (requestedPage !== safePage) {
    redirect(buildChoferesQueryHref({ query: searchQuery, status: statusFilter, page: safePage }, { searchQuery, statusFilter, requestedPage }));
  }

  const choferesKey = paginatedChoferes.map((chofer) => `${chofer.idChofer}:${chofer.estado}:${chofer.idVehiculo ?? "none"}:${chofer.idZona ?? "none"}`).join("|");

  return (
    <ChoferesManager
      key={choferesKey}
      choferes={paginatedChoferes}
      zonas={data.zonasCatalogo}
      vehiculos={data.vehiculos}
      searchQuery={searchQuery}
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredChoferes={totalFilteredChoferes}
      totalChoferes={data.choferes.length}
      activeCount={activeCount}
      withZoneCount={withZoneCount}
      withoutZoneCount={withoutZoneCount}
      vendorNames={data.vendorNames}
    />
  );
}
