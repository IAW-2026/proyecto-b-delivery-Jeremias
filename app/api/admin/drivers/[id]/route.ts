import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const idChofer = Number(id);

  if (!Number.isInteger(idChofer) || idChofer <= 0) {
    return NextResponse.json({ error: "ID de chofer inválido" }, { status: 400 });
  }

  try {
    const chofer = await prisma.chofer.findUnique({
      where: { idChofer },
      include: {
        vehiculo: {
          select: { idVehiculo: true, patente: true, tipo: true, capacidadBidones: true },
        },
        zona: {
          select: { idZona: true, nombre: true },
        },
        _count: {
          select: { pedidosAsignados: true },
        },
      },
    });

    if (!chofer) {
      return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      idChofer: chofer.idChofer,
      nombre: chofer.nombre,
      telefono: chofer.telefono,
      estado: chofer.estado,
      disponible: chofer.disponible,
      cuilCuit: chofer.cuilCuit,
      cbuCvu: chofer.cbuCvu,
      alias: chofer.alias,
      zona: chofer.zona ? { idZona: chofer.zona.idZona, nombre: chofer.zona.nombre } : null,
      vehiculo: chofer.vehiculo
        ? { idVehiculo: chofer.vehiculo.idVehiculo, patente: chofer.vehiculo.patente, tipo: chofer.vehiculo.tipo, capacidadBidones: chofer.vehiculo.capacidadBidones }
        : null,
      pedidosAsignados: chofer._count.pedidosAsignados,
      idVendedor: chofer.idVendedor,
      nombreEmpresa: chofer.nombreEmpresa,
    });
  } catch (error) {
    console.error("Error fetching driver:", error);
    return NextResponse.json({ error: "Error al obtener el chofer" }, { status: 500 });
  }
}
