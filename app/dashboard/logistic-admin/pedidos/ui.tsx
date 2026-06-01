"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import { adminButtonClass } from "../styles";
import { usePedidosController } from "./usePedidosController";
import { buildPedidosQueryHref, searchOptions, statusOptions, statusNeedsChofer, type SearchBy } from "./utils";

type Chofer = {
  idChofer: number;
  nombre: string;
  idVehiculo: number | null;
  estado: string;
  zona: { nombre: string } | null;
};

type Props = {
  orders: LogisticOrder[];
  choferes: Chofer[];
  searchQuery: string;
  searchBy: SearchBy;
  assignmentFilter: "todos" | "sin_asignar";
  statusFilter: "todos" | OrderStatus;
  page: number;
  totalPages: number;
  totalFilteredOrders: number;
  basePath?: string;
};

function statusBadgeClass(status: OrderStatus) {
  if (status === "ready") return "bg-blue-100 text-blue-700";
  if (status === "en_camino") return "bg-amber-100 text-amber-700";
  if (status === "entregado") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelado") return "bg-red-100 text-red-700";
  return "bg-violet-100 text-violet-700";
}

function formatStatus(status: OrderStatus) {
  if (status === "ready") return "Listo para salir";
  if (status === "en_camino") return "En camino";
  if (status === "cancelado") return "Cancelado";
  if (status === "revision") return "Revisión";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function searchOptionMeta(value: SearchBy) {
  if (value === "cliente") return { label: "Cliente", placeholder: "Buscar por cliente" };
  if (value === "calle") return { label: "Calle", placeholder: "Buscar por calle" };
  if (value === "chofer") return { label: "Chofer", placeholder: "Buscar por chofer" };
  return { label: "Zona", placeholder: "Buscar por zona" };
}

export default function LogisticAdminPedidosUi({
  orders,
  choferes,
  searchQuery,
  searchBy,
  assignmentFilter,
  statusFilter,
  page,
  totalPages,
  totalFilteredOrders,
  basePath = "/dashboard/logistic-admin",
}: Props) {
  const router = useRouter();
  const controller = usePedidosController({
    orders,
    choferes,
    searchParams: { query: searchQuery, searchBy, assign: assignmentFilter, status: statusFilter, page: String(page) },
    page,
    totalFilteredOrders,
    basePath,
  });

  const {
    filterState,
    selectedSearchBy,
    setSelectedSearchBy,
    busyId,
    editingOrderId,
    motivoOrderId,
    error,
    pageStart,
    pageEnd,
    totals,
    readyUnassignedCount,
    editingOrderWarning,
    editState,
    handlers,
  } = controller;

  const { choferSelection, selectedStatuses } = editState;
  const { getAssignablesForZone, startEdit, cancelEdit, openMotivo, closeMotivo, saveEdit, handleDelete, setChoferSelection, setSelectedStatuses } = handlers;

  const searchOptionLabels = searchOptions.map((value) => ({ value, ...searchOptionMeta(value) }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pedidos Listos (Sin asignar)</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{readyUnassignedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">En camino</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{totals.en_camino}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">En revisión</p>
          <p className="mt-1 text-2xl font-semibold text-violet-600">{totals.revision}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Buscar pedidos</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Elegí el criterio de búsqueda, escribí el valor y después aplicá un filtro rápido si hace falta.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Filtros rápidos</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
          <form
            action={`${basePath}/pedidos`}
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const queryValue = String(formData.get("query") ?? "");
              router.push(buildPedidosQueryHref({ query: queryValue, searchBy: selectedSearchBy, page: 1 }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`));
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="searchBy" value={selectedSearchBy} />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {assignmentFilter !== "todos" ? <input type="hidden" name="assign" value={assignmentFilter} /> : null}
            <label className="sr-only" htmlFor="pedidos-search">
              Buscar pedidos
            </label>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Buscar por</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">
                  {searchOptionLabels.map((option) => (
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
                  id="pedidos-search"
                  name="query"
                  defaultValue={searchQuery}
                  placeholder={searchOptionLabels.find((option) => option.value === selectedSearchBy)?.placeholder ?? "Buscar pedidos"}
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button type="submit" className={adminButtonClass("edit", "sm")}>Buscar</button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action={`${basePath}/pedidos`} method="get" className="space-y-3">
              <input type="hidden" name="query" value={searchQuery} />
              <input type="hidden" name="searchBy" value={selectedSearchBy} />
              <input type="hidden" name="page" value="1" />
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtrar por</span>
                <select
                  name="quickFilter"
                  value={assignmentFilter === "sin_asignar" ? "sin_asignar" : statusFilter}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value as "todos" | OrderStatus | "sin_asignar";
                    if (nextValue === "sin_asignar") {
                      router.push(buildPedidosQueryHref({ assign: "sin_asignar", status: "todos", page: 1 }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`));
                      return;
                    }

                    router.push(buildPedidosQueryHref({ assign: "todos", status: nextValue as "todos" | OrderStatus, page: 1 }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`));
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="todos">Todos los filtros</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="sin_asignar">Sin asignar</option>
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Incluye estados del pedido y accesos rápidos como la cola sin asignar.</p>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {searchQuery ? (
            <Link
              href={buildPedidosQueryHref({ query: "", page: 1 }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpiar búsqueda
            </Link>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {searchQuery || statusFilter !== "todos"
            ? `No hay resultados para ${searchQuery ? `"${searchQuery}"` : "el filtro seleccionado"}.`
            : "No hay pedidos cargados en este momento."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {editingOrderWarning ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {editingOrderWarning}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {pageStart}-{pageEnd} de {totalFilteredOrders} pedidos
            </p>
            <p>
              Página {page} de {totalPages}
            </p>
          </div>
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[80px] px-3 py-3">Pedido</th>
                <th className="w-[110px] px-3 py-3">Fecha</th>
                <th className="w-[80px] px-3 py-3">Hora</th>
                <th className="w-[220px] px-3 py-3">Cliente</th>
                <th className="w-[120px] px-3 py-3">Zona</th>
                <th className="w-[90px] px-3 py-3">Bidones</th>
                <th className="w-[180px] px-3 py-3">Chofer</th>
                <th className="w-[140px] px-3 py-3">Estado</th>
                <th className="w-[220px] px-3 py-3">Motivo</th>
                <th className="w-[200px] px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const assignableChoferes = getAssignablesForZone(order.zona);
                const currentChofer = choferes.find((chofer) => String(chofer.idChofer) === String(order.assignedToChoferId));
                const currentChoferIsAssignable = currentChofer ? assignableChoferes.some((chofer) => chofer.idChofer === currentChofer.idChofer) : false;

                return (
                  <tr key={order.idPedido} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="w-[80px] px-3 py-3 font-medium whitespace-nowrap">#{order.idPedido}</td>
                    
                    {/* Renderizamos solo la fecha con configuración robusta SSR */}
                    <td suppressHydrationWarning className="border-t border-slate-100 text-sm text-slate-700  ">
                      {order.updatedAt 
                        ? new Date(order.updatedAt).toLocaleDateString("es-AR", { 
                            timeZone: "America/Argentina/Buenos_Aires", 
                            day: "2-digit", 
                            month: "2-digit", 
                            year: "numeric" 
                          }) 
                        : "—"}
                    </td>

                    <td suppressHydrationWarning className="border-t border-slate-100 text-sm text-slate-700">
                      {order.updatedAt 
                        ? new Date(order.updatedAt).toLocaleTimeString("es-AR", { 
                            timeZone: "America/Argentina/Buenos_Aires", 
                            hour: "2-digit", 
                            minute: "2-digit", 
                            hour12: false 
                          }) 
                        : "—"}
                    </td>

                    <td className="w-[220px] px-3 py-3">
                      <p className="truncate font-medium text-slate-900">{order.cliente}</p>
                      <p className="text-xs text-slate-500">{order.direccion}</p>
                    </td>
                    <td className="w-[120px] px-3 py-3 truncate">{order.zona}</td>
                    <td className="w-[90px] px-3 py-3 whitespace-nowrap">{order.cantBidones}</td>
                    <td className="w-[180px] px-3 py-3 align-middle">
                      {editingOrderId === order.idPedido ? (
                        <select
                          value={choferSelection[order.idPedido] ?? ""}
                          onChange={(event) =>
                            setChoferSelection((current) => ({
                              ...current,
                              [order.idPedido]: event.target.value,
                            }))
                          }
                          disabled={busyId === order.idPedido || (assignableChoferes.length === 0 && !currentChofer)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Sin asignar</option>
                          {currentChofer && !currentChoferIsAssignable ? (
                            <option value={currentChofer.idChofer} disabled>
                              {currentChofer.nombre} (fuera de zona)
                            </option>
                          ) : null}
                          {assignableChoferes.map((chofer) => (
                            <option key={chofer.idChofer} value={chofer.idChofer}>
                              {chofer.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="truncate font-medium text-slate-900">
                          {order.assignedToChoferName ?? "Sin asignar"}
                          {order.assignedChoferArchived ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Archivado</span>
                          ) : null}
                        </p>
                      )}
                    </td>
                    <td className="w-[140px] px-3 py-3 align-middle">
                      {editingOrderId === order.idPedido ? (
                        <select
                          value={selectedStatuses[order.idPedido] ?? order.status}
                          onChange={(event) =>
                            setSelectedStatuses((current) => ({
                              ...current,
                              [order.idPedido]: event.target.value as OrderStatus,
                            }))
                          }
                          disabled={busyId === order.idPedido}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value} disabled={statusNeedsChofer(option.value) && (choferSelection[order.idPedido] ?? "") === ""}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(order.status)}`}>{formatStatus(order.status)}</span>
                      )}
                    </td>
                    <td className="w-[220px] px-3 py-3 align-middle">
                      {order.status === "revision" && order.motivoRevision ? (
                        <button type="button" onClick={() => openMotivo(order.idPedido)} className="text-sm font-medium text-blue-600 transition-colors hover:underline">
                          Ver motivo
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="w-[200px] px-3 py-3 align-middle">
                      {editingOrderId === order.idPedido ? (
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <button type="button" onClick={() => saveEdit(order)} disabled={busyId === order.idPedido} className={adminButtonClass("save", "sm")}>
                            {busyId === order.idPedido ? "Guardando..." : "Guardar"}
                          </button>
                          <button type="button" onClick={() => cancelEdit(order)} disabled={busyId === order.idPedido} className={adminButtonClass("cancel", "sm")}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <button type="button" onClick={() => startEdit(order)} disabled={busyId === order.idPedido} className={adminButtonClass("edit", "sm")}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDelete(order)} disabled={busyId === order.idPedido} className={adminButtonClass("danger", "sm")}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFilteredOrders}</p>
            <div className="flex items-center gap-2">
              <Link href={buildPedidosQueryHref({ page: Math.max(1, page - 1) }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`)} aria-disabled={page <= 1} className={`${adminButtonClass("cancel", "sm")} ${page <= 1 ? "pointer-events-none opacity-60" : ""}`}>
                Anterior
              </Link>
              <Link href={buildPedidosQueryHref({ page: Math.min(totalPages, page + 1) }, { ...filterState, searchBy: selectedSearchBy }, `${basePath}/pedidos`)} aria-disabled={page >= totalPages} className={`${adminButtonClass("cancel", "sm")} ${page >= totalPages ? "pointer-events-none opacity-60" : ""}`}>
                Siguiente
              </Link>
            </div>
          </div>
        </div>
      )}

      {motivoOrderId !== null ? (
        (() => {
          const order = orders.find((item) => item.idPedido === motivoOrderId);
          if (!order) return null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={closeMotivo}>
              <div role="dialog" aria-modal="true" aria-labelledby={`motivo-revision-${order.idPedido}`} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`motivo-revision-${order.idPedido}`} className="text-xl font-semibold text-slate-900">
                      Motivo de revisión
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pedido #{order.idPedido} · {order.cliente}
                    </p>
                  </div>
                  <button type="button" onClick={closeMotivo} className={adminButtonClass("cancel", "sm")}>
                    Cerrar
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                  <p className="whitespace-pre-wrap leading-6">{order.motivoRevision ?? "Sin motivo registrado."}</p>
                </div>
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}