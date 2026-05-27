export type PedidoEntrante = {
  idPedido: number;
  estado: string;
  direccion: string;
  cliente: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
};

import { getMockPedidos } from "@/lib/mocks/pedidos";

export type LogisticOrder = PedidoEntrante & {
  assignedToChoferId: number | null;
  assignedToChoferName: string | null;
  status: "ready" | "assigned" | "cancelled";
  updatedAt: string;
};

type ChoferWithZona = {
  idChofer: number;
  nombre: string;
  estado: string;
  disponible: boolean;
  zona: { nombre: string } | null;
};

type LogisticAdminStore = {
  orders: LogisticOrder[];
};

const globalForLogisticAdmin = globalThis as unknown as {
  logisticAdminStore?: LogisticAdminStore;
};

function mapMockPedidoToLogisticOrder(pedido: ReturnType<typeof getMockPedidos>[number]): LogisticOrder {
  const normalizedStatus =
    pedido.estado === "assigned"
      ? "assigned"
      : pedido.estado === "cancelled"
      ? "cancelled"
      : "ready";

  return {
    idPedido: pedido.idPedido,
    estado: pedido.estado,
    direccion: pedido.direccion,
    cliente: pedido.cliente,
    telefono: pedido.telefono,
    cantBidones: pedido.cantBidones,
    zona: pedido.zona,
    assignedToChoferId: null,
    assignedToChoferName: null,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };
}

const store: LogisticAdminStore = globalForLogisticAdmin.logisticAdminStore ?? {
  orders: getMockPedidos().map(mapMockPedidoToLogisticOrder),
};

if (process.env.NODE_ENV !== "production") {
  globalForLogisticAdmin.logisticAdminStore = store;
}

function cloneOrder(order: LogisticOrder): LogisticOrder {
  return { ...order };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeZonaName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function applyAutomaticZoneAssignments(choferes: ChoferWithZona[]) {
  const choferByZone = new Map<string, ChoferWithZona>();

  for (const chofer of choferes.sort((a, b) => a.idChofer - b.idChofer)) {
    if (chofer.estado !== "activo" || !chofer.disponible || !chofer.zona) {
      continue;
    }

    const key = normalizeZonaName(chofer.zona.nombre);
    if (!key || choferByZone.has(key)) {
      continue;
    }

    choferByZone.set(key, chofer);
  }

  for (const order of store.orders) {
    if (order.status !== "ready" || order.assignedToChoferId !== null) {
      continue;
    }

    const chofer = choferByZone.get(normalizeZonaName(order.zona));
    if (!chofer) {
      continue;
    }

    order.assignedToChoferId = chofer.idChofer;
    order.assignedToChoferName = chofer.nombre;
    order.status = "assigned";
    order.updatedAt = nowIso();
  }

  return getOrders();
}

export function getOrders() {
  return store.orders.map(cloneOrder);
}

export function getOrdersForChofer(choferId: number) {
  return store.orders.filter((order) => order.assignedToChoferId === choferId).map(cloneOrder);
}

export function syncAutomaticZoneAssignments(choferes: ChoferWithZona[]) {
  return applyAutomaticZoneAssignments(choferes);
}

export function upsertReadyOrders(pedidos: PedidoEntrante[], choferes: ChoferWithZona[] = []) {
  for (const pedido of pedidos) {
    const index = store.orders.findIndex((item) => item.idPedido === pedido.idPedido);
    const currentOrder = index >= 0 ? store.orders[index] : null;

    const nextOrder: LogisticOrder = currentOrder
      ? {
          ...currentOrder,
          ...pedido,
          status: currentOrder.status,
          updatedAt: nowIso(),
        }
      : {
          ...pedido,
          assignedToChoferId: null,
          assignedToChoferName: null,
          status: "ready",
          updatedAt: nowIso(),
        };

    if (index >= 0) {
      store.orders[index] = nextOrder;
    } else {
      store.orders.push(nextOrder);
    }
  }

  return choferes.length > 0 ? applyAutomaticZoneAssignments(choferes) : getOrders();
}

export function assignOrder(
  idPedido: number,
  choferId: number,
  choferName: string
) {
  const index = store.orders.findIndex((item) => item.idPedido === idPedido);
  if (index < 0) return null;

  const currentOrder = store.orders[index];
  if (currentOrder.status === "cancelled") return currentOrder;

  store.orders[index] = {
    ...currentOrder,
    assignedToChoferId: choferId,
    assignedToChoferName: choferName,
    status: "assigned",
    updatedAt: nowIso(),
  };

  return cloneOrder(store.orders[index]);
}

export function unassignOrder(idPedido: number) {
  const index = store.orders.findIndex((item) => item.idPedido === idPedido);
  if (index < 0) return null;

  const currentOrder = store.orders[index];
  store.orders[index] = {
    ...currentOrder,
    assignedToChoferId: null,
    assignedToChoferName: null,
    status: "ready",
    updatedAt: nowIso(),
  };

  return cloneOrder(store.orders[index]);
}

export function cancelOrder(idPedido: number) {
  const index = store.orders.findIndex((item) => item.idPedido === idPedido);
  if (index < 0) return null;

  const currentOrder = store.orders[index];
  store.orders[index] = {
    ...currentOrder,
    assignedToChoferId: null,
    assignedToChoferName: null,
    status: "cancelled",
    updatedAt: nowIso(),
  };

  return cloneOrder(store.orders[index]);
}