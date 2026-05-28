import { redirect } from "next/navigation";
import { getLogisticAdminData } from "../data";
import ChoferesManager from "./ui";

const pageSize = 8;

const statusOptions = ["activo", "inactivo", "pendiente", "rechazado"] as const;

type ChoferStatus = (typeof statusOptions)[number];

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

function filterChoferes(choferes: Awaited<ReturnType<typeof getLogisticAdminData>>["choferes"], searchQuery: string, statusFilter: "todos" | ChoferStatus) {
  const normalizedQuery = normalizeSearchValue(searchQuery.trim());

  return choferes.filter((chofer) => {
    if (statusFilter !== "todos" && chofer.estado !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue([chofer.nombre, chofer.telefono ?? ""].join(" "));

    return haystack.includes(normalizedQuery);
  });
}

export default async function LogisticAdminChoferesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const data = await getLogisticAdminData();
  const query = await searchParams;
  const searchValue = Array.isArray(query.query) ? query.query[0] : query.query ?? "";
  const statusValue = Array.isArray(query.status) ? query.status[0] : query.status;
  const statusFilter: "todos" | ChoferStatus = statusValue === undefined || statusValue === "todos" ? "todos" : isChoferStatus(statusValue) ? statusValue : "todos";
  const requestedPage = parsePage(query.page);

  const filteredChoferes = filterChoferes(data.choferes, searchValue, statusFilter);
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

    if (statusFilter !== "todos") {
      params.set("status", statusFilter);
    }

    if (safePage > 1) {
      params.set("page", String(safePage));
    }

    const nextUrl = params.toString() ? `/dashboard/logistic-admin/choferes?${params.toString()}` : "/dashboard/logistic-admin/choferes";
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
      statusFilter={statusFilter}
      page={safePage}
      totalPages={totalPages}
      totalFilteredChoferes={totalFilteredChoferes}
      totalChoferes={totalChoferes}
      activeCount={activeCount}
      withZoneCount={withZoneCount}
      withoutZoneCount={withoutZoneCount}
    />
  );
}
