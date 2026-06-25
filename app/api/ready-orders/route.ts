import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { detectSuburb } from "@/lib/geocode";
import { matchExistingZone } from "@/lib/match-zone";

type ReadyOrderInput = {
  idPedidoExterno: string;
  idVendedor: string;
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

function normalizePayload(payload: unknown): {
  pedidos: ReadyOrderInput[] | null;
  error: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { pedidos: null, error: "El body debe ser un objeto JSON" };
  }

  const body = payload as { pedidos?: unknown };
  if (!Array.isArray(body.pedidos) || body.pedidos.length === 0) {
    return { pedidos: null, error: "El body debe incluir un array 'pedidos' con al menos un elemento" };
  }

  const pedidos: ReadyOrderInput[] = [];

  for (const [idx, item] of body.pedidos.entries()) {
    if (!item || typeof item !== "object") {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe ser un objeto` };
    }

    const p = item as Record<string, unknown>;
    const idPedidoExterno = String(p.id_pedido_externo ?? "").trim();
    const idVendedor = String(p.id_vendedor ?? "");
    const cliente = String(p.cliente ?? "").trim();
    const direccion = String(p.direccion ?? "").trim();
    const telefono = p.telefono != null ? String(p.telefono).trim() : null;
    const cantBidones = Number(p.cant_bidones);
    const zona = String(p.zona ?? "").trim() || "Sin zona";

    if (!idPedidoExterno) {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe tener 'id_pedido_externo'` };
    }
    if (!idVendedor) {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe tener 'id_vendedor'` };
    }
    if (!cliente) {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe tener 'cliente'` };
    }
    if (!direccion) {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe tener 'direccion'` };
    }
    if (!Number.isInteger(cantBidones) || cantBidones <= 0) {
      return { pedidos: null, error: `El pedido en la posición ${idx} debe tener 'cant_bidones' como número entero positivo` };
    }

    pedidos.push({ idPedidoExterno, idVendedor, cliente, direccion, telefono: telefono || null, cantBidones, zona });
  }

  return { pedidos, error: null };
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

  const { pedidos, error } = normalizePayload(body);

  if (error || !pedidos) {
    return NextResponse.json({ error: error ?? "Error desconocido al validar el payload" }, { status: 400 });
  }

  const results: Array<{
    idPedido: number;
    idPedidoExterno: string;
    idVendedor: string;
    created: boolean;
  }> = [];

  for (const pedido of pedidos) {
    if (pedido.zona === "Sin zona") {
      const suburb = await detectSuburb(pedido.direccion);
      if (suburb) {
        const matched = await matchExistingZone(suburb, pedido.idVendedor);
        pedido.zona = matched ?? suburb;
      }
    }

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
