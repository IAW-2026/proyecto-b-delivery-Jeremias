import { redirect } from "next/navigation";
import { getLogisticAdminData } from "@/lib/logistic-admin/data";
import VehiculosManager from "@/components/logistic-admin/vehiculos-ui";
import { pageSize } from "@/lib/shared/utils";
import { filterVehiculos, parseVehiculosFilters } from "@/lib/logistic-admin/vehiculos-utils";

export default async function LogisticAdminVehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; searchBy?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, statusFilter, requestedPage } = parseVehiculosFilters(query);

  const filteredVehiculos = filterVehiculos(data.vehiculos, searchQuery, statusFilter, data.vendorNames);
  const totalFilteredVehiculos = filteredVehiculos.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredVehiculos / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedVehiculos = filteredVehiculos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalVehiculos = totalFilteredVehiculos;
  const activosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado === "activo").length;
  const pausadosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado === "pausado").length;

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }

    if (statusFilter !== "todos") {
      params.set("status", statusFilter);
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `/dashboard/logistic-admin/vehiculos?${params.toString()}` : "/dashboard/logistic-admin/vehiculos";
    redirect(nextUrl);
  }

  const vehiculosKey = [
    paginatedVehiculos.map((vehiculo) => `${vehiculo.idVehiculo}:${vehiculo.estado ?? "activo"}:${vehiculo.assignedToChoferName ?? "none"}`).join("|"),
    searchQuery,
    statusFilter,
  ].join("|");

  return (
    <VehiculosManager
      key={vehiculosKey}
      vehiculos={paginatedVehiculos}
      searchQuery={searchQuery}
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredVehiculos={totalFilteredVehiculos}
      totalVehiculos={totalVehiculos}
      activosCount={activosCount}
      pausadosCount={pausadosCount}
      vendorNames={data.vendorNames}
    />
  );
}