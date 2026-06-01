"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
