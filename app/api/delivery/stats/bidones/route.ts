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
  const empresaId = searchParams.get("empresaId");

  const where: Record<string, unknown> = {};
  
  if (dateFrom || dateTo) {
    where.assignedAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
  }

  if (empresaId) {
    where.idVendedor = empresaId;
  }

  const result = await prisma.pedido.aggregate({
    _sum: { cantBidones: true },
    where: { ...where, estado: "entregado" },
  });

  return NextResponse.json({ totalBidones: result._sum.cantBidones || 0 });
}