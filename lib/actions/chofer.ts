"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getChoferStatus } from "@/lib/choferStatus";

export async function updatePedidoStatus(idPedido: number, estado: string, motivoRevision?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const pedido = await prisma.pedido.findUnique({ where: { idPedido } });
  if (!pedido) throw new Error("Pedido no encontrado");

  const allowedStatuses = ["en_camino", "entregado", "revision"];
  if (!allowedStatuses.includes(estado)) throw new Error("Estado inválido");

  if (estado === "revision" && !motivoRevision?.trim()) {
    throw new Error("Debés indicar un motivo para marcar en revisión");
  }

  await prisma.pedido.update({
    where: { idPedido },
    data: {
      estado,
      motivoRevision: estado === "revision" ? motivoRevision?.trim() ?? null : null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/chofer/mis-pedidos");
}

export async function getChoferProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const chofer = await prisma.chofer.findUnique({
    where: { clerkUserId: userId },
    include: { vehiculo: true },
  });

  return chofer;
}

export async function updateChoferProfile(data: {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  disponible?: boolean;
  cbuCvu?: string | null;
  alias?: string | null;
  cuilCuit?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const fullName = [data.nombre ?? "", data.apellido ?? ""].filter(Boolean).join(" ").trim();
  if (!fullName) throw new Error("El nombre es obligatorio");

  const existing = await prisma.chofer.findUnique({ where: { clerkUserId: userId } });
  if (!existing) throw new Error("Perfil no encontrado");

  const chofer = await prisma.chofer.update({
    where: { clerkUserId: userId },
    data: {
      nombre: fullName,
      telefono: data.telefono?.trim() || null,
      disponible: typeof data.disponible === "boolean" ? data.disponible : existing.disponible,
      cbuCvu: data.cbuCvu?.trim() || null,
      alias: data.alias?.trim() || null,
      cuilCuit: data.cuilCuit?.trim() || null,
    },
    include: { vehiculo: true },
  });

  return chofer;
}

export async function getChoferStatusData() {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  return getChoferStatus(userId);
}
