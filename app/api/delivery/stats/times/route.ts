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

  const pedidos = await prisma.pedido.findMany({
    where: { ...where, estado: "entregado", assignedAt: { not: null }, updatedAt: { not: null } },
    select: { assignedAt: true, updatedAt: true },
  });

  let totalMinutes = 0;
  let count = 0;
  
  for (const p of pedidos) {
    if (p.assignedAt && p.updatedAt) {
      const diffMinutes = (p.updatedAt.getTime() - p.assignedAt.getTime()) / (1000 * 60);
      totalMinutes += diffMinutes;
      count++;
    }
  }

  const avgMinutes = count > 0 ? Math.round((totalMinutes / count) * 10) / 10 : 0;

  return NextResponse.json({ avgMinutes });
}