import { NextResponse } from "next/server";
import { currentUser, auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  assignOrder,
  cancelOrder,
  getOrders,
  unassignOrder,
} from "@/lib/logisticAdminStore";

type RolePayload = {
  role?: string[] | string;
};

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

async function getCompanyContext() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const roles = normalizeRoles((clerkUser?.publicMetadata as RolePayload | undefined)?.role);
  const canAccess = roles.includes("logistic_admin") || roles.includes("seller");

  if (!canAccess) return null;

  const userRole = await prisma.userRole.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true },
  });

  if (!userRole) return { userId, roles, idVendedor: null };

  return { userId, roles, idVendedor: userRole.idVendedor };
}

async function requireCompanyContext() {
  const context = await getCompanyContext();
  if (!context) return null;
  if (context.idVendedor === null) return null;
  return context;
}

export async function GET() {
  try {
    const context = await getCompanyContext();
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

export async function POST(request: Request) {
  try {
    const context = await requireCompanyContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: string;
      idPedido?: number;
      idChofer?: number;
      idVehiculo?: number | null;
    };

    if (!body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (body.action === "assign_order") {
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
      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      const order = unassignOrder(body.idPedido);
      return NextResponse.json({ ok: Boolean(order), order }, { status: order ? 200 : 404 });
    }

    if (body.action === "cancel_order") {
      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      const order = cancelOrder(body.idPedido);
      return NextResponse.json({ ok: Boolean(order), order }, { status: order ? 200 : 404 });
    }

    if (body.action === "accept_delivery") {
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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("logistic-admin POST error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}