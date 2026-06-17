import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

const VALID_STATUSES = ["ready", "asignado", "en_camino", "entregado", "cancelado", "revision"];

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

  let body: { status?: string };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.pedido.findUnique({
      where: { idPedido },
      select: { idPedido: true, idChoferAsignado: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    await prisma.pedido.update({
      where: { idPedido },
      data: {
        estado: body.status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return NextResponse.json({ error: "Error al actualizar el estado del pedido" }, { status: 500 });
  }
}
