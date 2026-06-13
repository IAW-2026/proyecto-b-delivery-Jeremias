"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getChoferRequest() {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  return prisma.choferRequest.findUnique({ where: { clerkUserId: userId } });
}

export async function createChoferRequest(data: {
  nombre: string;
  telefono: string;
  idVendedor: number;
  vendorName?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autorizado");

  const nombre = data.nombre.trim();
  const telefono = data.telefono.trim();
  const idVendedor = data.idVendedor;
  const vendorName = data.vendorName?.trim() || `Empresa #${idVendedor}`;

  if (!nombre || !telefono || !Number.isInteger(idVendedor) || idVendedor <= 0) {
    throw new Error("Datos de solicitud incompletos");
  }

  const existingRequest = await prisma.choferRequest.findUnique({ where: { clerkUserId: userId } });

  if (existingRequest && (existingRequest.status === "pending" || existingRequest.status === "approved")) {
    throw new Error(
      existingRequest.status === "pending"
        ? "Ya tenés una solicitud pendiente"
        : "Ya tenés una solicitud aprobada"
    );
  }

  return prisma.choferRequest.upsert({
    where: { clerkUserId: userId },
    update: {
      nombre,
      telefono,
      idVendedor,
      vendorName,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reason: null,
    },
    create: {
      clerkUserId: userId,
      nombre,
      telefono,
      idVendedor,
      vendorName,
      status: "pending",
    },
  });
}
