import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../../logistic-admin/data";
import ChoferesManager from "../../logistic-admin/choferes/ui";

const pageSize = 8;
const basePath = "/dashboard/admin-delivery";

const statusOptions = ["activo", "inactivo", "pendiente", "rechazado"] as const;
const searchOptions = ["nombre", "telefono"] as const;

type ChoferStatus = (typeof statusOptions)[number];
type SearchBy = (typeof searchOptions)[number];

function isChoferStatus(value: string | undefined): value is ChoferStatus {
  return typeof value === "string" && statusOptions.includes(value as ChoferStatus);
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

function filterChoferes(
  choferes: Awaited<ReturnType<typeof getLogisticAdminData>>["choferes"],
  searchQuery: string,
  searchBy: SearchBy,
  statusFilter: "todos" | ChoferStatus
) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return choferes.filter((chofer) => {
    if (statusFilter !== "todos" && chofer.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue(searchBy === "telefono" ? chofer.telefono ?? "" : chofer.nombre);

    return haystack.includes(normalizedQuery);
  });
}

export default async function AdminDeliveryChoferesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; searchBy?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const searchByValue = Array.isArray(query.searchBy) ? query.searchBy[0] : query.searchBy;
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const searchBy: SearchBy = isSearchBy(searchByValue) ? searchByValue : "nombre";
  const statusFilter: "todos" | ChoferStatus =
    statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos";
  const requestedPage = parsePage(query.page);

  const filteredChoferes = filterChoferes(data.choferes, searchValue, searchBy, statusFilter);
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

    if (searchValue.trim()) {
      params.set("query", searchValue.trim());
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

  const choferesKey = paginatedChoferes.map((chofer) => `${chofer.idChofer}:${chofer.estado}:${chofer.idVehiculo ?? "none"}:${chofer.idZona ?? "none"}`).join("|");

  return (
    <ChoferesManager
      key={choferesKey}
      choferes={paginatedChoferes}
      zonas={data.zonasCatalogo}
      vehiculos={data.vehiculos}
      searchQuery={searchValue}
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
