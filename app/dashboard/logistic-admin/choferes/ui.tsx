"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "../styles";

type Zona = {
  idZona: number;
  nombre: string;
};

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado?: string;
};

type Chofer = {
  idChofer: number;
  nombre: string;
  telefono: string | null;
  estado: string;
  disponible: boolean;
  idVehiculo: number | null;
  idZona: number | null;
  vehiculo?: {
    patente: string;
    tipo: string;
  } | null;
  zona?: Zona | null;
};

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
};

type ChoferStatus = "todos" | "activo" | "inactivo" | "pendiente" | "rechazado";

const statusOptions: Array<{ value: Exclude<ChoferStatus, "todos">; label: string }> = [
  { value: "activo", label: "Activos" },
  { value: "inactivo", label: "Inactivos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "rechazado", label: "Rechazados" },
];

const pageSize = 8;

type ChoferRequest = {
  id: number;
  nombre: string;
  telefono: string;
  vendorName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
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

function buildQueryHref(nextValues: { query?: string; status?: ChoferStatus; page?: number }, searchQuery: string, statusFilter: ChoferStatus, page: number) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? searchQuery;
  const nextStatus = nextValues.status ?? statusFilter;
  const nextPage = nextValues.page ?? page;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
  }

  if (nextStatus !== "todos") {
    params.set("status", nextStatus);
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const queryString = params.toString();
  return queryString ? `/dashboard/logistic-admin/choferes?${queryString}` : "/dashboard/logistic-admin/choferes";
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
}: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingChoferId, setEditingChoferId] = useState<number | null>(null);
  const [requests, setRequests] = useState<ChoferRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [selectedZones, setSelectedZones] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const chofer of choferes) {
      initial[chofer.idChofer] = chofer.idZona ? String(chofer.idZona) : "";
    }
    return initial;
  });
  const [selectedVehiculos, setSelectedVehiculos] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const chofer of choferes) {
      initial[chofer.idChofer] = chofer.idVehiculo ? String(chofer.idVehiculo) : "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const occupiedVehicleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const chofer of choferes) {
      if (chofer.idVehiculo !== null) {
        ids.add(chofer.idVehiculo);
      }
    }
    return ids;
  }, [choferes]);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch("/api/logistic-admin/chofer-requests", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { requests?: ChoferRequest[] };
        if (!cancelled) {
          setRequests(payload.requests ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoadingRequests(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/logistic-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "No se pudo completar la operación");
    }
  }

  async function handleSaveZone(idChofer: number) {
    const zoneValue = selectedZones[idChofer];
    const vehicleValue = selectedVehiculos[idChofer];
    setSavingId(idChofer);
    setError(null);

    try {
      if (!zoneValue) {
        await runAction({ action: "clear_driver_zone", idChofer });
      } else {
        await runAction({ action: "assign_driver_zone", idChofer, idZona: Number(zoneValue) });
      }

      if (!vehicleValue) {
        await runAction({ action: "assign_vehicle", idChofer, idVehiculo: null });
      } else {
        await runAction({ action: "assign_vehicle", idChofer, idVehiculo: Number(vehicleValue) });
      }

      setEditingChoferId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar los cambios del chofer");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSetEstado(idChofer: number, estado: string) {
    setSavingId(idChofer);
    setError(null);
    try {
      await runAction({ action: "set_chofer_estado", idChofer, estado });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(idChofer: number) {
    if (!confirm("¿Eliminar chofer? Esta acción no se puede deshacer.")) return;
    setSavingId(idChofer);
    setError(null);
    try {
      await runAction({ action: "delete_chofer", idChofer });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el chofer");
    } finally {
      setSavingId(null);
    }
  }

  async function handleReviewRequest(requestId: number, action: "approve" | "reject") {
    setRequestActionId(requestId);
    try {
      const options: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };

      if (action === "reject") {
        const reason = window.prompt("Motivo del rechazo (opcional)")?.trim() ?? "";
        options.body = JSON.stringify({ reason });
      }

      const response = await fetch(`/api/logistic-admin/chofer-requests/${requestId}/${action}`, options);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "No se pudo procesar la solicitud");
      }

      setRequests((current) => current.filter((request) => request.id !== requestId));
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo procesar la solicitud");
    } finally {
      setRequestActionId(null);
    }
  }

  return (
    <div className={`mx-auto max-w-7xl p-4 text-slate-800 md:p-6 ${adminPageShell}`}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Choferes
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Estado del equipo de choferes, disponibilidad, vehículo asignado y barrio operativo.
        </p>
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
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              Cargando solicitudes...
            </p>
          ) : requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              No hay solicitudes pendientes.
            </p>
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
                    <button
                      type="button"
                      onClick={() => handleReviewRequest(request.id, "approve")}
                      disabled={requestActionId === request.id}
                      className={adminButtonClass("success", "sm")}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewRequest(request.id, "reject")}
                      disabled={requestActionId === request.id}
                      className={adminButtonClass("danger", "sm")}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Buscar choferes</p>
            <p className="text-xs text-slate-500">Buscá por nombre o teléfono.</p>
          </div>
          <form action="/dashboard/logistic-admin/choferes" method="get" className="w-full max-w-md">
            <input type="hidden" name="page" value="1" />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <label className="sr-only" htmlFor="choferes-search">
              Buscar choferes
            </label>
            <div className="flex gap-2">
              <input
                id="choferes-search"
                name="query"
                defaultValue={searchQuery}
                placeholder="Buscar por nombre o teléfono"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className={adminButtonClass("edit", "sm")}>Buscar</button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildQueryHref({ status: "todos", page: 1 }, searchQuery, statusFilter, page)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === "todos"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Todos
          </Link>
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildQueryHref({ status: option.value, page: 1 }, searchQuery, statusFilter, page)}
              className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === option.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </Link>
          ))}
          {searchQuery ? (
            <Link
              href={buildQueryHref({ query: "", page: 1 }, searchQuery, statusFilter, page)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpiar búsqueda
            </Link>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {choferes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {searchQuery || statusFilter !== "todos"
            ? `No hay resultados para ${searchQuery ? `"${searchQuery}"` : "el filtro seleccionado"}.`
            : "No hay choferes asociados a la empresa."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {choferes.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(totalFilteredChoferes, page * pageSize)} de {totalFilteredChoferes} choferes
            </p>
            <p>
              Página {page} de {totalPages}
            </p>
          </div>
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[190px] px-3 py-3">Chofer</th>
                <th className="w-[120px] px-3 py-3">Estado</th>
                <th className="w-[150px] px-3 py-3">Zona</th>
                <th className="w-[190px] px-3 py-3">Vehículo</th>
                <th className="w-[230px] px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {choferes.map((chofer) => (
                <Fragment key={chofer.idChofer}>
                  <tr key={chofer.idChofer} className="border-t border-slate-100 text-sm text-slate-700 align-top">
                    <td className="px-3 py-4">
                      <p className="truncate font-medium text-slate-900">{chofer.nombre}</p>
                      <p className="text-xs text-slate-500">Tel: {chofer.telefono ?? "Sin teléfono"}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wide ${estadoClass(chofer.estado)}`}>
                        {formatEstado(chofer.estado)}
                      </span>
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
                        <p className="truncate font-medium text-slate-900">
                          {chofer.zona?.nombre ?? <span className="font-normal italic text-slate-400">Sin zona</span>}
                        </p>
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
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap justify-center gap-2">
                        {editingChoferId === chofer.idChofer ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveZone(chofer.idChofer)}
                              disabled={savingId === chofer.idChofer}
                              className={adminButtonClass("save", "sm")}
                            >
                              {savingId === chofer.idChofer ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChoferId(null);
                                setSelectedZones((current) => ({ ...current, [chofer.idChofer]: chofer.idZona ? String(chofer.idZona) : "" }));
                                setSelectedVehiculos((current) => ({ ...current, [chofer.idChofer]: chofer.idVehiculo ? String(chofer.idVehiculo) : "" }));
                                setError(null);
                              }}
                              className={adminButtonClass("cancel", "sm")}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setEditingChoferId(chofer.idChofer)} className={adminButtonClass("edit", "sm")}>
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetEstado(chofer.idChofer, chofer.estado === "activo" ? "inactivo" : "activo")}
                              disabled={savingId === chofer.idChofer}
                              className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                                chofer.estado === "activo"
                                  ? "border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {savingId === chofer.idChofer ? "..." : chofer.estado === "activo" ? "Desactivar" : "Activar"}
                            </button>
                            <button type="button" onClick={() => handleDelete(chofer.idChofer)} disabled={savingId === chofer.idChofer} className={adminButtonClass("danger", "sm")}>
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFilteredChoferes}</p>
            <div className="flex items-center gap-2">
              <Link
                href={buildQueryHref({ page: Math.max(1, page - 1) }, searchQuery, statusFilter, page)}
                aria-disabled={page <= 1}
                className={`${adminButtonClass("cancel", "sm")} ${page <= 1 ? "pointer-events-none opacity-60" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={buildQueryHref({ page: Math.min(totalPages, page + 1) }, searchQuery, statusFilter, page)}
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