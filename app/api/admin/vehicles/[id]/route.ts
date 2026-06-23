import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

export async function GET(
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

  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { idVehiculo },
      include: {
        choferes: {
          select: { idChofer: true, nombre: true },
          where: { estado: "activo" },
        },
      },
    });

    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      idVehiculo: vehiculo.idVehiculo,
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      capacidadBidones: vehiculo.capacidadBidones,
      estado: vehiculo.estado,
      motivoPausa: vehiculo.motivoPausa,
      idVendedor: vehiculo.idVendedor,
      choferAsignado: vehiculo.choferes.length > 0
        ? { idChofer: vehiculo.choferes[0].idChofer, nombre: vehiculo.choferes[0].nombre }
        : null,
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json({ error: "Error al obtener el vehículo" }, { status: 500 });
  }
}

export async function PUT(
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

  let body: { patente?: string; tipo?: string; capacidadBidones?: number };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const existing = await prisma.vehiculo.findUnique({ where: { idVehiculo } });
    if (!existing) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    const patente = body.patente?.trim().toUpperCase() ?? existing.patente;
    const tipo = body.tipo?.trim() ?? existing.tipo;
    const capacidadBidones = body.capacidadBidones ?? existing.capacidadBidones;

    if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
      return NextResponse.json({ error: "Datos de vehículo inválidos" }, { status: 400 });
    }

    const updated = await prisma.vehiculo.update({
      where: { idVehiculo },
      data: { patente, tipo, capacidadBidones },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Ya existe un vehículo con la patente "${(body.patente ?? "").trim().toUpperCase()}"` }, { status: 409 });
    }
    console.error("Error updating vehicle:", error);
    return NextResponse.json({ error: "Error al actualizar el vehículo" }, { status: 500 });
  }
}

export async function DELETE(
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

  try {
    const existing = await prisma.vehiculo.findUnique({ where: { idVehiculo } });
    if (!existing) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.chofer.updateMany({
        where: { idVehiculo },
        data: { idVehiculo: null },
      }),
      prisma.vehiculo.delete({ where: { idVehiculo } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json({ error: "Error al eliminar el vehículo" }, { status: 500 });
  }
}
