import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import VehiculosManager from "./ui";

const pageSize = 8;

const statusOptions = ["activo", "pausado"] as const;

type VehiculoStatus = (typeof statusOptions)[number];

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

function filterVehiculos(vehiculos: Awaited<ReturnType<typeof getLogisticAdminData>>["vehiculos"], searchQuery: string, statusFilter: "todos" | VehiculoStatus) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return vehiculos.filter((vehiculo) => {
    if (statusFilter !== "todos" && vehiculo.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue([vehiculo.patente, vehiculo.tipo].join(" "));

    return haystack.includes(normalizedQuery);
  });
}

export default async function LogisticAdminVehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const statusFilter: "todos" | VehiculoStatus = statusValue === undefined || statusValue === "todos" ? "todos" : isVehiculoStatus(statusValue) ? statusValue : "todos";
  const requestedPage = parsePage(query.page);

  const filteredVehiculos = filterVehiculos(data.vehiculos, searchValue, statusFilter);
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
