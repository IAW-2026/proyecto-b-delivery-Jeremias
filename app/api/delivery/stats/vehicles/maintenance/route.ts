import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "due";

  const where: Record<string, unknown> = {
    fechaProximoMantenimiento: {
      not: null,
    },
  };
  
  if (status === "pending") {
    where.fechaProximoMantenimiento = {
      gt: new Date(),
    };
  } else if (status === "due") {
    where.fechaProximoMantenimiento = {
      lte: new Date(),
    };
  }

  const vehicles = await prisma.vehiculo.findMany({
    where,
    select: {
      idVehiculo: true,
      patente: true,
      modelo: true,
      fechaProximoMantenimiento: true,
      estado: true,
      motivoPausa: true,
    },
  });

  const result = vehicles.map((vehicle: { idVehiculo: number; patente: string; tipo: string; fechaProximoMantenimiento?: Date | null; estado: string; motivoPausa?: string | null }) => {
    const hoy = new Date();
    const diasParaMantenimiento = vehicle.fechaProximoMantenimiento
      ? Math.ceil((vehicle.fechaProximoMantenimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      vehicleId: String(vehicle.idVehiculo),
      model: vehicle.tipo || "Sin modelo",
      patente: vehicle.patente,
      nextMaintenance: vehicle.fechaProximoMantenimiento?.toISOString(),
      daysToMaintenance: diasParaMantenimiento,
      status: vehicle.estado,
      motivoPausa: vehicle.motivoPausa,
    };
  });

  return NextResponse.json(result);
}