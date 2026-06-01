import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import AdminDeliveryChoferesUi from "./ui";
import { pageSize } from "@/lib/shared/utils";
import { filterChoferes, parseChoferesFilters, type SearchParamsInput } from "./utils";

const basePath = "/dashboard/admin-delivery";

export default async function AdminDeliveryChoferesPage({
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
  const totalChoferes = totalFilteredChoferes;
  const activeCount = filteredChoferes.filter((chofer) => chofer.estado === "activo").length;
  const withZoneCount = filteredChoferes.filter((chofer) => chofer.idZona !== null).length;
  const withoutZoneCount = filteredChoferes.filter((chofer) => chofer.idZona === null).length;

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }

    if (searchBy !== "nombre") {
      params.set("searchBy", searchBy);
    }

    if (statusFilter !== "todos") {
      params.set("status", statusFilter);
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `${basePath}/choferes?${params.toString()}` : `${basePath}/choferes`;
    redirect(nextUrl);
  }

  const choferesKey = [
    paginatedChoferes.map((chofer) => `${chofer.idChofer}:${chofer.estado}:${chofer.idVehiculo ?? "none"}:${chofer.idZona ?? "none"}`).join("|"),
    searchQuery,
    searchBy,
    statusFilter,
  ].join("|");

  return (
    <AdminDeliveryChoferesUi
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
      totalChoferes={totalChoferes}
      activeCount={activeCount}
      withZoneCount={withZoneCount}
      withoutZoneCount={withoutZoneCount}
      basePath={basePath}
    />
  );
}
