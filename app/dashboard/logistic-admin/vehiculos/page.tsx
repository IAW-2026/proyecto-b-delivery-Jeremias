import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import VehiculosManager from "./ui";
import { pageSize } from "@/lib/shared/utils";
import { filterVehiculos, parseVehiculosFilters } from "./utils";

export default async function LogisticAdminVehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; searchBy?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const { searchQuery, searchBy, statusFilter, requestedPage } = parseVehiculosFilters(query);

  const filteredVehiculos = filterVehiculos(data.vehiculos, searchQuery, searchBy, statusFilter);
  const totalFilteredVehiculos = filteredVehiculos.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredVehiculos / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedVehiculos = filteredVehiculos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalVehiculos = totalFilteredVehiculos;
  const activosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado !== "pausado").length;
  const pausadosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado === "pausado").length;

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }

    if (searchBy !== "patente") {
      params.set("searchBy", searchBy);
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
    searchBy,
    statusFilter,
  ].join("|");

  return (
    <VehiculosManager
      key={vehiculosKey}
      vehiculos={paginatedVehiculos}
      searchQuery={searchQuery}
      searchBy={searchBy}
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredVehiculos={totalFilteredVehiculos}
      totalVehiculos={totalVehiculos}
      activosCount={activosCount}
      pausadosCount={pausadosCount}
    />
  );
}