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

  const where: Record<string, unknown> = {};

  if (q) {
    where.nombre = { contains: q, mode: "insensitive" };
  }

  try {
    const [total, items] = await Promise.all([
      prisma.zona.count({ where }),
      prisma.zona.findMany({
        where,
        include: {
          _count: {
            select: { choferes: true },
          },
          empresas: {
            include: {
              zona: false,
            },
          },
        },
        orderBy: { idZona: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items: items.map((z: Prisma.zonaGetPayload<{ include: { _count: { select: { choferes: true } }; empresas: true } }>) => ({
        idZona: z.idZona,
        nombre: z.nombre,
        choferes: z._count.choferes,
        empresas: z.empresas.map((e: { idVendedor: string }) => e.idVendedor),
      })),
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching zones:", error);
    return NextResponse.json({ error: "Error al obtener zonas" }, { status: 500 });
  }
}
