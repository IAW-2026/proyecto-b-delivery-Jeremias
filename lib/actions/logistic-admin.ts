"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims } from "@/lib/roles";

async function getCompanyContext(vendedorId?: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  if (vendedorId !== undefined) {
    return { userId, idVendedor: vendedorId };
  }

  const userRole = await prisma.userProfile.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true },
  });

  const idVendedor = userRole?.idVendedor ?? null;
  if (idVendedor === null) throw new Error("Contexto de empresa requerido");

  return { userId, idVendedor };
}

// ─── Zonas ─────────────────────────────────────────────

export async function createZone(nombre: string, vendedorId?: number) {
  const { idVendedor } = await getCompanyContext(vendedorId);
  if (!nombre.trim()) throw new Error("Nombre de zona requerido");

  const existingZone = await prisma.zona.findUnique({ where: { nombre: nombre.trim() } });

  if (existingZone) {
    const alreadyLinked = await prisma.zonaEmpresa.findUnique({
      where: { idZona_idVendedor: { idZona: existingZone.idZona, idVendedor } },
    });
    if (alreadyLinked) {
      throw new Error(`Ya existe una zona con el nombre "${nombre.trim()}" para esta empresa`);
    }
    await prisma.zonaEmpresa.create({
      data: { idZona: existingZone.idZona, idVendedor },
    });
    revalidatePath("/dashboard/logistic-admin/zonas");
    revalidatePath("/dashboard/admin-delivery/zonas");
    return existingZone;
  }

  try {
    const zona = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const z = await tx.zona.create({ data: { nombre: nombre.trim() } });
      await tx.zonaEmpresa.create({ data: { idZona: z.idZona, idVendedor } });
      return z;
    });
    revalidatePath("/dashboard/logistic-admin/zonas");
    revalidatePath("/dashboard/admin-delivery/zonas");
    return zona;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Ya existe una zona con el nombre "${nombre.trim()}"`);
    }
    throw new Error("No se pudo crear la zona");
  }
}

export async function updateZone(idZona: number, nombre: string, vendedorId?: number) {
  const { idVendedor } = await getCompanyContext(vendedorId);
  if (!nombre.trim()) throw new Error("Nombre de zona requerido");

  const zona = await prisma.zona.findUnique({ where: { idZona } });
  if (!zona) throw new Error("Zona no encontrada");

  try {
    const updated = await prisma.zona.update({
      where: { idZona },
      data: { nombre: nombre.trim() },
    });
    revalidatePath("/dashboard/logistic-admin/zonas");
    revalidatePath("/dashboard/admin-delivery/zonas");
    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Ya existe una zona con el nombre "${nombre.trim()}"`);
    }
    throw new Error("No se pudo actualizar la zona");
  }
}

export async function deleteZone(idZona: number, vendedorId?: number) {
  const { idVendedor } = await getCompanyContext(vendedorId);

  const junction = await prisma.zonaEmpresa.findUnique({
    where: { idZona_idVendedor: { idZona, idVendedor } },
  });
  if (!junction) throw new Error("Zona no encontrada para esta empresa");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.chofer.updateMany({
      where: { idZona, idVendedor },
      data: { idZona: null },
    });
    await tx.zonaEmpresa.delete({
      where: { idZona_idVendedor: { idZona, idVendedor } },
    });
  });

  revalidatePath("/dashboard/logistic-admin/zonas");
  revalidatePath("/dashboard/admin-delivery/zonas");
}

export async function globalDeleteZone(idZona: number) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("No autorizado");

  const roles = resolveRolesFromClaims(sessionClaims);
  if (!roles.includes(ADMIN_DELIVERY_ROLE)) throw new Error("No autorizado");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.chofer.updateMany({
      where: { idZona },
      data: { idZona: null },
    });
    await tx.zonaEmpresa.deleteMany({ where: { idZona } });
    await tx.zona.delete({ where: { idZona } });
  });

  revalidatePath("/dashboard/logistic-admin/zonas");
  revalidatePath("/dashboard/admin-delivery/zonas");
}

export async function disassociateVendorFromZone(idZona: number, idVendedor: number) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("No autorizado");

  const roles = resolveRolesFromClaims(sessionClaims);
  if (!roles.includes(ADMIN_DELIVERY_ROLE)) throw new Error("No autorizado");

  const junction = await prisma.zonaEmpresa.findUnique({
    where: { idZona_idVendedor: { idZona, idVendedor } },
  });
  if (!junction) throw new Error("La empresa no está vinculada a esta zona");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.chofer.updateMany({
      where: { idZona, idVendedor },
      data: { idZona: null },
    });
    await tx.zonaEmpresa.delete({
      where: { idZona_idVendedor: { idZona, idVendedor } },
    });
  });

  revalidatePath("/dashboard/logistic-admin/zonas");
  revalidatePath("/dashboard/admin-delivery/zonas");
}

// ─── Choferes ───────────────────────────────────────────

export async function assignDriverZone(idChofer: number, idZona: number) {
  const { idVendedor } = await getCompanyContext();

  const junction = await prisma.zonaEmpresa.findUnique({
    where: { idZona_idVendedor: { idZona, idVendedor } },
  });
  if (!junction) throw new Error("Zona no encontrada para esta empresa");

  const result = await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: { idZona },
  });
  if (result.count === 0) throw new Error("Chofer no encontrado");

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function clearDriverZone(idChofer: number) {
  const { idVendedor } = await getCompanyContext();

  const result = await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: { idZona: null },
  });
  if (result.count === 0) throw new Error("Chofer no encontrado");

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function updateChofer(
  idChofer: number,
  data: { nombre?: string; telefono?: string; idZona?: number | null; idVehiculo?: number | null }
) {
  const { idVendedor } = await getCompanyContext();

  const updateData: Prisma.ChoferUncheckedUpdateManyInput = {};
  if (data.nombre !== undefined) updateData.nombre = data.nombre.trim();
  if (data.telefono !== undefined) updateData.telefono = data.telefono.trim();
  if (data.idZona !== undefined) updateData.idZona = data.idZona;
  if (data.idVehiculo !== undefined) updateData.idVehiculo = data.idVehiculo;

  const result = await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: updateData,
  });
  if (result.count === 0) throw new Error("Chofer no encontrado");

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function deleteChofer(idChofer: number) {
  const { idVendedor } = await getCompanyContext();

  const existing = await prisma.chofer.findFirst({
    where: { idChofer, idVendedor },
  });
  if (!existing) throw new Error("Chofer no encontrado");

  const assignedActivePedido = await prisma.pedido.findFirst({
    where: {
      idChoferAsignado: idChofer,
      estado: { notIn: ["entregado", "cancelado"] },
    },
  });
  if (assignedActivePedido) {
    throw new Error("No se puede eliminar un chofer que tiene pedidos asignados activos");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.chofer.update({
      where: { idChofer },
      data: { estado: "inactivo", disponible: false, idVehiculo: null, idZona: null },
    });
    await tx.choferRequest.deleteMany({ where: { clerkUserId: existing.clerkUserId } });
  });

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function setChoferEstado(idChofer: number, estado: string) {
  const { idVendedor } = await getCompanyContext();

  const allowed = ["activo", "rechazado", "pendiente", "inactivo"];
  if (!allowed.includes(estado)) throw new Error("Estado inválido");

  const result = await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: { estado },
  });
  if (result.count === 0) throw new Error("Chofer no encontrado");

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function acceptDelivery(idChofer: number) {
  const { idVendedor } = await getCompanyContext();

  await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: { estado: "activo" },
  });

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function rejectDelivery(idChofer: number) {
  const { idVendedor } = await getCompanyContext();

  await prisma.chofer.updateMany({
    where: { idChofer, idVendedor },
    data: { estado: "rechazado" },
  });

  revalidatePath("/dashboard/logistic-admin/choferes");
}

// ─── Pedidos ────────────────────────────────────────────

export async function assignOrder(idPedido: number, idChofer: number) {
  const { idVendedor } = await getCompanyContext();

  const chofer = await prisma.chofer.findFirst({
    where: { idChofer, idVendedor },
  });
  if (!chofer) throw new Error("Chofer no encontrado");
  if (String(chofer.estado) === "inactivo") throw new Error("No se puede asignar a un chofer inactivo");
  if (chofer.idVehiculo === null) throw new Error("No se puede asignar a un chofer sin vehículo");

  await prisma.pedido.update({
    where: { idPedido },
    data: {
      estado: "asignado",
      assignedAt: new Date(),
      updatedAt: new Date(),
      choferAsignado: { connect: { idChofer } },
    },
  });

  revalidatePath("/dashboard/logistic-admin/pedidos");
}

export async function unassignOrder(idPedido: number) {
  await getCompanyContext();

  await prisma.pedido.update({
    where: { idPedido },
    data: {
      estado: "ready",
      assignedAt: null,
      updatedAt: new Date(),
      choferAsignado: { disconnect: true },
    },
  });

  revalidatePath("/dashboard/logistic-admin/pedidos");
}

export async function deleteOrder(idPedido: number) {
  await getCompanyContext();

  const result = await prisma.pedido.deleteMany({ where: { idPedido } });
  if (result.count === 0) throw new Error("Pedido no encontrado");

  revalidatePath("/dashboard/logistic-admin/pedidos");
}

export async function cancelOrder(idPedido: number) {
  await getCompanyContext();

  await prisma.pedido.update({
    where: { idPedido },
    data: {
      estado: "cancelado",
      assignedAt: null,
      updatedAt: new Date(),
      choferAsignado: { disconnect: true },
    },
  });

  revalidatePath("/dashboard/logistic-admin/pedidos");
}

export async function updateOrderStatus(idPedido: number, status: string) {
  await getCompanyContext();

  const allowedStatuses = ["ready", "asignado", "en_camino", "entregado", "cancelado", "revision"];
  if (!allowedStatuses.includes(status)) throw new Error("Estado inválido");

  const pedidoDb = await prisma.pedido.findUnique({ where: { idPedido } });
  if (!pedidoDb) throw new Error("Pedido no encontrado");

  if (status === "asignado" && !pedidoDb.idChoferAsignado) {
    throw new Error("Primero asigná un chofer al pedido");
  }

  const requiresAssignedChofer = status === "en_camino" || status === "entregado";
  if (requiresAssignedChofer && !pedidoDb.idChoferAsignado) {
    throw new Error("No podés mover este pedido a ese estado sin asignarle un chofer primero");
  }

  const shouldClearAssignment = status === "cancelado";

  await prisma.pedido.update({
    where: { idPedido },
    data: {
      estado: status,
      motivoRevision: status === "revision" ? pedidoDb.motivoRevision ?? null : null,
      updatedAt: new Date(),
      ...(shouldClearAssignment
        ? { assignedAt: null, choferAsignado: { disconnect: true } }
        : {}),
    },
  });

  revalidatePath("/dashboard/logistic-admin/pedidos");
}

// ─── Vehículos ─────────────────────────────────────────

export async function assignVehicle(idChofer?: number, idVehiculo?: number) {
  const { idVendedor } = await getCompanyContext();

  if (idVehiculo !== undefined) {
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { idVehiculo, idVendedor },
    });
    if (!vehiculo) throw new Error("Vehículo no encontrado");
    if (vehiculo.estado === "pausado") throw new Error("No se puede asignar un vehículo pausado");
  }

  if (idChofer !== undefined) {
    const choferExists = await prisma.chofer.findFirst({
      where: { idChofer, idVendedor },
    });
    if (!choferExists) throw new Error("Chofer no encontrado");
    if (String(choferExists.estado) === "inactivo") throw new Error("No se puede asignar un vehículo a un chofer inactivo");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (idVehiculo !== undefined) {
      await tx.chofer.updateMany({
        where: { idVendedor, idVehiculo },
        data: { idVehiculo: null },
      });
    }

    if (idChofer !== undefined) {
      await tx.chofer.updateMany({
        where: { idChofer, idVendedor },
        data: { idVehiculo: null },
      });

      if (idVehiculo !== undefined) {
        await tx.chofer.update({
          where: { idChofer },
          data: { idVehiculo },
        });
      }
    }
  });

  revalidatePath("/dashboard/logistic-admin/vehiculos");
  revalidatePath("/dashboard/logistic-admin/choferes");
}

// ─── Chofer Requests ───────────────────────────────────

export async function approveChoferRequest(requestId: number) {
  const { userId, idVendedor } = await getCompanyContext();

  const pendingRequest = await prisma.choferRequest.findUnique({
    where: { id: requestId },
  });
  if (!pendingRequest) throw new Error("Solicitud no encontrada");
  if (pendingRequest.idVendedor !== idVendedor) throw new Error("La solicitud no pertenece a esta empresa");

  await prisma.chofer.upsert({
    where: { clerkUserId: pendingRequest.clerkUserId },
    update: {
      nombre: pendingRequest.nombre,
      telefono: pendingRequest.telefono,
      idVendedor: pendingRequest.idVendedor,
      estado: "activo",
      disponible: true,
      idVehiculo: null,
      idZona: null,
    },
    create: {
      clerkUserId: pendingRequest.clerkUserId,
      nombre: pendingRequest.nombre,
      telefono: pendingRequest.telefono,
      idVendedor: pendingRequest.idVendedor,
      estado: "activo",
      disponible: true,
      idVehiculo: null,
      idZona: null,
    },
  });

  await prisma.userProfile.upsert({
    where: { clerkUserId: pendingRequest.clerkUserId },
    update: { role: "delivery", idVendedor: pendingRequest.idVendedor, nombreEmpresa: pendingRequest.vendorName },
    create: { clerkUserId: pendingRequest.clerkUserId, role: "delivery", idVendedor: pendingRequest.idVendedor, nombreEmpresa: pendingRequest.vendorName },
  });

  await prisma.choferRequest.update({
    where: { id: requestId },
    data: { status: "approved", reviewedBy: userId, reviewedAt: new Date(), reason: null },
  });

  revalidatePath("/dashboard/logistic-admin/choferes");
}

export async function rejectChoferRequest(requestId: number, reason?: string) {
  const { userId, idVendedor } = await getCompanyContext();

  const pendingRequest = await prisma.choferRequest.findUnique({
    where: { id: requestId },
  });
  if (!pendingRequest) throw new Error("Solicitud no encontrada");
  if (pendingRequest.idVendedor !== idVendedor) throw new Error("La solicitud no pertenece a esta empresa");

  await prisma.choferRequest.update({
    where: { id: requestId },
    data: { status: "rejected", reviewedBy: userId, reviewedAt: new Date(), reason: reason ?? null },
  });

  revalidatePath("/dashboard/logistic-admin/choferes");
}

// ─── Vendor Link ───────────────────────────────────────

export async function linkVendor(vendorId: number) {
  const { userId } = await getCompanyContext();

  const existing = await prisma.userProfile.findUnique({ where: { clerkUserId: userId } });
  if (existing) throw new Error("El usuario ya tiene una empresa asociada");

  await prisma.userProfile.create({
    data: {
      clerkUserId: userId,
      idVendedor: vendorId,
      role: "logistic_admin",
    },
  });

  const { syncClerkRoleMetadata } = await import("@/lib/roles");
  await syncClerkRoleMetadata(userId, "logistic_admin");

  revalidatePath("/dashboard/logistic-admin");
}

export async function createVehicle(patente: string, tipo: string, capacidadBidones: number, vendedorId?: number) {
  const { idVendedor } = await getCompanyContext(vendedorId);

  if (!patente.trim() || !tipo.trim() || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
    throw new Error("Datos de vehículo inválidos");
  }

  try {
    const vehiculo = await prisma.vehiculo.create({
      data: {
        patente: patente.trim().toUpperCase(),
        tipo: tipo.trim(),
        capacidadBidones,
        idVendedor,
        estado: "activo",
        motivoPausa: null,
      },
    });

    revalidatePath("/dashboard/logistic-admin/vehiculos");
    revalidatePath("/dashboard/admin-delivery/vehiculos");
    return vehiculo;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Ya existe un vehículo con la patente "${patente.trim().toUpperCase()}"`);
    }
    throw new Error("No se pudo crear el vehículo");
  }
}

export async function updateVehicle(
  idVehiculo: number,
  data: { patente?: string; tipo?: string; capacidadBidones?: number },
  vendedorId?: number
) {
  const { idVendedor } = await getCompanyContext(vendedorId);

  const vehiculo = vendedorId !== undefined
    ? await prisma.vehiculo.findUnique({ where: { idVehiculo } })
    : await prisma.vehiculo.findFirst({ where: { idVehiculo, idVendedor } });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  const patente = data.patente?.trim().toUpperCase() ?? vehiculo.patente;
  const tipo = data.tipo?.trim() ?? vehiculo.tipo;
  const capacidadBidones = data.capacidadBidones ?? vehiculo.capacidadBidones;

  if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
    throw new Error("Datos de vehículo inválidos");
  }

  try {
    const updated = await prisma.vehiculo.update({
      where: { idVehiculo },
      data: { patente, tipo, capacidadBidones },
    });

    revalidatePath("/dashboard/logistic-admin/vehiculos");
    revalidatePath("/dashboard/admin-delivery/vehiculos");
    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Ya existe un vehículo con la patente "${patente}"`);
    }
    throw new Error("No se pudo actualizar el vehículo");
  }
}

export async function deleteVehicle(idVehiculo: number, vendedorId?: number) {
  const { idVendedor } = await getCompanyContext(vendedorId);

  const vehiculo = vendedorId !== undefined
    ? await prisma.vehiculo.findUnique({ where: { idVehiculo } })
    : await prisma.vehiculo.findFirst({ where: { idVehiculo, idVendedor } });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  await prisma.$transaction([
    prisma.chofer.updateMany({
      where: { idVendedor, idVehiculo },
      data: { idVehiculo: null },
    }),
    prisma.vehiculo.delete({ where: { idVehiculo } }),
  ]);

  revalidatePath("/dashboard/logistic-admin/vehiculos");
  revalidatePath("/dashboard/admin-delivery/vehiculos");
}

export async function setVehicleState(
  idVehiculo: number,
  estado: string,
  motivoPausa?: string | null,
  vendedorId?: number
) {
  const { idVendedor } = await getCompanyContext(vendedorId);

  const allowedStates = ["activo", "pausado"];
  if (!allowedStates.includes(estado)) throw new Error("Estado de vehículo inválido");

  const vehiculo = vendedorId !== undefined
    ? await prisma.vehiculo.findUnique({ where: { idVehiculo } })
    : await prisma.vehiculo.findFirst({ where: { idVehiculo, idVendedor } });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  const reason = estado === "pausado" ? (motivoPausa ?? "").trim() : null;
  if (estado === "pausado" && !reason) throw new Error("Debés indicar un motivo para pausar el vehículo");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (estado === "pausado") {
      await tx.chofer.updateMany({
        where: { idVendedor, idVehiculo },
        data: { idVehiculo: null },
      });
    }

    await tx.vehiculo.updateMany({
      where: { idVehiculo, idVendedor },
      data: { estado, motivoPausa: reason },
    });
  });

  revalidatePath("/dashboard/logistic-admin/vehiculos");
  revalidatePath("/dashboard/logistic-admin/choferes");
  revalidatePath("/dashboard/admin-delivery/vehiculos");
}
