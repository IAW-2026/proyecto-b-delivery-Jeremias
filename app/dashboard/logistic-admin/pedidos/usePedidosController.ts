"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import { normalizeZonaName } from "@/lib/shared/utils";
import { pageSize } from "@/lib/shared/utils";
import { parsePedidosFilters, statusNeedsChofer, type PedidosFilterState, type SearchBy, type SearchParamsInput } from "./utils";

type Chofer = {
  idChofer: number;
  nombre: string;
  idVehiculo: number | null;
  estado: string;
  zona: { nombre: string } | null;
};

type UsePedidosControllerParams = {
  orders: LogisticOrder[];
  allFilteredOrders: LogisticOrder[];
  choferes: Chofer[];
  searchParams: SearchParamsInput;
  page: number;
  totalFilteredOrders: number;
  basePath?: string;
};

export function usePedidosController({ orders, allFilteredOrders, choferes, searchParams, page, totalFilteredOrders, basePath = "/dashboard/logistic-admin" }: UsePedidosControllerParams) {
  const router = useRouter();
  const filterState: PedidosFilterState = parsePedidosFilters(searchParams);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [motivoOrderId, setMotivoOrderId] = useState<number | null>(null);
  const [selectedSearchBy, setSelectedSearchBy] = useState<SearchBy>(filterState.searchBy);
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
    return allFilteredOrders.reduce(
      (accumulator, order) => {
        accumulator[order.status] += 1;
        return accumulator;
      },
      { ready: 0, en_camino: 0, entregado: 0, cancelado: 0, revision: 0 } as Record<OrderStatus, number>
    );
  }, [allFilteredOrders]);

  const readyUnassignedCount = allFilteredOrders.filter((order) => order.status === "ready" && order.assignedToChoferId === null).length;
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

  function openMotivo(orderId: number) {
    setMotivoOrderId(orderId);
  }

  function closeMotivo() {
    setMotivoOrderId(null);
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
        throw new Error("Ese chofer no tiene vehículo asignado. No se puede asignar el pedido.");
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

  return {
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
    editState: {
      choferSelection,
      selectedStatuses,
      editingOrder,
      editingOrderAssignables,
      editingOrderCurrentChofer,
      editingOrderCurrentChoferIsAssignable,
    },
    handlers: {
      getAssignablesForZone,
      startEdit,
      cancelEdit,
      openMotivo,
      closeMotivo,
      saveEdit,
      handleDelete,
      setChoferSelection,
      setSelectedStatuses,
    },
  };
}
