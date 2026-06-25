const FEEDBACK_API_URL = process.env.FEEDBACK_API_URL;
const FEEDBACK_API_KEY = process.env.FEEDBACK_API_KEY;

export async function notifyFeedback(idPedidoExterno: string) {
  if (!FEEDBACK_API_URL || !FEEDBACK_API_KEY || !idPedidoExterno) return;

  try {
    await fetch(FEEDBACK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FEEDBACK_API_KEY,
      },
      body: JSON.stringify({ id_pedido: idPedidoExterno }),
    });
  } catch {
    // no romper el flujo si feedback no responde
  }
}
