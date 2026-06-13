import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ReadyOrderInput = {
  idPedidoExterno: number;
  idVendedor: number;
  cliente: string;
  direccion: string;
  telefono: string | null;
  cantBidones: number;
  zona: string;
};

function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.DELIVERY_API_KEY;
}

function normalizePayload(payload: unknown): ReadyOrderInput[] | null {
  if (!payload || typeof payload !== "object") return null;

  const body = payload as { pedidos?: unknown };
  if (!Array.isArray(body.pedidos) || body.pedidos.length === 0) return null;

  const pedidos: ReadyOrderInput[] = [];

  for (const item of body.pedidos) {
    if (!item || typeof item !== "object") return null;

    const p = item as Record<string, unknown>;
    const idPedidoExterno = Number(p.id_pedido_externo);
    const idVendedor = Number(p.id_vendedor);
    const cliente = String(p.cliente ?? "").trim();
    const direccion = String(p.direccion ?? "").trim();
    const telefono = p.telefono != null ? String(p.telefono).trim() : null;
    const cantBidones = Number(p.cant_bidones);
    const zona = String(p.zona ?? "").trim();

    if (!Number.isInteger(idPedidoExterno) || idPedidoExterno <= 0) return null;
    if (!Number.isInteger(idVendedor) || idVendedor <= 0) return null;
    if (!cliente) return null;
    if (!direccion) return null;
    if (!Number.isInteger(cantBidones) || cantBidones <= 0) return null;
    if (!zona) return null;

    pedidos.push({ idPedidoExterno, idVendedor, cliente, direccion, telefono: telefono || null, cantBidones, zona });
  }

  return pedidos;
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pedidos = normalizePayload(body);

  if (!pedidos) {
    return NextResponse.json(
      {
        error:
          "El body debe incluir un array 'pedidos' con id_pedido_externo, id_vendedor, cliente, direccion, cant_bidones y zona",
      },
      { status: 400 }
    );
  }

  const results: Array<{
    idPedido: number;
    idPedidoExterno: number;
    idVendedor: number;
    created: boolean;
  }> = [];

  for (const pedido of pedidos) {
    try {
      const existing = await prisma.pedido.findFirst({
        where: {
          idVendedor: pedido.idVendedor,
          idPedidoExterno: pedido.idPedidoExterno,
        },
      });

      if (existing) {
        await prisma.pedido.update({
          where: { idPedido: existing.idPedido },
          data: {
            cliente: pedido.cliente,
            direccion: pedido.direccion,
            telefono: pedido.telefono,
            cantBidones: pedido.cantBidones,
            zona: pedido.zona,
            updatedAt: new Date(),
          },
        });
        results.push({
          idPedido: existing.idPedido,
          idPedidoExterno: pedido.idPedidoExterno,
          idVendedor: pedido.idVendedor,
          created: false,
        });
      } else {
        const created = await prisma.pedido.create({
          data: {
            idVendedor: pedido.idVendedor,
            idPedidoExterno: pedido.idPedidoExterno,
            cliente: pedido.cliente,
            direccion: pedido.direccion,
            telefono: pedido.telefono,
            cantBidones: pedido.cantBidones,
            zona: pedido.zona,
            estado: "ready",
          },
        });
        results.push({
          idPedido: created.idPedido,
          idPedidoExterno: pedido.idPedidoExterno,
          idVendedor: pedido.idVendedor,
          created: true,
        });
      }
    } catch (error) {
      console.error(
        `Error processing order (vendedor=${pedido.idVendedor}, externalId=${pedido.idPedidoExterno}):`,
        error
      );
      return NextResponse.json(
        { error: "Error al guardar pedidos en la base de datos", detail: String(error) },
        { status: 500 }
      );
    }
  }

  try {
    revalidatePath("/dashboard/logistic-admin/pedidos");
    revalidatePath("/dashboard/admin-delivery/pedidos");
  } catch {
    // revalidation is optional
  }

  return NextResponse.json(
    { ok: true, received: pedidos.length, pedidos: results },
    { status: 201 }
  );
}
