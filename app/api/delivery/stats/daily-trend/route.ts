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

  const pedidos = await prisma.pedido.findMany({
    where,
    select: { estado: true, assignedAt: true },
  });

  const trendMap: Record<string, { completed: number; failed: number }> = {};

  for (const pedido of pedidos) {
    const date = pedido.assignedAt
      ? pedido.assignedAt.toISOString().slice(0, 10)
      : "sin-fecha";

    if (!trendMap[date]) {
      trendMap[date] = { completed: 0, failed: 0 };
    }

    if (pedido.estado === "entregado") {
      trendMap[date].completed++;
    } else if (pedido.estado === "cancelado") {
      trendMap[date].failed++;
    }
  }

  const result = Object.entries(trendMap)
    .filter(([date]) => date !== "sin-fecha")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      completed: counts.completed,
      failed: counts.failed,
    }));

  return NextResponse.json(result);
}