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
  const idZona = Number(id);

  if (!Number.isInteger(idZona) || idZona <= 0) {
    return NextResponse.json({ error: "ID de zona inválido" }, { status: 400 });
  }

  try {
    const zona = await prisma.zona.findUnique({
      where: { idZona },
      include: {
        empresas: { select: { idVendedor: true } },
        choferes: { select: { idChofer: true, nombre: true } },
      },
    });

    if (!zona) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      idZona: zona.idZona,
      nombre: zona.nombre,
      empresas: zona.empresas.map((e: { idVendedor: string }) => e.idVendedor),
      choferes: zona.choferes,
    });
  } catch (error) {
    console.error("Error fetching zone:", error);
    return NextResponse.json({ error: "Error al obtener la zona" }, { status: 500 });
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
  const idZona = Number(id);

  if (!Number.isInteger(idZona) || idZona <= 0) {
    return NextResponse.json({ error: "ID de zona inválido" }, { status: 400 });
  }

  let body: { nombre?: string; empresas?: string[] };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nombre = body.nombre?.trim();
  const empresas = Array.isArray(body.empresas) ? body.empresas.filter((e) => typeof e === "string" && e.trim()) : undefined;

  if (!nombre && empresas === undefined) {
    return NextResponse.json({ error: "Debe enviar al menos 'nombre' o 'empresas' para actualizar" }, { status: 400 });
  }

  try {
    const existing = await prisma.zona.findUnique({ where: { idZona } });
    if (!existing) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (nombre) {
        await tx.zona.update({
          where: { idZona },
          data: { nombre },
        });
      }

      if (empresas !== undefined) {
        await tx.zonaEmpresa.deleteMany({ where: { idZona } });

        if (empresas.length > 0) {
          await tx.zonaEmpresa.createMany({
            data: empresas.map((idVendedor) => ({ idZona, idVendedor })),
            skipDuplicates: true,
          });
        }
      }

      return tx.zona.findUnique({
        where: { idZona },
        include: {
          empresas: { select: { idVendedor: true } },
          choferes: { select: { idChofer: true, nombre: true } },
        },
      });
    });

    return NextResponse.json({
      idZona: updated!.idZona,
      nombre: updated!.nombre,
      empresas: updated!.empresas.map((e: { idVendedor: string }) => e.idVendedor),
      choferes: updated!.choferes,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Ya existe una zona con el nombre "${nombre}"` }, { status: 409 });
    }
    console.error("Error updating zone:", error);
    return NextResponse.json({ error: "Error al actualizar la zona" }, { status: 500 });
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
  const idZona = Number(id);

  if (!Number.isInteger(idZona) || idZona <= 0) {
    return NextResponse.json({ error: "ID de zona inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.zona.findUnique({ where: { idZona } });
    if (!existing) {
      return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.chofer.updateMany({
        where: { idZona },
        data: { idZona: null },
      });
      await tx.zonaEmpresa.deleteMany({ where: { idZona } });
      await tx.zona.delete({ where: { idZona } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting zone:", error);
    return NextResponse.json({ error: "Error al eliminar la zona" }, { status: 500 });
  }
}
