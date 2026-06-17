"use server";

import { prisma } from "@/lib/prisma";

export type EmpresaOption = {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion: string;
};

export async function getLogisticAdminEmpresas(): Promise<EmpresaOption[]> {
  const empresas = await prisma.userProfile.findMany({
    where: { role: "logistic_admin" },
    select: { idVendedor: true, nombreEmpresa: true },
    distinct: ["idVendedor"],
  });

  return empresas.map((e: { idVendedor: string; nombreEmpresa: string | null }) => ({
    id: e.idVendedor,
    nombre: e.nombreEmpresa ?? `Empresa #${e.idVendedor}`,
    descripcion: e.nombreEmpresa ?? undefined,
    direccion: "",
  }));
}
