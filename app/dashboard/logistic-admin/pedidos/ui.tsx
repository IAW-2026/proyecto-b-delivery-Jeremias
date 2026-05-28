"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import { adminButtonClass } from "../styles";

type Chofer = {
  idChofer: number;
  nombre: string;
  idVehiculo: number | null;
  estado: string;
};

type Props = {
  orders: LogisticOrder[];
  choferes: Chofer[];
};

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "ready", label: "Listo" },
  { value: "asignado", label: "Asignado" },
  { value: "en_camino", label: "En camino" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "revision", label: "Revisión" },
];

function statusBadgeClass(status: OrderStatus) {
  if (status === "ready") return "bg-blue-100 text-blue-700";
  if (status === "asignado") return "bg-violet-100 text-violet-700";
  if (status === "en_camino") return "bg-amber-100 text-amber-700";
  if (status === "entregado") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelado") return "bg-red-100 text-red-700";
  return "bg-violet-100 text-violet-700";
}

function formatStatus(status: OrderStatus) {
  if (status === "ready") return "Listo";
  if (status === "asignado") return "Asignado";
  if (status === "en_camino") return "En camino";
  if (status === "cancelado") return "Cancelado";
  if (status === "revision") return "Revisión";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusNeedsChofer(status: OrderStatus) {
  return status === "en_camino" || status === "entregado";
}

export default function LogisticAdminPedidosUi({ orders, choferes }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | OrderStatus>("todos");
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
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
  const assignableChoferes = useMemo(() => activeChoferes.filter((chofer) => chofer.idVehiculo !== null), [activeChoferes]);

  const totals = useMemo(() => {
    return orders.reduce(
      (accumulator, order) => {
        accumulator[order.status] += 1;
        return accumulator;
      },
      { ready: 0, asignado: 0, en_camino: 0, entregado: 0, cancelado: 0, revision: 0 } as Record<OrderStatus, number>
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "todos") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

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
      const selectedChofer = nextChoferId ? assignableChoferes.find((chofer) => String(chofer.idChofer) === nextChoferId) : null;

      if (selectedChofer && selectedChofer.idVehiculo === null) {
        throw new Error("Ese chofer no tiene vehículo asignado. No se puede asignan el pedido.");
      }

      if (statusNeedsChofer(nextStatus) && !nextChoferId) {
        throw new Error("Ese estado requiere un chofer asignado.");
      }

      const currentChoferId = order.assignedToChoferId !== null ? String(order.assignedToChoferId) : "";

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
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Asignado</p><p className="mt-1 text-2xl font-semibold text-violet-600">{totals.asignado}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">En camino</p><p className="mt-1 text-2xl font-semibold text-amber-600">{totals.en_camino}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Entregados</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{totals.entregado}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Cancelados</p><p className="mt-1 text-2xl font-semibold text-red-600">{totals.cancelado}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Revisión</p><p className="mt-1 text-2xl font-semibold text-violet-600">{totals.revision}</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Filtrar pedidos</p>
            <p className="text-xs text-slate-500">Mostrá todos o solo los pedidos de un estado específico.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* CORREGIDO: Ahora usa border-blue-600 y bg-blue-600 cuando está seleccionado */}
            <button 
              type="button" 
              onClick={() => setStatusFilter("todos")} 
              className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "todos" 
                  ? "border-blue-600 bg-blue-600 text-white" 
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Todos
            </button>
            {statusOptions.map((option) => (
              <button 
                key={option.value} 
                type="button" 
                onClick={() => setStatusFilter(option.value)} 
                className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === option.value 
                    ? "border-blue-600 bg-blue-600 text-white" 
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {statusFilter === "todos" ? "No hay pedidos cargados en este momento." : `No hay pedidos en estado ${formatStatus(statusFilter)}.`}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
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
              {filteredOrders.map((order) => (
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
                      <select
                        value={choferSelection[order.idPedido] ?? ""}
                        onChange={(event) =>
                          setChoferSelection((current) => ({
                            ...current,
                            [order.idPedido]: event.target.value,
                          }))
                        }
                        disabled={busyId === order.idPedido}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Sin asignar</option>
                        {assignableChoferes.map((chofer) => (
                          <option key={chofer.idChofer} value={chofer.idChofer}>
                            {chofer.nombre}
                          </option>
                        ))}
                      </select>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}