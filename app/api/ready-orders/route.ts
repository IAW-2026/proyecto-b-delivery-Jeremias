import { NextRequest, NextResponse } from "next/server";
import { upsertReadyOrders, type ReadyOrderInput } from "@/lib/readyOrdersStore";

function normalizeReadyOrders(payload: unknown): ReadyOrderInput[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as { pedidos?: unknown };
  if (!Array.isArray(body.pedidos) || body.pedidos.length === 0) {
    return null;
  }

  const pedidos: ReadyOrderInput[] = [];

  for (const item of body.pedidos) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const pedido = item as Partial<Record<"id_pedido" | "id_vendedor", unknown>>;
    const idPedido = Number(pedido.id_pedido);
    const idVendedor = Number(pedido.id_vendedor);

    if (!Number.isInteger(idPedido) || idPedido <= 0 || !Number.isInteger(idVendedor) || idVendedor <= 0) {
      return null;
    }

    pedidos.push({ idPedido, idVendedor });
  }

  return pedidos;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pedidos = normalizeReadyOrders(body);

  if (!pedidos) {
    return NextResponse.json(
      {
        error: "El body debe incluir un array 'pedidos' con id_pedido e id_vendedor",
      },
      { status: 400 }
    );
  }

  const storedOrders = upsertReadyOrders(pedidos);

  return NextResponse.json(
    {
      ok: true,
      received: pedidos.length,
      pedidos: storedOrders,
    },
    { status: 201 }
  );
}