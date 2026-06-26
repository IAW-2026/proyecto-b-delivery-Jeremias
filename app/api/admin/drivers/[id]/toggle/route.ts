import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function PATCH(
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
      select: { idChofer: true, estado: true },
    });

    if (!chofer) {
      return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
    }

    const nuevoEstado = chofer.estado === "activo" ? "inactivo" : "activo";

    await prisma.chofer.update({
      where: { idChofer },
      data: { estado: nuevoEstado },
    });

    return NextResponse.json({ ok: true, nuevoEstado });
  } catch (error) {
    console.error("Error toggling driver status:", error);
    return NextResponse.json({ error: "Error al cambiar estado del chofer" }, { status: 500 });
  }
}
