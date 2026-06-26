import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  const where: Record<string, unknown> = {};
  if (empresaId) where.idVendedor = empresaId;

  const [active, paused] = await Promise.all([
    prisma.vehiculo.count({ where: { ...where, estado: "activo" } }),
    prisma.vehiculo.count({ where: { ...where, estado: "pausado" } }),
  ]);

  return NextResponse.json({ vehicles: { active, paused } });
}