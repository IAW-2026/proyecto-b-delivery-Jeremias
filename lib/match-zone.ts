import { prisma } from "@/lib/prisma";

export async function matchExistingZone(suburb: string, idVendedor: string): Promise<string | null> {
  const zonas = await prisma.zona.findMany({
    where: { empresas: { some: { idVendedor } } },
    select: { nombre: true },
  });

  const normalizedSuburb = suburb.toLowerCase().trim();
  for (const z of zonas) {
    if (z.nombre.toLowerCase().trim() === normalizedSuburb) {
      return z.nombre;
    }
  }

  return null;
}
