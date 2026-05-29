"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import { adminButtonClass } from "../styles";

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
  searchBy: "cliente" | "calle" | "chofer" | "zona";
  assignmentFilter: "todos" | "sin_asignar";
  statusFilter: "todos" | OrderStatus;
  page: number;
  totalPages: number;
  totalFilteredOrders: number;
};

const searchOptions: Array<{ value: "cliente" | "calle" | "chofer" | "zona"; label: string; placeholder: string }> = [
  { value: "cliente", label: "Cliente", placeholder: "Buscar por cliente" },
  { value: "calle", label: "Calle", placeholder: "Buscar por calle" },
  { value: "chofer", label: "Chofer", placeholder: "Buscar por chofer" },
  { value: "zona", label: "Zona", placeholder: "Buscar por zona" },
];

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "ready", label: "Listo" },
  { value: "en_camino", label: "En camino" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "revision", label: "Revisión" },
];

const pageSize = 8;

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

function statusNeedsChofer(status: OrderStatus) {
  return status === "en_camino" || status === "entregado";
}

function normalizeZonaName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [selectedSearchBy, setSelectedSearchBy] = useState(searchBy);
  const [choferSelection, setChoferSelection] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const order of orders) {
      initial[order.idPedido] = order.assignedToChoferId !== null ? String(order.assignedToChoferId) : "";
    }
    return initial;
  });
  const [selectedStatuses, setSelectedStatuses] = useState<Record<number, OrderStatus>>(() => {
    const initial: Record<number, OrderStatus> = {} as Record<number, OrderStatus>;
    for (const order of orders) {
      initial[order.idPedido] = order.status;
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const activeChoferes = useMemo(() => choferes.filter((chofer) => chofer.estado === "activo"), [choferes]);

  function getAssignablesForZone(zoneName: string) {
    const normalizedZone = normalizeZonaName(zoneName);

    return activeChoferes.filter((chofer) => {
      if (chofer.idVehiculo === null || !chofer.zona?.nombre) {
        return false;
      }

      return normalizeZonaName(chofer.zona.nombre) === normalizedZone;
    });
  }

  const totals = useMemo(() => {
    return orders.reduce(
      (accumulator, order) => {
        accumulator[order.status] += 1;
        return accumulator;
      },
      { ready: 0, en_camino: 0, entregado: 0, cancelado: 0, revision: 0 } as Record<OrderStatus, number>
    );
  }, [orders]);
  const assignedOrdersCount = orders.filter((order) => order.assignedToChoferId !== null).length;

  const pageStart = orders.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFilteredOrders, page * pageSize);
  const editingOrder = editingOrderId !== null ? orders.find((order) => order.idPedido === editingOrderId) ?? null : null;
  const editingOrderAssignables = editingOrder ? getAssignablesForZone(editingOrder.zona) : [];
  const editingOrderCurrentChofer = editingOrder
    ? choferes.find((chofer) => String(chofer.idChofer) === String(editingOrder.assignedToChoferId)) ?? null
    : null;
  const editingOrderCurrentChoferIsAssignable = editingOrderCurrentChofer
    ? editingOrderAssignables.some((chofer) => chofer.idChofer === editingOrderCurrentChofer.idChofer)
    : false;
  const editingOrderWarning = editingOrder
    ? editingOrderAssignables.length === 0
      ? "No hay choferes activos con vehículo para esta zona."
      : editingOrderCurrentChofer && !editingOrderCurrentChoferIsAssignable
        ? "El chofer actual no pertenece a esta zona."
        : null
    : null;

  function buildQueryHref(nextValues: { query?: string; searchBy?: "cliente" | "calle" | "chofer" | "zona"; assign?: "todos" | "sin_asignar"; status?: "todos" | OrderStatus; page?: number }) {
    const params = new URLSearchParams();
    const nextQuery = nextValues.query ?? searchQuery;
    const nextSearchBy = nextValues.searchBy ?? searchBy;
    const nextAssign = nextValues.assign ?? assignmentFilter;
    const nextStatus = nextValues.status ?? statusFilter;
    const nextPage = nextValues.page ?? page;

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    if (nextSearchBy !== "cliente") {
      params.set("searchBy", nextSearchBy);
    }

    if (nextAssign !== "todos") {
      params.set("assign", nextAssign);
    }

    if (nextStatus !== "todos") {
      params.set("status", nextStatus);
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    const queryString = params.toString();
    return queryString ? `/dashboard/logistic-admin/pedidos?${queryString}` : "/dashboard/logistic-admin/pedidos";
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

  function startEdit(order: LogisticOrder) {
    setEditingOrderId(order.idPedido);
    setChoferSelection((current) => ({
      ...current,
      [order.idPedido]: order.assignedToChoferId !== null ? String(order.assignedToChoferId) : "",
    }));
    setSelectedStatuses((current) => ({
      ...current,
      [order.idPedido]: order.status,
    }));
    setError(null);
  }

  function cancelEdit(order: LogisticOrder) {
    setEditingOrderId(null);
    setChoferSelection((current) => ({
      ...current,
      [order.idPedido]: order.assignedToChoferId !== null ? String(order.assignedToChoferId) : "",
    }));
    setSelectedStatuses((current) => ({
      ...current,
      [order.idPedido]: order.status,
    }));
    setError(null);
  }

  async function saveEdit(order: LogisticOrder) {
    setBusyId(order.idPedido);
    setError(null);

    try {
      const nextChoferId = choferSelection[order.idPedido] ?? "";
      const nextStatus = selectedStatuses[order.idPedido] ?? order.status;
      const assignableChoferes = getAssignablesForZone(order.zona);
      const currentChoferId = order.assignedToChoferId !== null ? String(order.assignedToChoferId) : "";
      const selectedChofer = nextChoferId ? assignableChoferes.find((chofer) => String(chofer.idChofer) === nextChoferId) : null;

      if (selectedChofer && selectedChofer.idVehiculo === null) {
        throw new Error("Ese chofer no tiene vehículo asignado. No se puede asignan el pedido.");
      }

      if (selectedChofer && selectedChofer.zona?.nombre && normalizeZonaName(selectedChofer.zona.nombre) !== normalizeZonaName(order.zona)) {
        throw new Error("Ese chofer no pertenece a la zona del pedido.");
      }

      if (nextChoferId && !selectedChofer && nextChoferId !== currentChoferId) {
        throw new Error("Solo podés asignar un chofer activo de la misma zona del pedido.");
      }

      if (statusNeedsChofer(nextStatus) && !nextChoferId) {
        throw new Error("Ese estado requiere un chofer asignado.");
      }

      if (nextChoferId !== currentChoferId) {
        if (!nextChoferId) {
          await runAction({ action: "unassign_order", idPedido: order.idPedido });
        } else {
          await runAction({ action: "assign_order", idPedido: order.idPedido, idChofer: Number(nextChoferId) });
        }
      }

      if (nextStatus !== order.status) {
        await runAction({ action: "update_order_status", idPedido: order.idPedido, status: nextStatus });
      }

      setEditingOrderId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar los cambios");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(order: LogisticOrder) {
    const ok = window.confirm(`¿Eliminar el pedido #${order.idPedido}?`);
    if (!ok) return;

    setBusyId(order.idPedido);
    setError(null);

    try {
      if (editingOrderId === order.idPedido) {
        setEditingOrderId(null);
      }

      await runAction({ action: "delete_order", idPedido: order.idPedido });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el pedido");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-6">
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Listo</p><p className="mt-1 text-2xl font-semibold text-blue-600">{totals.ready}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Asignados</p><p className="mt-1 text-2xl font-semibold text-violet-600">{assignedOrdersCount}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">En camino</p><p className="mt-1 text-2xl font-semibold text-amber-600">{totals.en_camino}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Entregados</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{totals.entregado}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Cancelados</p><p className="mt-1 text-2xl font-semibold text-red-600">{totals.cancelado}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Revisión</p><p className="mt-1 text-2xl font-semibold text-violet-600">{totals.revision}</p></div>
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
            action="/dashboard/logistic-admin/pedidos"
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const queryValue = String(formData.get("query") ?? "");
              router.push(buildQueryHref({ query: queryValue, searchBy: selectedSearchBy, page: 1 }));
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
                  id="pedidos-search"
                  name="query"
                  defaultValue={searchQuery}
                  placeholder={searchOptions.find((option) => option.value === selectedSearchBy)?.placeholder ?? "Buscar pedidos"}
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button type="submit" className={adminButtonClass("edit", "sm")}>Buscar</button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action="/dashboard/logistic-admin/pedidos" method="get" className="space-y-3">
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
                      router.push(buildQueryHref({ assign: "sin_asignar", status: "todos", page: 1 }));
                      return;
                    }

                    router.push(buildQueryHref({ assign: "todos", status: nextValue as "todos" | OrderStatus, page: 1 }));
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
              href={buildQueryHref({ query: "", page: 1 })}
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
                <th className="w-[220px] px-3 py-3">Cliente</th>
                <th className="w-[120px] px-3 py-3">Zona</th>
                <th className="w-[90px] px-3 py-3">Bidones</th>
                <th className="w-[180px] px-3 py-3">Chofer</th>
                <th className="w-[140px] px-3 py-3">Estado</th>
                <th className="w-[200px] px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const assignableChoferes = getAssignablesForZone(order.zona);
                const currentChofer = choferes.find((chofer) => String(chofer.idChofer) === String(order.assignedToChoferId));
                const currentChoferIsAssignable = currentChofer
                  ? assignableChoferes.some((chofer) => chofer.idChofer === currentChofer.idChofer)
                  : false;

                return (
                  <tr key={order.idPedido} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="w-[80px] px-3 py-3 font-medium whitespace-nowrap">#{order.idPedido}</td>
                    <td className="w-[220px] px-3 py-3">
                      <p className="truncate font-medium text-slate-900">{order.cliente}</p>
                      <p className="text-xs text-slate-500">{order.direccion}</p>
                    </td>
                    <td className="w-[120px] px-3 py-3 truncate">{order.zona}</td>
                    <td className="w-[90px] px-3 py-3 whitespace-nowrap">{order.cantBidones}</td>
                    <td className="w-[180px] px-3 py-3 align-middle">
                      {editingOrderId === order.idPedido ? (
                        <div className="space-y-2">
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
                        </div>
                      ) : (
                        <p className="truncate font-medium text-slate-900">{order.assignedToChoferName ?? "Sin asignar"}</p>
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
                    <td className="w-[200px] px-3 py-3 align-middle">
                      {editingOrderId === order.idPedido ? (
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => saveEdit(order)}
                            disabled={busyId === order.idPedido}
                            className={adminButtonClass("save", "sm")}
                          >
                            {busyId === order.idPedido ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(order)}
                            disabled={busyId === order.idPedido}
                            className={adminButtonClass("cancel", "sm")}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => startEdit(order)}
                            disabled={busyId === order.idPedido}
                            className={adminButtonClass("edit", "sm")}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            disabled={busyId === order.idPedido}
                            className={adminButtonClass("danger", "sm")}
                          >
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
              <Link
                href={buildQueryHref({ page: Math.max(1, page - 1) })}
                aria-disabled={page <= 1}
                className={`${adminButtonClass("cancel", "sm")} ${page <= 1 ? "pointer-events-none opacity-60" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={buildQueryHref({ page: Math.min(totalPages, page + 1) })}
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