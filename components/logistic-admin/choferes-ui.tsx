"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LogisticAdminViewData } from "@/lib/logistic-admin/data";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "@/lib/logistic-admin/styles";
import { buildChoferesQueryHref, statusOptions, type ChoferStatus } from "@/lib/logistic-admin/choferes-utils";
import { useChoferesController } from "@/lib/logistic-admin/choferes-controller";

type Zona = LogisticAdminViewData["zonasCatalogo"][number];
type Vehiculo = LogisticAdminViewData["vehiculos"][number];
type Chofer = LogisticAdminViewData["choferes"][number];

type Props = {
  choferes: Chofer[];
  zonas: Zona[];
  vehiculos: Vehiculo[];
  searchQuery: string;
  statusFilter: "todos" | ChoferStatus;
  page: number;
  totalPages: number;
  totalFilteredChoferes: number;
  totalChoferes: number;
  activeCount: number;
  withZoneCount: number;
  withoutZoneCount: number;
  basePath?: string;
  vendorNames: Record<number, string>;
};

function estadoClass(estado: string) {
  if (estado === "activo") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (estado === "rechazado" || estado === "inactivo") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (estado === "pendiente") return "bg-violet-50 text-violet-700 border border-violet-200";
  return "bg-slate-50 text-slate-700 border border-slate-200";
}

function formatEstado(estado: string) {
  if (estado === "activo") return "Activo";
  if (estado === "inactivo") return "Inactivo";
  if (estado === "pendiente") return "Pendiente";
  if (estado === "rechazado") return "Rechazado";
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

export default function ChoferesManager({
  choferes,
  zonas,
  vehiculos,
  searchQuery,
  statusFilter,
  page,
  totalPages,
  totalFilteredChoferes,
  totalChoferes,
  activeCount,
  withZoneCount,
  withoutZoneCount,
  basePath = "/dashboard/logistic-admin",
  vendorNames,
}: Props) {
  const router = useRouter();
  const controller = useChoferesController({
    choferes,
    searchParams: { query: searchQuery, status: statusFilter, page: String(page) },
    page,
    totalFilteredChoferes,
    basePath,
  });

  const {
    filterState,
    savingId,
    editingChoferId,
    requests,
    loadingRequests,
    requestActionId,
    error,
    pageStart,
    pageEnd,
    occupiedVehicleIds,
    editState,
    handlers,
  } = controller;

  const { selectedZones, selectedVehiculos } = editState;
  const { startEdit, cancelEdit, saveEdit, handleSetEstado, handleDelete, handleReviewRequest, setSelectedZones, setSelectedVehiculos } = handlers;

  return (
    <div className={`mx-auto max-w-7xl p-4 text-slate-800 md:p-6 ${adminPageShell}`}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Choferes
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">Estado del equipo de choferes, disponibilidad, vehículo asignado y barrio operativo.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Total choferes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalChoferes}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Con zona</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{withZoneCount}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Sin zona</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{withoutZoneCount}</p>
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Solicitudes de chofer</h2>
            <p className="text-sm text-slate-500">Se gestionan acá porque el alta y la asignación del equipo viven en esta pantalla.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loadingRequests ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Cargando solicitudes...</p>
          ) : requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No hay solicitudes pendientes.</p>
          ) : (
            requests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{request.nombre}</h3>
                    <p className="text-sm text-slate-600">{request.telefono}</p>
                    <p className="mt-1 text-xs text-slate-500">Empresa: {request.vendorName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleReviewRequest(request.id, "approve")} disabled={requestActionId === request.id} className={adminButtonClass("success", "sm")}>
                      Aprobar
                    </button>
                    <button type="button" onClick={() => handleReviewRequest(request.id, "reject")} disabled={requestActionId === request.id} className={adminButtonClass("danger", "sm")}>
                      Rechazar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5 shadow-sm`}>
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Buscar choferes</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Buscá por nombre, teléfono o empresa. Después aplicá un filtro rápido si hace falta.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Filtros rápidos</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)]">
          <form
            action={`${basePath}/choferes`}
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const queryValue = String(formData.get("query") ?? "");
              router.push(buildChoferesQueryHref({ query: queryValue, page: 1 }, filterState, `${basePath}/choferes`));
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="page" value="1" />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <label className="sr-only" htmlFor="choferes-search">
              Buscar choferes
            </label>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                id="choferes-search"
                name="query"
                defaultValue={searchQuery}
                placeholder="Buscar choferes (nombre, teléfono, empresa)"
                className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className={adminButtonClass("edit", "sm")}>
                Buscar
              </button>
            </div>
            {searchQuery ? (
              <Link href={buildChoferesQueryHref({ query: "", page: 1 }, filterState, `${basePath}/choferes`)} className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Limpiar búsqueda
              </Link>
            ) : null}
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action={`${basePath}/choferes`} method="get" className="space-y-3">
              <input type="hidden" name="query" value={searchQuery} />
              <input type="hidden" name="page" value="1" />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtrar por</span>
                <select
                  name="status"
                  value={statusFilter}
                  onChange={(event) => {
                    router.push(buildChoferesQueryHref({ status: event.currentTarget.value as ChoferStatus, page: 1 }, filterState, `${basePath}/choferes`));
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="todos">Sin filtros</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Este filtro te deja ir directo al estado del chofer sin perder la búsqueda escrita.</p>
            </form>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {choferes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {searchQuery || statusFilter !== "todos" ? `No hay resultados para ${searchQuery ? `"${searchQuery}"` : "el filtro seleccionado"}.` : "No hay choferes asociados a la empresa."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {pageStart}-{pageEnd} de {totalFilteredChoferes} choferes
            </p>
            <p>
              Página {page} de {totalPages}
            </p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Chofer</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Estado</th>
                <th className="px-3 py-3">Empresa</th>
                <th className="px-3 py-3">Zona</th>
                <th className="px-3 py-3">Vehículo</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {choferes.map((chofer) => (
                <tr key={chofer.idChofer} className="border-t border-slate-100 text-sm text-slate-700 align-top">
                  <td className="px-3 py-4">
                    <p className="truncate font-medium text-slate-900">{chofer.nombre}</p>
                    <p className="text-xs text-slate-500">Tel: {chofer.telefono ?? "Sin teléfono"}</p>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wide ${estadoClass(chofer.estado)}`}>
                      {formatEstado(chofer.estado)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-slate-600">
                    {vendorNames[chofer.idVendedor] ?? `Empresa #${chofer.idVendedor}`}
                  </td>
                  <td className="px-3 py-4">
                    {editingChoferId === chofer.idChofer ? (
                      <select
                        value={selectedZones[chofer.idChofer] ?? ""}
                        onChange={(event) => setSelectedZones((current) => ({ ...current, [chofer.idChofer]: event.target.value }))}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        disabled={savingId === chofer.idChofer}
                      >
                        <option value="">Sin zona</option>
                        {zonas.map((zona) => (
                          <option key={zona.idZona} value={zona.idZona}>
                            {zona.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="truncate font-medium text-slate-900">{chofer.zona?.nombre ?? <span className="font-normal italic text-slate-400">Sin zona</span>}</p>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {editingChoferId === chofer.idChofer ? (
                      <select
                        value={selectedVehiculos[chofer.idChofer] ?? ""}
                        onChange={(event) => setSelectedVehiculos((current) => ({ ...current, [chofer.idChofer]: event.target.value }))}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        disabled={savingId === chofer.idChofer}
                      >
                        <option value="">Sin asignar</option>
                        {vehiculos
                          .filter((vehiculo) => vehiculo.estado !== "pausado" && (vehiculo.idVehiculo === chofer.idVehiculo || !occupiedVehicleIds.has(vehiculo.idVehiculo)))
                          .map((vehiculo) => (
                            <option key={vehiculo.idVehiculo} value={vehiculo.idVehiculo}>
                              {vehiculo.patente} · {vehiculo.tipo}
                              {vehiculo.idVehiculo === chofer.idVehiculo ? " (actual)" : ""}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <p className="truncate font-medium text-slate-900">
                        {chofer.vehiculo?.patente ? `${chofer.vehiculo.patente} (${chofer.vehiculo.tipo})` : <span className="font-normal italic text-slate-400">Sin asignar</span>}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      {editingChoferId === chofer.idChofer ? (
                        <>
                          <button type="button" onClick={() => saveEdit(chofer)} disabled={savingId === chofer.idChofer} className={adminButtonClass("save", "sm")}>
                            {savingId === chofer.idChofer ? "Guardando..." : "Guardar"}
                          </button>
                          <button type="button" onClick={() => cancelEdit(chofer)} disabled={savingId === chofer.idChofer} className={adminButtonClass("cancel", "sm")}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(chofer)} className={adminButtonClass("edit", "sm")}>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetEstado(chofer, chofer.estado === "activo" ? "inactivo" : "activo")}
                            disabled={savingId === chofer.idChofer}
                            className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                              chofer.estado === "activo"
                                ? "border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {savingId === chofer.idChofer ? "..." : chofer.estado === "activo" ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" onClick={() => handleDelete(chofer)} disabled={savingId === chofer.idChofer} className={adminButtonClass("danger", "sm")}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFilteredChoferes}</p>
            <div className="flex items-center gap-2">
              <Link
                href={buildChoferesQueryHref({ page: Math.max(1, page - 1) }, filterState, `${basePath}/choferes`)}
                aria-disabled={page <= 1}
                className={`${adminButtonClass("cancel", "sm")} ${page <= 1 ? "pointer-events-none opacity-60" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={buildChoferesQueryHref({ page: Math.min(totalPages, page + 1) }, filterState, `${basePath}/choferes`)}
                aria-disabled={page >= totalPages}
                className={`${adminButtonClass("cancel", "sm")} ${page >= totalPages ? "pointer-events-none opacity-60" : ""}`}
              >
                Siguiente
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
