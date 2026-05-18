type PedidoEntrante = {
  idPedido: number;
  estado: string;
  direccion: string;
  cliente: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
};

const pedidosListos: PedidoEntrante[] = [];

function validarPedido(data: unknown): data is PedidoEntrante {
  if (!data || typeof data !== "object") return false;
  const pedido = data as Partial<PedidoEntrante>;

  return (
    typeof pedido.idPedido === "number" &&
    typeof pedido.estado === "string" &&
    typeof pedido.direccion === "string" &&
    typeof pedido.cliente === "string" &&
    typeof pedido.cantBidones === "number" &&
    typeof pedido.zona === "string" &&
    (pedido.telefono === undefined || typeof pedido.telefono === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pedidos = Array.isArray(body) ? body : [body];

    const invalidos = pedidos.filter((pedido) => !validarPedido(pedido));
    if (invalidos.length > 0) {
      return Response.json(
        {
          ok: false,
          error: "Payload inválido",
          detail:
            "Se espera PedidoEntrante o PedidoEntrante[] con idPedido, estado, direccion, cliente, cantBidones y zona.",
        },
        { status: 400 }
      );
    }

    const pedidosValidados = pedidos as PedidoEntrante[];

    for (const pedido of pedidosValidados) {
      const index = pedidosListos.findIndex((item) => item.idPedido === pedido.idPedido);
      if (index >= 0) {
        pedidosListos[index] = pedido;
      } else {
        pedidosListos.push(pedido);
      }
    }

    return Response.json({
      ok: true,
      action: "upsert_ready_orders",
      received: pedidosValidados.length,
      total: pedidosListos.length,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "JSON inválido",
      },
      { status: 400 }
    );
  }
}
