import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "en_camino";

  const pedidos = await prisma.pedido.findMany({
    where: {
      estado: status,
      assignedAt: { not: null },
    },
    select: {
      idPedido: true,
      estado: true,
      choferAsignado: {
        select: {
          idChofer: true,
          nombre: true,
        },
      },
    },
  });

  const result = pedidos.map((pedido: {
    idPedido: number;
    estado: string;
    choferAsignado?: {
      idChofer: number;
      nombre: string;
    } | null;
  }) => ({
    orderId: String(pedido.idPedido),
    status: pedido.estado,
    driverName: pedido.choferAsignado?.nombre || "Sin asignar",
  }));

  return NextResponse.json(result);
}