import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  
  if (dateFrom || dateTo) {
    where.assignedAt = {};
    if (dateFrom) (where.assignedAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.assignedAt as Record<string, Date>).lte = new Date(dateTo);
  }

  const pedidos = await prisma.pedido.findMany({
    where: {
      ...where,
      estado: "entregado",
      assignedAt: { not: null },
      updatedAt: { not: null },
    },
    select: {
      idPedido: true,
      assignedAt: true,
      updatedAt: true,
      choferAsignado: {
        select: {
          nombre: true,
        },
      },
      motivoRevision: true,
    },
  });

  const result = pedidos.map((pedido: {
    idPedido: number;
    assignedAt?: Date | null;
    updatedAt?: Date | null;
    choferAsignado?: { nombre?: string | null };
    motivoRevision?: string | null;
  }) => {
    const eta = pedido.assignedAt;
    const actualDelivery = pedido.updatedAt;
    const isDelayed = actualDelivery ? actualDelivery > (eta ? eta : new Date()) : false;
    
    return {
      orderId: String(pedido.idPedido),
      eta: eta?.toISOString(),
      actualDelivery: actualDelivery?.toISOString(),
      driverName: pedido.choferAsignado?.nombre || "Sin asignar",
      isDelayed,
      motivoRevision: pedido.motivoRevision,
    };
  });

  return NextResponse.json(result);
}