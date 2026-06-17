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
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { telefono: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, items] = await Promise.all([
      prisma.chofer.count({ where }),
      prisma.chofer.findMany({
        where,
        include: {
          vehiculo: {
            select: { idVehiculo: true, patente: true, tipo: true },
          },
          zona: {
            select: { idZona: true, nombre: true },
          },
          _count: {
            select: { pedidosAsignados: true },
          },
        },
        orderBy: { idChofer: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items: items.map((c: Prisma.ChoferGetPayload<{ include: { vehiculo: { select: { idVehiculo: true; patente: true; tipo: true } }; zona: { select: { idZona: true; nombre: true } }; _count: { select: { pedidosAsignados: true } } } }>) => ({
        idChofer: c.idChofer,
        nombre: c.nombre,
        telefono: c.telefono,
        estado: c.estado,
        disponible: c.disponible,
        zona: c.zona ? { idZona: c.zona.idZona, nombre: c.zona.nombre } : null,
        vehiculo: c.vehiculo ? { idVehiculo: c.vehiculo.idVehiculo, patente: c.vehiculo.patente, tipo: c.vehiculo.tipo } : null,
        pedidosAsignados: c._count.pedidosAsignados,
        idVendedor: c.idVendedor,
        nombreEmpresa: c.nombreEmpresa,
      })),
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Error al obtener choferes" }, { status: 500 });
  }
}
