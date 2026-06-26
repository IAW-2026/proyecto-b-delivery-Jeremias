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
    if (dateFrom) (where.assignedAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.assignedAt as Record<string, Date>).lte = new Date(dateTo);
  }

  if (empresaId) {
    where.idVendedor = empresaId;
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    select: { assignedAt: true },
  });

  const hourlyMap: Record<number, number> = {};

  for (let h = 0; h < 24; h++) {
    hourlyMap[h] = 0;
  }

  for (const p of pedidos) {
    if (p.assignedAt) {
      const hour = p.assignedAt.getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    }
  }

  const result = Object.entries(hourlyMap).map(([hour, count]) => ({
    hour: Number(hour),
    count,
  }));

  return NextResponse.json(result);
}