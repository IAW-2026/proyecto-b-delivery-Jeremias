import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(
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

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { idPedido },
      include: {
        choferAsignado: {
          include: {
            vehiculo: {
              select: {
                patente: true,
                tipo: true,
              },
            },
          },
        },
      },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      idPedido: pedido.idPedido,
      estado: pedido.estado,
      cliente: pedido.cliente,
      direccion: pedido.direccion,
      telefono: pedido.telefono,
      cantBidones: pedido.cantBidones,
      zona: pedido.zona,
      idVendedor: pedido.idVendedor,
      idPedidoExterno: pedido.idPedidoExterno,
      motivoRevision: pedido.motivoRevision,
      choferAsignado: pedido.choferAsignado
        ? {
            idChofer: pedido.choferAsignado.idChofer,
            nombre: pedido.choferAsignado.nombre,
            telefono: pedido.choferAsignado.telefono,
            vehiculo: pedido.choferAsignado.vehiculo
              ? { patente: pedido.choferAsignado.vehiculo.patente, tipo: pedido.choferAsignado.vehiculo.tipo }
              : null,
          }
        : null,
      createdAt: pedido.assignedAt ?? pedido.updatedAt,
      assignedAt: pedido.assignedAt,
      updatedAt: pedido.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching delivery:", error);
    return NextResponse.json({ error: "Error al obtener el pedido" }, { status: 500 });
  }
}
