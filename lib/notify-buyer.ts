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
  console.log("[syncOrderStatus] START", { idPedidoExterno, estado });
  if (!idPedidoExterno) { console.log("[syncOrderStatus] no idPedidoExterno"); return; }
  const buyerStatus = STATUS_MAP[estado];
  if (!buyerStatus || !BUYER_API_URL || !BUYER_API_KEY) {
    console.log("[syncOrderStatus] missing data", { buyerStatus, hasUrl: !!BUYER_API_URL, hasKey: !!BUYER_API_KEY });
    return;
  }

  try {
    const url = BUYER_API_URL.replace("[order_id]", idPedidoExterno);
    console.log("[syncOrderStatus] sending POST", { url, orderStatus: buyerStatus });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BUYER_API_KEY,
      },
      body: JSON.stringify({ orderStatus: buyerStatus }),
    });
    console.log("[syncOrderStatus] response", { status: res.status, statusText: res.statusText });
    if (!res.ok) {
      const text = await res.text();
      console.log("[syncOrderStatus] error body", text);
    } else {
      console.log("[syncOrderStatus] OK");
    }
  } catch (e) {
    console.log("[syncOrderStatus] fetch failed", e);
  }
}
