"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "../styles";

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado?: string;
  motivoPausa?: string | null;
  assignedToChoferName?: string | null;
};

type Props = {
  vehiculos: Vehiculo[];
  searchQuery: string;
  searchBy: "patente" | "tipo";
  statusFilter: "todos" | VehiculoStatus;
  page: number;
  totalPages: number;
  totalFilteredVehiculos: number;
  totalVehiculos: number;
  activosCount: number;
  pausadosCount: number;
};

type FormState = {
  patente: string;
  tipo: string;
  capacidadBidones: string;
};

type VehiculoStatus = "todos" | "activo" | "pausado";

const statusOptions: Array<{ value: Exclude<VehiculoStatus, "todos">; label: string }> = [
  { value: "activo", label: "Activos" },
  { value: "pausado", label: "Pausados" },
];

const searchOptions: Array<{ value: "patente" | "tipo"; label: string; placeholder: string }> = [
  { value: "patente", label: "Patente", placeholder: "Buscar por patente" },
  { value: "tipo", label: "Tipo", placeholder: "Buscar por tipo" },
];

const pageSize = 8;

const emptyForm: FormState = {
  patente: "",
  tipo: "",
  capacidadBidones: "",
};

function buildQueryHref(
  nextValues: { query?: string; searchBy?: "patente" | "tipo"; status?: VehiculoStatus; page?: number },
  searchQuery: string,
  searchBy: "patente" | "tipo",
  statusFilter: VehiculoStatus,
  page: number
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? searchQuery;
  const nextSearchBy = nextValues.searchBy ?? searchBy;
  const nextStatus = nextValues.status ?? statusFilter;
  const nextPage = nextValues.page ?? page;

  if (nextQuery.trim()) {
    params.set("query", nextQuery.trim());
  }

  if (nextSearchBy !== "patente") {
    params.set("searchBy", nextSearchBy);
  }

  if (nextStatus !== "todos") {
    params.set("status", nextStatus);
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const queryString = params.toString();
  return queryString ? `/dashboard/logistic-admin/vehiculos?${queryString}` : "/dashboard/logistic-admin/vehiculos";
}

export default function VehiculosManager({
  vehiculos,
  searchQuery,
  searchBy,
  statusFilter,
  page,
  totalPages,
  totalFilteredVehiculos,
  totalVehiculos,
  activosCount,
  pausadosCount,
}: Props) {
  const router = useRouter();
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSearchBy, setSelectedSearchBy] = useState(searchBy);
  const [pausingVehicleId, setPausingVehicleId] = useState<number | null>(null);
  const [detailsVehicleId, setDetailsVehicleId] = useState<number | null>(null);
  const [pauseReasons, setPauseReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  function vehicleStatusLabel(estado?: string) {
    if (estado === "pausado") return "Pausado";
    return "Activo";
  }

  function vehicleStatusClass(estado?: string) {
    if (estado === "pausado") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  }

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

  function startEdit(vehiculo: Vehiculo) {
    setEditingId(vehiculo.idVehiculo);
    setEditForm({
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      capacidadBidones: String(vehiculo.capacidadBidones),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setError(null);
  }

  async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const capacidad = Number(addForm.capacidadBidones);
    if (!addForm.patente.trim() || !addForm.tipo.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({
        action: "create_vehicle",
        patente: addForm.patente,
        tipo: addForm.tipo,
        capacidadBidones: capacidad,
      });

      setAddForm(emptyForm);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateVehicle(event: React.FormEvent<HTMLFormElement>, idVehiculo: number) {
    event.preventDefault();
    setError(null);

    const capacidad = Number(editForm.capacidadBidones);
    if (!editForm.patente.trim() || !editForm.tipo.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({
        action: "update_vehicle",
        idVehiculo,
        patente: editForm.patente,
        tipo: editForm.tipo,
        capacidadBidones: capacidad,
      });

      cancelEdit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(idVehiculo: number) {
    const ok = window.confirm("¿Eliminar este vehículo?");
    if (!ok) return;

    setIsSaving(true);
    setError(null);
    try {
      await runAction({ action: "delete_vehicle", idVehiculo });
      if (editingId === idVehiculo) {
        cancelEdit();
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePause(vehiculo: Vehiculo) {
    if (vehiculo.estado !== "pausado") {
      setPausingVehicleId(vehiculo.idVehiculo);
      setPauseReasons((current) => ({
        ...current,
        [vehiculo.idVehiculo]: vehiculo.motivoPausa ?? current[vehiculo.idVehiculo] ?? "",
      }));
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await runAction({ action: "set_vehicle_state", idVehiculo: vehiculo.idVehiculo, estado: "activo" });

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado del vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmPause(vehiculo: Vehiculo) {
    const motivo = pauseReasons[vehiculo.idVehiculo]?.trim() ?? "";
    if (!motivo) {
      setError("Debés indicar un motivo para pausar el vehículo.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await runAction({
        action: "set_vehicle_state",
        idVehiculo: vehiculo.idVehiculo,
        estado: "pausado",
        motivoPausa: motivo,
      });

      setPausingVehicleId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo pausar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelPause(idVehiculo: number) {
    setPausingVehicleId(null);
    setPauseReasons((current) => ({ ...current, [idVehiculo]: "" }));
    setError(null);
  }

  function openDetails(vehiculo: Vehiculo) {
    setDetailsVehicleId(vehiculo.idVehiculo);
  }

  function closeDetails() {
    setDetailsVehicleId(null);
  }

  const pageStart = vehiculos.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFilteredVehiculos, page * pageSize);

  return (
    <div className={`mx-auto max-w-7xl p-4 text-slate-800 md:p-6 ${adminPageShell}`}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Vehículos
        </h1>
        <p className="text-sm text-slate-600">
          Alta, edición y eliminación de flota. Los cambios se guardan en base local.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Vehículos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalVehiculos}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Estado</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {pausadosCount}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{activosCount}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-500">Pausados</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pausadosCount}</p>
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5 shadow-sm`}>
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Buscar vehículos</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Elegí el criterio de búsqueda, escribí el valor y después aplicá un filtro rápido si hace falta.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Filtros rápidos</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)]">
          <form
            action="/dashboard/logistic-admin/vehiculos"
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const queryValue = String(formData.get("query") ?? "");
              router.push(buildQueryHref({ query: queryValue, searchBy: selectedSearchBy, page: 1 }, searchQuery, selectedSearchBy, statusFilter, page));
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="searchBy" value={selectedSearchBy} />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <label className="sr-only" htmlFor="vehiculos-search">
              Buscar vehículos
            </label>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Buscar por</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:max-w-xs">
                  {searchOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedSearchBy(option.value)}
                      aria-pressed={selectedSearchBy === option.value}
                      className={`rounded-xl px-3 py-2 text-center text-sm font-medium transition-all ${
                        selectedSearchBy === option.value
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  id="vehiculos-search"
                  name="query"
                  defaultValue={searchQuery}
                  placeholder={searchOptions.find((option) => option.value === selectedSearchBy)?.placeholder ?? "Buscar vehículos"}
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button type="submit" className={adminButtonClass("edit", "sm")}>Buscar</button>
              </div>

              {searchQuery ? (
                <Link
                  href={buildQueryHref({ query: "", page: 1 }, searchQuery, selectedSearchBy, statusFilter, page)}
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Limpiar búsqueda
                </Link>
              ) : null}
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action="/dashboard/logistic-admin/vehiculos" method="get" className="space-y-3">
              <input type="hidden" name="query" value={searchQuery} />
              <input type="hidden" name="searchBy" value={selectedSearchBy} />
              <input type="hidden" name="page" value="1" />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtrar por</span>
                <select
                  name="status"
                  value={statusFilter}
                  onChange={(event) => {
                    router.push(buildQueryHref({ status: event.currentTarget.value as VehiculoStatus, page: 1 }, searchQuery, selectedSearchBy, statusFilter, page));
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="todos">Todos los estados</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Este filtro te ayuda a ir directo al estado sin perder la búsqueda escrita.</p>
            </form>
          </div>
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5`}>
        <h2 className="text-lg font-semibold text-slate-900">Agregar vehículo</h2>

        <form onSubmit={handleAddSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={addForm.patente}
            onChange={(event) => setAddForm((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))}
            placeholder="Patente"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={isSaving}
          />
          <select
            value={addForm.tipo}
            onChange={(event) => setAddForm((prev) => ({ ...prev, tipo: event.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={isSaving}
          >
            <option value="">Seleccione tipo</option>
            <option value="Camioneta">Camioneta</option>
            <option value="Furgón">Furgón</option>
            <option value="Camión">Camión</option>
            <option value="Moto">Moto</option>
            <option value="Otro">Otro</option>
          </select>
          <input
            type="number"
            min={1}
            value={addForm.capacidadBidones}
            onChange={(event) => setAddForm((prev) => ({ ...prev, capacidadBidones: event.target.value }))}
            placeholder="Capacidad bidones"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className={adminButtonClass("edit")}>
              Agregar
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {vehiculos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {searchQuery || statusFilter !== "todos"
            ? `No hay resultados para ${searchQuery ? `"${searchQuery}"` : "el filtro seleccionado"}.`
            : "No hay vehículos asociados a la empresa."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {pageStart}-{pageEnd} de {totalFilteredVehiculos} vehículos
            </p>
            <p>
              Página {page} de {totalPages}
            </p>
          </div>
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[130px] px-3 py-3">Patente</th>
                <th className="w-[140px] px-3 py-3">Tipo</th>
                <th className="w-[110px] px-3 py-3">Estado</th>
                <th className="w-[170px] px-3 py-3">Chofer</th>
                <th className="w-[120px] px-3 py-3">Capacidad</th>
                <th className="w-[150px] px-3 py-3">Pausa</th>
                <th className="w-[240px] px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((vehiculo) => (
                <Fragment key={vehiculo.idVehiculo}>
                  <tr className="border-t border-slate-100 text-sm text-slate-700 align-top">
                    <td className="px-3 py-4">
                      {editingId === vehiculo.idVehiculo ? (
                        <input
                          value={editForm.patente}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))}
                          placeholder="Patente"
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          disabled={isSaving}
                        />
                      ) : (
                        <p className="font-medium text-slate-900">{vehiculo.patente}</p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {editingId === vehiculo.idVehiculo ? (
                        <select
                          value={editForm.tipo}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, tipo: event.target.value }))}
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          disabled={isSaving}
                        >
                          <option value="">Seleccione tipo</option>
                          <option value="Camioneta">Camioneta</option>
                          <option value="Furgón">Furgón</option>
                          <option value="Camión">Camión</option>
                          <option value="Moto">Moto</option>
                          <option value="Otro">Otro</option>
                        </select>
                      ) : (
                        <p className="font-medium text-slate-900">{vehiculo.tipo}</p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${vehicleStatusClass(vehiculo.estado)}`}>
                        {vehicleStatusLabel(vehiculo.estado)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-medium text-slate-900">{vehiculo.assignedToChoferName ?? "Sin asignar"}</p>
                    </td>
                    <td className="px-3 py-4">
                      {editingId === vehiculo.idVehiculo ? (
                        <input
                          type="number"
                          min={1}
                          value={editForm.capacidadBidones}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, capacidadBidones: event.target.value }))}
                          placeholder="Capacidad bidones"
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          disabled={isSaving}
                        />
                      ) : (
                        <p className="font-medium text-slate-900">{vehiculo.capacidadBidones} bidones</p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {vehiculo.estado === "pausado" ? (
                        <div className="space-y-2">
                          <button type="button" onClick={() => openDetails(vehiculo)} className="text-left text-xs font-medium text-sky-600 hover:text-sky-700">
                            Ver motivo
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">-</p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-nowrap items-start justify-center gap-1.5 whitespace-nowrap">
                        {editingId === vehiculo.idVehiculo ? (
                          <>
                            <button type="button" onClick={() => handleUpdateVehicle(new Event("submit") as unknown as React.FormEvent<HTMLFormElement>, vehiculo.idVehiculo)} disabled={isSaving} className={adminButtonClass("save", "sm")}>
                              {isSaving ? "Guardando..." : "Guardar"}
                            </button>
                            <button type="button" onClick={cancelEdit} disabled={isSaving} className={adminButtonClass("cancel", "sm")}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(vehiculo)} disabled={isSaving} className={adminButtonClass("edit", "sm")}>
                              Editar
                            </button>
                            <button type="button" onClick={() => handleDelete(vehiculo.idVehiculo)} disabled={isSaving} className={adminButtonClass("danger", "sm")}>
                              Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePause(vehiculo)}
                              disabled={isSaving}
                              className={adminButtonClass("warning", "sm")}
                            >
                              {vehiculo.estado === "pausado" ? "Reanudar uso" : "Pausar uso"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {pausingVehicleId === vehiculo.idVehiculo ? (
                    <tr className="border-t border-slate-100 bg-amber-50/50">
                      <td colSpan={7} className="px-3 py-4">
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                          <label className="space-y-2">
                            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Motivo de pausa</span>
                            <textarea
                              value={pauseReasons[vehiculo.idVehiculo] ?? ""}
                              onChange={(event) =>
                                setPauseReasons((current) => ({
                                  ...current,
                                  [vehiculo.idVehiculo]: event.target.value,
                                }))
                              }
                              rows={3}
                              placeholder="Fallas mecánicas, trámite, revisión, etc."
                              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                              disabled={isSaving}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => handleConfirmPause(vehiculo)}
                              disabled={isSaving}
                              className={adminButtonClass("warning", "sm")}
                            >
                              {isSaving ? "Guardando..." : "Confirmar pausa"}
                            </button>
                            <button type="button" onClick={() => handleCancelPause(vehiculo.idVehiculo)} disabled={isSaving} className={adminButtonClass("cancel", "sm")}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>

          {detailsVehicleId !== null ? (
            (() => {
              const vehicle = vehiculos.find((item) => item.idVehiculo === detailsVehicleId);
              if (!vehicle) return null;

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={closeDetails}>
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`vehicle-details-${vehicle.idVehiculo}`}
                    className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 id={`vehicle-details-${vehicle.idVehiculo}`} className="text-xl font-semibold text-slate-900">
                          Motivo de pausa
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {vehicle.patente} · {vehicle.tipo}
                        </p>
                      </div>
                      <button type="button" onClick={closeDetails} className={adminButtonClass("cancel", "sm")}>
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="whitespace-pre-wrap leading-6">{vehicle.motivoPausa ?? "Sin motivo registrado."}</p>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFilteredVehiculos}</p>
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
