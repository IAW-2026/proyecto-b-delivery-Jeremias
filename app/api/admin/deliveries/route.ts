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
  const status = searchParams.get("status")?.trim();
  const idVendedor = searchParams.get("idVendedor")?.trim();

  const where: Record<string, unknown> = {};

  if (status) {
    where.estado = status;
  }

  if (idVendedor) {
    where.idVendedor = idVendedor;
  }

  if (q) {
    where.OR = [
      { cliente: { contains: q, mode: "insensitive" } },
      { direccion: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, items] = await Promise.all([
      prisma.pedido.count({ where }),
      prisma.pedido.findMany({
        where,
        include: {
          choferAsignado: {
            select: {
              idChofer: true,
              nombre: true,
              telefono: true,
            },
          },
        },
        orderBy: { idPedido: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items: items.map((p: Prisma.PedidoGetPayload<{ include: { choferAsignado: { select: { idChofer: true; nombre: true; telefono: true } } } }>) => ({
        idPedido: p.idPedido,
        estado: p.estado,
        cliente: p.cliente,
        direccion: p.direccion,
        telefono: p.telefono,
        cantBidones: p.cantBidones,
        zona: p.zona,
        idVendedor: p.idVendedor,
        idPedidoExterno: p.idPedidoExterno,
        choferAsignado: p.choferAsignado
          ? { idChofer: p.choferAsignado.idChofer, nombre: p.choferAsignado.nombre, telefono: p.choferAsignado.telefono }
          : null,
        createdAt: p.assignedAt ?? p.updatedAt,
      })),
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json({ error: "Error al obtener pedidos" }, { status: 500 });
  }
}
