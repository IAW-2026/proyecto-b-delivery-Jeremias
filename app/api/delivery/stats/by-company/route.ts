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

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) (dateFilter.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (dateFilter.createdAt as Record<string, Date>).lte = new Date(dateTo);
  }

  const companies = await prisma.userProfile.findMany({
    where: {
      role: "logistic_admin",
      idVendedor: { not: "" },
    },
    select: { idVendedor: true, nombreEmpresa: true },
    distinct: ["idVendedor"],
    orderBy: [{ idVendedor: "asc" }, { nombreEmpresa: "asc" }],
  });

  const result = [];

  for (const company of companies) {
    if (!company.idVendedor || !company.nombreEmpresa) continue;

    const companyFilter = { ...dateFilter, idVendedor: company.idVendedor };

    const [ordersCompleted, ordersFailed, bidones, driversTotal, driversAvailable, vehiclesActive, vehiclesPaused] =
      await Promise.all([
        prisma.pedido.count({ where: { ...companyFilter, estado: "entregado" } }),
        prisma.pedido.count({ where: { ...companyFilter, estado: "cancelado" } }),
        prisma.pedido.aggregate({
          _sum: { cantBidones: true },
          where: { ...companyFilter, estado: "entregado" },
        }),
        prisma.chofer.count({ where: { idVendedor: company.idVendedor } }),
        prisma.chofer.count({ where: { idVendedor: company.idVendedor, disponible: true } }),
        prisma.vehiculo.count({ where: { idVendedor: company.idVendedor, estado: "activo" } }),
        prisma.vehiculo.count({ where: { idVendedor: company.idVendedor, estado: "pausado" } }),
      ]);

    const pedidosTiempo = await prisma.pedido.findMany({
      where: { ...companyFilter, estado: "entregado", assignedAt: { not: null }, updatedAt: { not: null } },
      select: { assignedAt: true, updatedAt: true },
    });

    let totalMinutes = 0;
    let count = 0;
    for (const p of pedidosTiempo) {
      if (p.assignedAt && p.updatedAt) {
        totalMinutes += (p.updatedAt.getTime() - p.assignedAt.getTime()) / (1000 * 60);
        count++;
      }
    }
    const avgMinutes = count > 0 ? Math.round((totalMinutes / count) * 10) / 10 : 0;

    result.push({
      companyId: company.idVendedor,
      companyName: company.nombreEmpresa,
      ordersCompleted,
      ordersFailed,
      totalBidones: bidones._sum.cantBidones || 0,
      avgMinutes,
      availableDrivers: driversAvailable,
      totalDrivers: driversTotal,
      activeVehicles: vehiclesActive,
      pausedVehicles: vehiclesPaused,
    });
  }

  return NextResponse.json(result);
}