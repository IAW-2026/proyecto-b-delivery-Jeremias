import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const companies = await prisma.userProfile.findMany({
    where: {
      role: "logistic_admin",
      idVendedor: { not: "" },
    },
    select: { idVendedor: true, nombreEmpresa: true },
    distinct: ["idVendedor"],
    orderBy: { nombreEmpresa: "asc" },
  });

  const result = companies
    .filter((c: { idVendedor: string; nombreEmpresa: string | null }) => c.idVendedor && c.nombreEmpresa)
    .map((c: { idVendedor: string; nombreEmpresa: string | null }) => ({
      id: c.idVendedor,
      name: c.nombreEmpresa,
    }));

  return NextResponse.json(result);
}