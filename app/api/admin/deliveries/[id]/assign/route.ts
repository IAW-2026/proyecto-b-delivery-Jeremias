import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const idPedido = Number(id);

  if (!Number.isInteger(idPedido) || idPedido <= 0) {
    return NextResponse.json({ error: "ID de pedido inválido" }, { status: 400 });
  }

  let body: { idChofer?: number | null };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.idChofer !== undefined && body.idChofer !== null && (!Number.isInteger(body.idChofer) || body.idChofer <= 0)) {
    return NextResponse.json({ error: "ID de chofer inválido" }, { status: 400 });
  }

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { idPedido },
      select: { idPedido: true, idVendedor: true },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (body.idChofer != null) {
      const chofer = await prisma.chofer.findUnique({
        where: { idChofer: body.idChofer },
        select: { idChofer: true, idVendedor: true },
      });

      if (!chofer) {
        return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
      }
    }

    await prisma.pedido.update({
      where: { idPedido },
      data: {
        idChoferAsignado: body.idChofer ?? null,
        assignedAt: body.idChofer ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error assigning delivery:", error);
    return NextResponse.json({ error: "Error al asignar el pedido" }, { status: 500 });
  }
}
