import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import ChoferesManager from "./ui";
import { pageSize } from "@/lib/shared/utils";
import { buildChoferesQueryHref, filterChoferes, parseChoferesFilters, type SearchParamsInput } from "./utils";

export default async function LogisticAdminChoferesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, searchBy, statusFilter, requestedPage } = parseChoferesFilters(query);

  const filteredChoferes = filterChoferes(data.choferes, searchQuery, searchBy, statusFilter);
  const totalFilteredChoferes = filteredChoferes.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredChoferes / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedChoferes = filteredChoferes.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeCount = filteredChoferes.filter((chofer) => chofer.estado === "activo").length;
  const withZoneCount = filteredChoferes.filter((chofer) => chofer.idZona !== null).length;
  const withoutZoneCount = filteredChoferes.filter((chofer) => chofer.idZona === null).length;

  if (requestedPage !== safePage) {
    redirect(buildChoferesQueryHref({ query: searchQuery, searchBy, status: statusFilter, page: safePage }, { searchQuery, searchBy, statusFilter, requestedPage }));
  }

  const choferesKey = `${paginatedChoferes.map((chofer) => `${chofer.idChofer}:${chofer.estado}:${chofer.idVehiculo ?? "none"}:${chofer.idZona ?? "none"}`).join("|")}:${searchBy}`;

  return (
    <ChoferesManager
      key={choferesKey}
      choferes={paginatedChoferes}
      zonas={data.zonasCatalogo}
      vehiculos={data.vehiculos}
      searchQuery={searchQuery}
      searchBy={searchBy}
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredChoferes={totalFilteredChoferes}
      totalChoferes={data.choferes.length}
      activeCount={activeCount}
      withZoneCount={withZoneCount}
      withoutZoneCount={withoutZoneCount}
    />
  );
}
