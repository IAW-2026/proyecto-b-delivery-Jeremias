import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  assignOrder,
  cancelOrder,
  getOrders,
  syncAutomaticZoneAssignments,
  unassignOrder,
} from "@/lib/logisticAdminStore";

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

async function getCompanyContext(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) return null;

  const userRole = await prisma.userRole.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true, role: true },
  });

  const dbRoles = normalizeRoles(userRole?.role);
  const canAccess = dbRoles.includes("logistic_admin") || dbRoles.includes("seller");

  if (!canAccess) return null;

  const roles = [...new Set(dbRoles)];

  if (!userRole) return { userId, roles, idVendedor: null };

  return { userId, roles, idVendedor: userRole.idVendedor };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCompanyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.idVendedor === null) {
      return NextResponse.json(
        {
          ok: true,
          company: null,
          choferes: [],
          vehiculos: [],
          pedidos: getOrders(),
        },
        { status: 200 }
      );
    }

    const [choferes, vehiculos] = await Promise.all([
      prisma.chofer.findMany({
        where: { idVendedor: context.idVendedor },
        include: { vehiculo: true },
        orderBy: { idChofer: "asc" },
      }),
      prisma.vehiculo.findMany({
        where: { idVendedor: context.idVendedor },
        orderBy: { idVehiculo: "asc" },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        company: { idVendedor: context.idVendedor },
        choferes,
        vehiculos,
        pedidos: getOrders(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("logistic-admin GET error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getCompanyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: string;
      idPedido?: number;
      idChofer?: number;
      idVehiculo?: number | null;
      patente?: string;
      tipo?: string;
      capacidadBidones?: number;
      idZona?: number | null;
      nombre?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (body.action === "create_zone") {
      const nombre = String(body.nombre ?? "").trim();

      if (!nombre) {
        return NextResponse.json({ error: "Missing zone name" }, { status: 400 });
      }

      try {
        const zona = await prisma.zona.create({
          data: { nombre },
        });

        return NextResponse.json({ ok: true, zona }, { status: 201 });
      } catch {
        return NextResponse.json({ error: "La zona ya existe" }, { status: 409 });
      }
    }

    if (body.action === "update_zone") {
      if (typeof body.idZona !== "number") {
        return NextResponse.json({ error: "Missing zone id" }, { status: 400 });
      }

      const currentZone = await prisma.zona.findUnique({
        where: { idZona: body.idZona },
      });

      if (!currentZone) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
      }

      const nombre = String(body.nombre ?? "").trim();
      if (!nombre) {
        return NextResponse.json({ error: "Missing zone name" }, { status: 400 });
      }

      try {
        const zona = await prisma.zona.update({
          where: { idZona: body.idZona },
          data: { nombre },
        });

        return NextResponse.json({ ok: true, zona }, { status: 200 });
      } catch {
        return NextResponse.json({ error: "La zona ya existe" }, { status: 409 });
      }
    }

    if (body.action === "delete_zone") {
      if (typeof body.idZona !== "number") {
        return NextResponse.json({ error: "Missing zone id" }, { status: 400 });
      }

      const zona = await prisma.zona.findUnique({
        where: { idZona: body.idZona },
        include: { _count: { select: { ruta: true } } },
      });

      if (!zona) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
      }

      if (zona._count.ruta > 0) {
        return NextResponse.json(
          { error: "No se puede eliminar una zona que ya tiene rutas asociadas" },
          { status: 409 }
        );
      }

      await prisma.zona.delete({
        where: { idZona: body.idZona },
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (body.action === "assign_driver_zone") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idChofer !== "number" || typeof body.idZona !== "number") {
        return NextResponse.json({ error: "Missing driver or zone" }, { status: 400 });
      }

      const zona = await prisma.zona.findUnique({
        where: { idZona: body.idZona },
      });

      if (!zona) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
      }

      const chofer = await prisma.chofer.updateMany({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
        data: { idZona: body.idZona },
      });

      if (chofer.count === 0) {
        return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
      }

      const refreshedChoferes = await prisma.chofer.findMany({
        where: { idVendedor: context.idVendedor },
        include: { zona: true, vehiculo: true },
        orderBy: { idChofer: "asc" },
      });

      syncAutomaticZoneAssignments(refreshedChoferes);

      return NextResponse.json({ ok: true, zona, updated: chofer.count }, { status: 200 });
    }

    if (body.action === "clear_driver_zone") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idChofer !== "number") {
        return NextResponse.json({ error: "Missing driver" }, { status: 400 });
      }

      const chofer = await prisma.chofer.updateMany({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
        data: { idZona: null },
      });

      if (chofer.count === 0) {
        return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
      }

      const refreshedChoferes = await prisma.chofer.findMany({
        where: { idVendedor: context.idVendedor },
        include: { zona: true, vehiculo: true },
        orderBy: { idChofer: "asc" },
      });

      syncAutomaticZoneAssignments(refreshedChoferes);

      return NextResponse.json({ ok: true, updated: chofer.count }, { status: 200 });
    }

    if (body.action === "assign_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number" || typeof body.idChofer !== "number") {
        return NextResponse.json({ error: "Missing order or driver" }, { status: 400 });
      }

      const chofer = await prisma.chofer.findFirst({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
      });

      if (!chofer) {
        return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
      }

      const order = assignOrder(body.idPedido, chofer.idChofer, chofer.nombre);
      return NextResponse.json({ ok: Boolean(order), order }, { status: order ? 200 : 404 });
    }

    if (body.action === "unassign_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      const order = unassignOrder(body.idPedido);
      return NextResponse.json({ ok: Boolean(order), order }, { status: order ? 200 : 404 });
    }

    if (body.action === "cancel_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      const order = cancelOrder(body.idPedido);
      return NextResponse.json({ ok: Boolean(order), order }, { status: order ? 200 : 404 });
    }

    if (body.action === "accept_delivery") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idChofer !== "number") {
        return NextResponse.json({ error: "Missing driver" }, { status: 400 });
      }

      const chofer = await prisma.chofer.updateMany({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
        data: { estado: "activo" },
      });

      return NextResponse.json({ ok: chofer.count > 0, updated: chofer.count }, { status: chofer.count > 0 ? 200 : 404 });
    }

    if (body.action === "reject_delivery") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idChofer !== "number") {
        return NextResponse.json({ error: "Missing driver" }, { status: 400 });
      }

      const chofer = await prisma.chofer.updateMany({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
        data: { estado: "rechazado" },
      });

      return NextResponse.json({ ok: chofer.count > 0, updated: chofer.count }, { status: chofer.count > 0 ? 200 : 404 });
    }

    if (body.action === "assign_vehicle") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idChofer !== "number") {
        return NextResponse.json({ error: "Missing driver" }, { status: 400 });
      }

      const chofer = await prisma.chofer.findFirst({
        where: {
          idChofer: body.idChofer,
          idVendedor: context.idVendedor,
        },
      });

      if (!chofer) {
        return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
      }

      const updated = await prisma.chofer.update({
        where: { idChofer: chofer.idChofer },
        data: { idVehiculo: body.idVehiculo ?? null },
      });

      return NextResponse.json({ ok: true, chofer: updated }, { status: 200 });
    }

    if (body.action === "create_vehicle") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      const patente = String(body.patente ?? "").trim().toUpperCase();
      const tipo = String(body.tipo ?? "").trim();
      const capacidadBidones = Number(body.capacidadBidones ?? 0);

      if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
        return NextResponse.json({ error: "Invalid vehicle data" }, { status: 400 });
      }

      try {
        const vehiculo = await prisma.vehiculo.create({
          data: {
            patente,
            tipo,
            capacidadBidones,
            idVendedor: context.idVendedor,
          },
        });

        return NextResponse.json({ ok: true, vehiculo }, { status: 201 });
      } catch {
        return NextResponse.json(
          { error: "Could not create vehicle. Check if patente already exists." },
          { status: 409 }
        );
      }
    }

    if (body.action === "update_vehicle") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idVehiculo !== "number") {
        return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 });
      }

      const vehiculo = await prisma.vehiculo.findFirst({
        where: {
          idVehiculo: body.idVehiculo,
          idVendedor: context.idVendedor,
        },
      });

      if (!vehiculo) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      const patente = typeof body.patente === "string" ? body.patente.trim().toUpperCase() : vehiculo.patente;
      const tipo = typeof body.tipo === "string" ? body.tipo.trim() : vehiculo.tipo;
      const capacidadBidones =
        typeof body.capacidadBidones === "number"
          ? Number(body.capacidadBidones)
          : vehiculo.capacidadBidones;

      if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
        return NextResponse.json({ error: "Invalid vehicle data" }, { status: 400 });
      }

      try {
        const updated = await prisma.vehiculo.update({
          where: { idVehiculo: body.idVehiculo },
          data: {
            patente,
            tipo,
            capacidadBidones,
          },
        });

        return NextResponse.json({ ok: true, vehiculo: updated }, { status: 200 });
      } catch {
        return NextResponse.json(
          { error: "Could not update vehicle. Check if patente already exists." },
          { status: 409 }
        );
      }
    }

    if (body.action === "delete_vehicle") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idVehiculo !== "number") {
        return NextResponse.json({ error: "Missing vehicle id" }, { status: 400 });
      }

      const vehiculo = await prisma.vehiculo.findFirst({
        where: {
          idVehiculo: body.idVehiculo,
          idVendedor: context.idVendedor,
        },
      });

      if (!vehiculo) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.chofer.updateMany({
          where: {
            idVendedor: context.idVendedor,
            idVehiculo: body.idVehiculo,
          },
          data: { idVehiculo: null },
        }),
        prisma.vehiculo.delete({
          where: { idVehiculo: body.idVehiculo },
        }),
      ]);

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("logistic-admin POST error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}