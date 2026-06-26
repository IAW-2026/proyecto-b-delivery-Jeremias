import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const idVehiculo = Number(id);

  if (!Number.isInteger(idVehiculo) || idVehiculo <= 0) {
    return NextResponse.json({ error: "ID de vehículo inválido" }, { status: 400 });
  }

  let body: { motivoPausa?: string };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { idVehiculo },
      select: { idVehiculo: true, estado: true },
    });

    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    if (vehiculo.estado === "activo") {
      const motivo = (body.motivoPausa ?? "").trim();
      if (!motivo) {
        return NextResponse.json({ error: "Debés indicar un motivo para pausar el vehículo" }, { status: 400 });
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.chofer.updateMany({
          where: { idVehiculo },
          data: { idVehiculo: null },
        });
        await tx.vehiculo.update({
          where: { idVehiculo },
          data: { estado: "pausado", motivoPausa: motivo },
        });
      });

      return NextResponse.json({ ok: true, nuevoEstado: "pausado" });
    }

    await prisma.vehiculo.update({
      where: { idVehiculo },
      data: { estado: "activo", motivoPausa: null },
    });

    return NextResponse.json({ ok: true, nuevoEstado: "activo" });
  } catch (error) {
    console.error("Error toggling vehicle status:", error);
    return NextResponse.json({ error: "Error al cambiar estado del vehículo" }, { status: 500 });
  }
}
