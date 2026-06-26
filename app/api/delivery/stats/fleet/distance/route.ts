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

  const vehicles = await prisma.vehiculo.findMany({
    where,
    select: {
      idVehiculo: true,
      patente: true,
      distanciaRecorrida: true,
      choferes: {
        select: { idChofer: true },
      },
    },
  });

  const totalDistanceKm = vehicles.reduce((sum: number, v: { distanciaRecorrida?: number | null; choferes: Array<{ idChofer: number }> }) => sum + (v.distanciaRecorrida || 0), 0);
  const totalDrivers = vehicles.reduce((sum: number, v: { choferes: Array<{ idChofer: number }> }) => sum + v.choferes.length, 0);
  const avgDistancePerDriverKm = totalDrivers > 0 ? totalDistanceKm / totalDrivers : 0;

  return NextResponse.json({
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    avgDistancePerDriverKm: Math.round(avgDistancePerDriverKm * 10) / 10,
  });
}