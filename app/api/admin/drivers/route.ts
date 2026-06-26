import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { parsePage, pageSize } from "@/lib/shared/utils";
import type { Prisma } from "@prisma/client";

function generateTempPassword(): string {
  return crypto.randomUUID().slice(0, 12);
}

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

export async function POST(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { email?: string; nombre?: string; telefono?: string; idVendedor?: string; idZona?: number | null; idVehiculo?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.email || !body.nombre || !body.idVendedor) {
    return NextResponse.json({ error: "Faltan campos requeridos: email, nombre, idVendedor" }, { status: 400 });
  }

  const password = generateTempPassword();

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const nameParts = body.nombre.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const clerkUser = await client.users.createUser({
      emailAddress: [body.email.trim()],
      password,
      firstName,
      lastName,
      publicMetadata: { roles: ["delivery"] },
    });

    const [chofer, _userProfile] = await Promise.all([
      prisma.chofer.create({
        data: {
          clerkUserId: clerkUser.id,
          nombre: body.nombre.trim(),
          telefono: body.telefono?.trim() ?? null,
          idVendedor: body.idVendedor,
          idZona: body.idZona ?? null,
          idVehiculo: body.idVehiculo ?? null,
          estado: "activo",
          disponible: true,
        },
        include: {
          vehiculo: { select: { idVehiculo: true, patente: true, tipo: true } },
          zona: { select: { idZona: true, nombre: true } },
          _count: { select: { pedidosAsignados: true } },
        },
      }),
      prisma.userProfile.upsert({
        where: { clerkUserId: clerkUser.id },
        create: { clerkUserId: clerkUser.id, role: "delivery", idVendedor: body.idVendedor },
        update: { role: "delivery", idVendedor: body.idVendedor },
      }),
    ]);

    return NextResponse.json({
      ...chofer,
      zona: chofer.zona ? { idZona: chofer.zona.idZona, nombre: chofer.zona.nombre } : null,
      vehiculo: chofer.vehiculo ? { idVehiculo: chofer.vehiculo.idVehiculo, patente: chofer.vehiculo.patente, tipo: chofer.vehiculo.tipo } : null,
      pedidosAsignados: chofer._count.pedidosAsignados,
      temporaryPassword: password,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email en Clerk" }, { status: 409 });
    }
    console.error("Error creating driver:", error);
    return NextResponse.json({ error: "Error al crear el chofer" }, { status: 500 });
  }
}
