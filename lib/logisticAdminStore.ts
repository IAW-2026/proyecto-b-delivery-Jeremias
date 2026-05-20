export type PedidoEntrante = {
  idPedido: number;
  estado: string;
  direccion: string;
  cliente: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
};

export type LogisticOrder = PedidoEntrante & {
  assignedToChoferId: number | null;
  assignedToChoferName: string | null;
  status: "ready" | "assigned" | "cancelled";
  updatedAt: string;
};

type LogisticAdminStore = {
  orders: LogisticOrder[];
};

const globalForLogisticAdmin = globalThis as unknown as {
  logisticAdminStore?: LogisticAdminStore;
};

const store: LogisticAdminStore = globalForLogisticAdmin.logisticAdminStore ?? {
  orders: [],
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

export function getOrders() {
  return store.orders.map(cloneOrder);
}

export function upsertReadyOrders(pedidos: PedidoEntrante[]) {
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

  return getOrders();
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