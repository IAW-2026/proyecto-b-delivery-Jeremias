import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { setOrderStatus } from "@/lib/logisticAdminStore";
import { getChoferStatus } from "@/lib/choferStatus";

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  return NextResponse.json(await getChoferStatus(userId), { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      select: { idChofer: true },
    });

    if (!chofer) {
      return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
    }

    const body = (await request.json()) as { idPedido?: number; estado?: string };
    if (typeof body.idPedido !== "number" || typeof body.estado !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const currentStatus = await getChoferStatus(userId);
    const order = currentStatus.pedidos.find((pedido) => pedido.idPedido === body.idPedido);
    if (!order) {
      return NextResponse.json({ error: "Pedido not found" }, { status: 404 });
    }

    if (body.estado === "asignado" || body.estado === "en_camino" || body.estado === "entregado" || body.estado === "revision" || body.estado === "ready") {
      const pedidoDb = await prisma.pedido.findUnique({ where: { idPedido: body.idPedido } });
      if (!pedidoDb) return NextResponse.json({ error: "Pedido not found" }, { status: 404 });

      // Only allow changing status for orders assigned to this chofer (except marking ready/revision)
      if ((body.estado === "asignado" || body.estado === "en_camino" || body.estado === "entregado") && pedidoDb.idChoferAsignado !== chofer.idChofer) {
        return NextResponse.json({ error: "Pedido not assigned to this chofer" }, { status: 409 });
      }

      const shouldClearAssignment = ["ready", "cancelado", "revision"].includes(body.estado);

      try {
        const updated = await prisma.pedido.update({
          where: { idPedido: body.idPedido },
          data: {
            estado: body.estado,
            idChoferAsignado: shouldClearAssignment ? null : pedidoDb.idChoferAsignado,
            assignedAt: shouldClearAssignment ? null : pedidoDb.assignedAt,
            updatedAt: new Date(),
          },
          include: { choferAsignado: true },
        });

        return NextResponse.json({ ok: true, pedido: updated }, { status: 200 });
      } catch (e) {
        return NextResponse.json({ error: "Failed to update pedido" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  } catch (error) {
    console.error("chofer status POST error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}