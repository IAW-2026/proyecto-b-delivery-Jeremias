const BUYER_API_URL = process.env.BUYER_API_URL;
const BUYER_API_KEY = process.env.BUYER_API_KEY;

const STATUS_MAP: Record<string, string> = {
  ready: "READY",
  en_camino: "IN_DELIVERY",
  entregado: "DELIVERED",
  cancelado: "CANCELLED",
  revision: "IN_REVISION",
};

export async function syncOrderStatus(idPedidoExterno: string | null, estado: string) {
  if (!idPedidoExterno) return;
  const buyerStatus = STATUS_MAP[estado];
  if (!buyerStatus || !BUYER_API_URL || !BUYER_API_KEY) return;

  try {
    await fetch(`${BUYER_API_URL.replace("[order_id]", idPedidoExterno)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BUYER_API_KEY,
      },
      body: JSON.stringify({ orderStatus: buyerStatus }),
    });
  } catch {
    // no romper el flujo si el buyer no responde
  }
}
