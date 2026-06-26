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

  const drivers = await prisma.chofer.findMany({
    where,
    select: {
      idChofer: true,
      nombre: true,
      _count: {
        select: {
          pedidosAsignados: {
            where: { estado: "entregado" },
          },
        },
      },
      pedidosAsignados: {
        where: { estado: "entregado" },
        select: { assignedAt: true, updatedAt: true },
      },
    },
  });

  const result = drivers.map((driver: {
    idChofer: number;
    nombre: string;
    _count: { pedidosAsignados: number };
    pedidosAsignados: Array<{ assignedAt?: Date | null; updatedAt?: Date | null }>;
  }) => {
    const entregas = driver._count.pedidosAsignados;
    let avgTimeMin = 0;
    
    if (driver.pedidosAsignados.length > 0) {
      let totalMinutes = 0;
      let count = 0;
      
      for (const pedido of driver.pedidosAsignados) {
        if (pedido.assignedAt && pedido.updatedAt) {
          const diffMinutes = (pedido.updatedAt.getTime() - pedido.assignedAt.getTime()) / (1000 * 60);
          totalMinutes += diffMinutes;
          count++;
        }
      }
      
      avgTimeMin = count > 0 ? Math.round((totalMinutes / count) * 10) / 10 : 0;
    }
    
    return {
      driverId: String(driver.idChofer),
      name: driver.nombre,
      deliveries: entregas,
      avgTimeMin,
      rating: 4.8,
    };
  });

  return NextResponse.json(result);
}