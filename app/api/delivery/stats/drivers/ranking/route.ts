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

  const orderWhere: Record<string, unknown> = { estado: "entregado" };

  if (dateFrom || dateTo) {
    orderWhere.assignedAt = {};
    if (dateFrom) (orderWhere.assignedAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (orderWhere.assignedAt as Record<string, Date>).lte = new Date(dateTo);
  }

  const drivers = await prisma.chofer.findMany({
    select: {
      nombre: true,
      pedidosAsignados: {
        where: orderWhere,
        select: { assignedAt: true, updatedAt: true },
      },
    },
  });

  const ranking = drivers
    .map((d: { nombre: string; pedidosAsignados: Array<{ assignedAt?: Date | null; updatedAt?: Date | null }> }) => {
      const deliveries = d.pedidosAsignados.length;
      let totalMinutes = 0;
      let count = 0;

      for (const p of d.pedidosAsignados) {
        if (p.assignedAt && p.updatedAt) {
          totalMinutes += (p.updatedAt.getTime() - p.assignedAt.getTime()) / (1000 * 60);
          count++;
        }
      }

      const avgTime = count > 0 ? Math.round((totalMinutes / count) * 10) / 10 : 0;

      return { name: d.nombre, deliveries, avgTime };
    })
    .sort((a: { deliveries: number }, b: { deliveries: number }) => b.deliveries - a.deliveries);

  return NextResponse.json(ranking);
}