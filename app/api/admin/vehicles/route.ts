import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { parsePage, pageSize } from "@/lib/shared/utils";
import { Prisma } from "@prisma/client";

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

export async function POST(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { patente?: string; tipo?: string; capacidadBidones?: number; idVendedor?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.patente?.trim() || !body.tipo?.trim() || !body.idVendedor) {
    return NextResponse.json({ error: "Faltan campos requeridos: patente, tipo, capacidadBidones, idVendedor" }, { status: 400 });
  }

  if (typeof body.capacidadBidones !== "number" || !Number.isFinite(body.capacidadBidones) || body.capacidadBidones <= 0) {
    return NextResponse.json({ error: "Faltan campos requeridos: patente, tipo, capacidadBidones, idVendedor" }, { status: 400 });
  }
  const capacidadBidones = body.capacidadBidones;

  try {
    const vehiculo = await prisma.vehiculo.create({
      data: {
        patente: body.patente.trim().toUpperCase(),
        tipo: body.tipo.trim(),
        capacidadBidones,
        idVendedor: body.idVendedor,
        estado: "activo",
        motivoPausa: null,
      },
    });

    return NextResponse.json(vehiculo, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Ya existe un vehículo con la patente "${body.patente.trim().toUpperCase()}"` }, { status: 409 });
    }
    console.error("Error creating vehicle:", error);
    return NextResponse.json({ error: "Error al crear el vehículo" }, { status: 500 });
  }
}
