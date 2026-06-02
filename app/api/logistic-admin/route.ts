import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

type PedidoConChofer = Prisma.PedidoGetPayload<{
  include: { choferAsignado: true };
}>;

function mapPedidoToLogisticOrder(pedido: PedidoConChofer) {
  const status = (pedido.estado ?? "ready") as string;
  const normalizedStatus =
    status === "assigned" || status === "asignado"
      ? "asignado"
      : status === "cancelled" || status === "cancelado"
      ? "cancelado"
      : status === "delivered" || status === "entregado"
      ? "entregado"
      : status === "en_camino"
      ? "en_camino"
      : status === "revision"
      ? "revision"
      : "ready";

  return {
    idPedido: pedido.idPedido,
    estado: normalizedStatus,
    direccion: pedido.direccion,
    cliente: pedido.cliente,
    telefono: pedido.telefono,
    cantBidones: pedido.cantBidones,
    zona: pedido.zona,
    motivoRevision: pedido.motivoRevision ?? null,
    assignedToChoferId: pedido.idChoferAsignado ?? null,
    assignedToChoferName: pedido.choferAsignado?.nombre ?? null,
    status: normalizedStatus,
    updatedAt: pedido.updatedAt ? new Date(pedido.updatedAt).toISOString() : new Date().toISOString(),
  };
}

async function getCompanyContext(request: NextRequest) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId) return null;

  const userRole = await prisma.userRole.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true },
  });
  const roles = resolveRolesFromClaims(sessionClaims);

  const canAccess = roles.includes(ADMIN_DELIVERY_ROLE) || roles.includes("logistic_admin");

  if (!canAccess) return null;

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
       const pedidosDb = await prisma.pedido.findMany({ where: {}, include: { choferAsignado: true } });
       return NextResponse.json(
         {
           ok: true,
           company: null,
           choferes: [],
           vehiculos: [],
           pedidos: pedidosDb.map(mapPedidoToLogisticOrder),
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

     const pedidosDb = await prisma.pedido.findMany({ where: { idVendedor: context.idVendedor }, include: { choferAsignado: true } });

    return NextResponse.json(
      {
        ok: true,
        company: { idVendedor: context.idVendedor },
        choferes,
        vehiculos,
        pedidos: pedidosDb.map(mapPedidoToLogisticOrder),
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
      telefono?: string;
      estado?: string;
      motivoPausa?: string | null;
      status?: string;
      motivoRevision?: string | null;
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

      const nombre = String(body.nombre ?? "").trim();
      if (!nombre) {
        return NextResponse.json({ error: "Missing zone name" }, { status: 400 });
      }

      try {
        const zona = await prisma.zona.update({
          where: { idZona: body.idZona },
          data: { nombre },
        });

        return NextResponse.json({ ok: true, zona });
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
      });

      if (!zona) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
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

      if (String(chofer.estado) === "inactivo") {
        return NextResponse.json({ error: "No se puede asignar a un chofer inactivo" }, { status: 409 });
      }

      if (chofer.idVehiculo === null) {
        return NextResponse.json({ error: "No se puede asignar a un chofer sin vehículo" }, { status: 409 });
      }

      try {
        const updated = await prisma.pedido.update({
          where: { idPedido: body.idPedido },
          data: {
            estado: "asignado",
            assignedAt: new Date(),
            updatedAt: new Date(),
            choferAsignado: {
              connect: { idChofer: chofer.idChofer },
            },
          },
          include: { choferAsignado: true },
        });
        return NextResponse.json({ ok: true, order: mapPedidoToLogisticOrder(updated) }, { status: 200 });
      } catch (e) {
        console.error("assign_order error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "unassign_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      try {
        const updated = await prisma.pedido.update({
          where: { idPedido: body.idPedido },
          data: {
            estado: "ready",
            assignedAt: null,
            updatedAt: new Date(),
            choferAsignado: {
              disconnect: true,
            },
          },
          include: { choferAsignado: true },
        });
        return NextResponse.json({ ok: true, order: mapPedidoToLogisticOrder(updated) }, { status: 200 });
      } catch (e) {
        console.error("unassign_order error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "delete_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      try {
        const result = await prisma.pedido.deleteMany({
          where: { idPedido: body.idPedido },
        });

        if (result.count === 0) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, deleted: result.count }, { status: 200 });
      } catch (e) {
        console.error("delete_order error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "cancel_order") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number") {
        return NextResponse.json({ error: "Missing order" }, { status: 400 });
      }

      try {
        const updated = await prisma.pedido.update({
          where: { idPedido: body.idPedido },
          data: {
            estado: "cancelado",
            assignedAt: null,
            updatedAt: new Date(),
            choferAsignado: {
              disconnect: true,
            },
          },
          include: { choferAsignado: true },
        });
        return NextResponse.json({ ok: true, order: mapPedidoToLogisticOrder(updated) }, { status: 200 });
      } catch (e) {
        console.error("cancel_order error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "update_order_status") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idPedido !== "number" || typeof body.status !== "string") {
        return NextResponse.json({ error: "Missing order or status" }, { status: 400 });
      }

      const allowedStatuses = ["ready", "asignado", "en_camino", "entregado", "cancelado", "revision"];
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const pedidoDb = await prisma.pedido.findUnique({ where: { idPedido: body.idPedido } });
      if (!pedidoDb) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (body.status === "asignado" && !pedidoDb.idChoferAsignado) {
        return NextResponse.json({ error: "Primero asigná un chofer al pedido" }, { status: 409 });
      }

      const requiresAssignedChofer = body.status === "en_camino" || body.status === "entregado";
      if (requiresAssignedChofer && !pedidoDb.idChoferAsignado) {
        return NextResponse.json({ error: "No podés mover este pedido a ese estado sin asignarle un chofer primero" }, { status: 409 });
      }

      const shouldClearAssignment = body.status === "cancelado";

      try {
        const updated = await prisma.pedido.update({
          where: { idPedido: body.idPedido },
          data: {
            estado: body.status,
            motivoRevision: body.status === "revision" ? pedidoDb.motivoRevision ?? null : null,
            updatedAt: new Date(),
            ...(shouldClearAssignment
              ? {
                  assignedAt: null,
                  choferAsignado: {
                    disconnect: true,
                  },
                }
              : {}),
          },
          include: { choferAsignado: true },
        });
        return NextResponse.json({ ok: true, order: mapPedidoToLogisticOrder(updated) }, { status: 200 });
      } catch (e) {
        console.error("update_order_status error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
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

    // Creación de chofer deshabilitada vía panel por requerimiento

    if (body.action === "update_chofer") {
      if (context.idVendedor === null) return NextResponse.json({ error: "Company context required" }, { status: 400 });
      if (typeof body.idChofer !== "number") return NextResponse.json({ error: "Missing driver id" }, { status: 400 });

      const data: Prisma.ChoferUncheckedUpdateManyInput = {};
      if (typeof body.nombre === "string") data.nombre = String(body.nombre).trim();
      if (typeof body.telefono === "string") data.telefono = String(body.telefono).trim();
      if (body.idZona === null) data.idZona = null;
      if (typeof body.idZona === "number") data.idZona = body.idZona;
      if (body.idVehiculo === null) data.idVehiculo = null;
      if (typeof body.idVehiculo === "number") data.idVehiculo = body.idVehiculo;

      try {
        const result = await prisma.chofer.updateMany({
          where: { idChofer: body.idChofer, idVendedor: context.idVendedor },
          data,
        });

        if (result.count === 0) return NextResponse.json({ error: "Chofer not found" }, { status: 404 });

        const chofer = await prisma.chofer.findUnique({ where: { idChofer: body.idChofer } });
        return NextResponse.json({ ok: true, chofer }, { status: 200 });
      } catch (e) {
        console.error("update_chofer error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "delete_chofer") {
      if (context.idVendedor === null) return NextResponse.json({ error: "Company context required" }, { status: 400 });
      if (typeof body.idChofer !== "number") return NextResponse.json({ error: "Missing driver id" }, { status: 400 });

      try {
        const existing = await prisma.chofer.findFirst({ where: { idChofer: body.idChofer, idVendedor: context.idVendedor } });
        if (!existing) return NextResponse.json({ error: "Chofer not found" }, { status: 404 });

        // Prevent deletion if the driver has assigned orders that are not finalized
        const assignedActivePedido = await prisma.pedido.findFirst({
          where: {
            idChoferAsignado: body.idChofer,
            estado: { notIn: ["entregado", "cancelado"] },
          },
        });

        if (assignedActivePedido) {
          return NextResponse.json({ error: "No se puede eliminar un chofer que tiene pedidos asignados activos" }, { status: 409 });
        }

        await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
          await transaction.chofer.update({
            where: { idChofer: body.idChofer },
            data: {
              estado: "inactivo",
              disponible: false,
              idVehiculo: null,
              idZona: null,
            },
          });

          // Reset onboarding flow: allow this user to request a company again.
          await transaction.choferRequest.deleteMany({
            where: { clerkUserId: existing.clerkUserId },
          });
        });

        return NextResponse.json({ ok: true }, { status: 200 });
      } catch (e) {
        console.error("delete_chofer error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }

    if (body.action === "set_chofer_estado") {
      if (context.idVendedor === null) return NextResponse.json({ error: "Company context required" }, { status: 400 });
      if (typeof body.idChofer !== "number" || typeof body.estado !== "string") return NextResponse.json({ error: "Missing driver id or estado" }, { status: 400 });

      const allowed = ["activo", "rechazado", "pendiente", "inactivo"];
      if (!allowed.includes(body.estado)) return NextResponse.json({ error: "Invalid estado" }, { status: 400 });

      try {
        const result = await prisma.chofer.updateMany({
          where: { idChofer: body.idChofer, idVendedor: context.idVendedor },
          data: { estado: body.estado },
        });

        if (result.count === 0) return NextResponse.json({ error: "Chofer not found" }, { status: 404 });

        const chofer = await prisma.chofer.findUnique({ where: { idChofer: body.idChofer } });
        return NextResponse.json({ ok: true, chofer }, { status: 200 });
      } catch (e) {
        console.error("set_chofer_estado error", e);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
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

      const hasChofer = typeof body.idChofer === "number";
      const hasVehiculo = typeof body.idVehiculo === "number";

      if (!hasChofer && !hasVehiculo) {
        return NextResponse.json({ error: "Missing driver or vehicle" }, { status: 400 });
      }

      if (hasVehiculo) {
        const vehiculo = await prisma.vehiculo.findFirst({
          where: {
            idVehiculo: body.idVehiculo,
            idVendedor: context.idVendedor,
          },
        });

        if (!vehiculo) {
          return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        if (vehiculo.estado === "pausado") {
          return NextResponse.json({ error: "No se puede asignar un vehículo pausado" }, { status: 409 });
        }
      }

      if (hasChofer) {
        const choferExists = await prisma.chofer.findFirst({
          where: {
            idChofer: body.idChofer,
            idVendedor: context.idVendedor,
          },
        });

        if (!choferExists) {
          return NextResponse.json({ error: "Chofer not found" }, { status: 404 });
        }

        if (String(choferExists.estado) === "inactivo") {
          return NextResponse.json({ error: "No se puede asignar un vehículo a un chofer inactivo" }, { status: 409 });
        }
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (hasVehiculo) {
          await tx.chofer.updateMany({
            where: {
              idVendedor: context.idVendedor,
              idVehiculo: body.idVehiculo,
            },
            data: { idVehiculo: null },
          });
        }

        if (!hasChofer) {
          return null;
        }

        await tx.chofer.updateMany({
          where: {
            idChofer: body.idChofer,
            idVendedor: context.idVendedor,
          },
          data: { idVehiculo: null },
        });

        if (!hasVehiculo) {
          return await tx.chofer.findFirst({
            where: {
              idChofer: body.idChofer,
              idVendedor: context.idVendedor,
            },
          });
        }

        return await tx.chofer.update({
          where: { idChofer: body.idChofer },
          data: { idVehiculo: body.idVehiculo },
        });
      });

      return NextResponse.json({ ok: true, chofer: result }, { status: 200 });

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
            estado: "activo",
            motivoPausa: null,
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

    if (body.action === "set_vehicle_state") {
      if (context.idVendedor === null) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }

      if (typeof body.idVehiculo !== "number" || typeof body.estado !== "string") {
        return NextResponse.json({ error: "Missing vehicle id or state" }, { status: 400 });
      }

      const allowedStates = ["activo", "pausado"];
      if (!allowedStates.includes(body.estado)) {
        return NextResponse.json({ error: "Invalid vehicle state" }, { status: 400 });
      }

      const vehiculo = await prisma.vehiculo.findFirst({
        where: { idVehiculo: body.idVehiculo, idVendedor: context.idVendedor },
      });

      if (!vehiculo) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      const idVehiculo = body.idVehiculo;

      const motivoPausa = body.estado === "pausado" ? String(body.motivoPausa ?? "").trim() : null;
      if (body.estado === "pausado" && !motivoPausa) {
        return NextResponse.json({ error: "Debés indicar un motivo para pausar el vehículo" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (body.estado === "pausado") {
          await tx.chofer.updateMany({
            where: {
              idVendedor: context.idVendedor,
              idVehiculo,
            },
            data: { idVehiculo: null },
          });
        }

        return await tx.vehiculo.updateMany({
          where: { idVehiculo, idVendedor: context.idVendedor },
          data: {
            estado: body.estado,
            motivoPausa,
          },
        });
      });

      if (result.count === 0) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      const updated = await prisma.vehiculo.findUnique({ where: { idVehiculo: body.idVehiculo } });
      return NextResponse.json({ ok: true, vehiculo: updated }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("logistic-admin POST error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
