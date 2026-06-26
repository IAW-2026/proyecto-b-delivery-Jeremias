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
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
  }

  const failedPedidos = await prisma.pedido.findMany({
    where: {
      ...where,
      estado: "cancelado",
    },
    select: {
      motivoRevision: true,
      direccion: true,
      cliente: true,
    },
  });

  const causesMap: Record<string, number> = {};
  
  for (const pedido of failedPedidos) {
    const causa = pedido.motivoRevision || "Sin motivo";
    causesMap[causa] = (causesMap[causa] || 0) + 1;
  }

  const result = Object.entries(causesMap).map(([cause, count]) => ({
    cause,
    count,
  }));

  return NextResponse.json(result);
}