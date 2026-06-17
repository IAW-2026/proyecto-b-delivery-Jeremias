import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { parsePage, pageSize } from "@/lib/shared/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page") ?? undefined);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || pageSize, 1), 100);
  const q = searchParams.get("q")?.trim();
  const estado = searchParams.get("estado")?.trim();
  const idVendedor = searchParams.get("idVendedor")?.trim();

  const where: Record<string, unknown> = {};

  if (estado) {
    where.estado = estado;
  }

  if (idVendedor) {
    where.idVendedor = idVendedor;
  }

  if (q) {
    where.patente = { contains: q, mode: "insensitive" };
  }

  try {
    const [total, items] = await Promise.all([
      prisma.vehiculo.count({ where }),
      prisma.vehiculo.findMany({
        where,
        include: {
          choferes: {
            select: { idChofer: true, nombre: true },
            where: { estado: "activo" },
          },
        },
        orderBy: { idVehiculo: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items: items.map((v: Prisma.VehiculoGetPayload<{ include: { choferes: { select: { idChofer: true; nombre: true }; where: { estado: "activo" } } } }>) => ({
        idVehiculo: v.idVehiculo,
        patente: v.patente,
        tipo: v.tipo,
        capacidadBidones: v.capacidadBidones,
        estado: v.estado,
        motivoPausa: v.motivoPausa,
        idVendedor: v.idVendedor,
        choferAsignado: v.choferes.length > 0 ? v.choferes[0].nombre : null,
      })),
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json({ error: "Error al obtener vehículos" }, { status: 500 });
  }
}
