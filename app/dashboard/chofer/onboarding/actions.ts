"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getVendors as getVendorsFromLib } from "@/lib/vendors";

export async function createChoferProfile(data: {
  nombre: string;
  telefono: string;
  idVendedor: number;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "Unauthorized" };
    }

    const existing = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
    });

    if (existing) {
      return { error: "Ya tienes un perfil registrado" };
    }

    const chofer = await prisma.chofer.create({
      data: {
        clerkUserId: userId,
        nombre: data.nombre,
        telefono: data.telefono,
        idVendedor: data.idVendedor,
        estado: "pendiente",
        disponible: true,
      },
    });

    return { ok: true, idChofer: chofer.idChofer };
  } catch (error) {
    console.error("createChoferProfile error:", error);
    return { error: "Error al crear el perfil" };
  }
}

export async function getChoferProfile() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { chofer: null, error: "Unauthorized" };
    }

    const chofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      include: {
        vehiculo: true,
      },
    });

    return { chofer };
  } catch (error) {
    console.error("getChoferProfile error:", error);
    return { chofer: null, error: "Error al obtener el perfil" };
  }
}

export async function fetchVendorsForClient() {
  try {
    const vendors = await getVendorsFromLib();
    return vendors;
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }
}