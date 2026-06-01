import { nowIso } from "@/lib/shared/utils";

export type ReadyOrderInput = {
  idPedido: number;
  idVendedor: number;
};

export type ReadyOrderRecord = ReadyOrderInput & {
  available: true;
  receivedAt: string;
  updatedAt: string;
};

type ReadyOrdersStore = {
  orders: ReadyOrderRecord[];
};

const globalForReadyOrders = globalThis as unknown as {
  readyOrdersStore?: ReadyOrdersStore;
};

const store: ReadyOrdersStore = globalForReadyOrders.readyOrdersStore ?? {
  orders: [],
};

if (process.env.NODE_ENV !== "production") {
  globalForReadyOrders.readyOrdersStore = store;
}

export function upsertReadyOrders(pedidos: ReadyOrderInput[]) {
  const now = nowIso();

  for (const pedido of pedidos) {
    const index = store.orders.findIndex((item) => item.idPedido === pedido.idPedido);

    const nextOrder: ReadyOrderRecord =
      index >= 0
        ? {
            ...store.orders[index],
            idVendedor: pedido.idVendedor,
            updatedAt: now,
          }
        : {
            idPedido: pedido.idPedido,
            idVendedor: pedido.idVendedor,
            available: true,
            receivedAt: now,
            updatedAt: now,
          };

    if (index >= 0) {
      store.orders[index] = nextOrder;
    } else {
      store.orders.push(nextOrder);
    }
  }

  return store.orders.map((order) => ({ ...order }));
}

export function getReadyOrders() {
  return store.orders.map((order) => ({ ...order }));
}