import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import VehiculosManager from "./ui";

const pageSize = 8;

const statusOptions = ["activo", "pausado"] as const;
const searchOptions = ["patente", "tipo"] as const;

type VehiculoStatus = (typeof statusOptions)[number];
type SearchBy = (typeof searchOptions)[number];

function isVehiculoStatus(value: string | undefined): value is VehiculoStatus {
  return typeof value === "string" && statusOptions.includes(value as VehiculoStatus);
}

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

function isSearchBy(value: string | undefined): value is SearchBy {
  return typeof value === "string" && searchOptions.includes(value as SearchBy);
}

function filterVehiculos(
  vehiculos: Awaited<ReturnType<typeof getLogisticAdminData>>["vehiculos"],
  searchQuery: string,
  searchBy: SearchBy,
  statusFilter: "todos" | VehiculoStatus
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return vehiculos.filter((vehiculo) => {
    if (statusFilter !== "todos" && vehiculo.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue(searchBy === "tipo" ? vehiculo.tipo : vehiculo.patente);

    return haystack.includes(normalizedQuery);
  });
}

export default async function LogisticAdminVehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; searchBy?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const searchBy: SearchBy = isSearchBy(searchByValue) ? searchByValue : "patente";
  const statusFilter: "todos" | VehiculoStatus = statusValue === undefined || statusValue === "todos" ? "todos" : isVehiculoStatus(statusValue) ? statusValue : "todos";
  const requestedPage = parsePage(query.page);

  const filteredVehiculos = filterVehiculos(data.vehiculos, searchValue, searchBy, statusFilter);
  const totalFilteredVehiculos = filteredVehiculos.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredVehiculos / pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const paginatedVehiculos = filteredVehiculos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalVehiculos = totalFilteredVehiculos;
  const activosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado !== "pausado").length;
  const pausadosCount = filteredVehiculos.filter((vehiculo) => vehiculo.estado === "pausado").length;

  if (requestedPage !== safePage) {
    const params = new URLSearchParams();

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
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

  const vehiculosKey = paginatedVehiculos.map((vehiculo) => `${vehiculo.idVehiculo}:${vehiculo.estado ?? "activo"}:${vehiculo.assignedToChoferName ?? "none"}`).join("|");

  return (
    <VehiculosManager
      key={vehiculosKey}
      vehiculos={paginatedVehiculos}
      searchQuery={searchValue}
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
