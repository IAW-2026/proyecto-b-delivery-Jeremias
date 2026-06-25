import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const zone = searchParams.get("zone");

  const where: Record<string, unknown> = {};
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
  }
  
  if (zone) {
    where.zona = zone;
  }

  const [completed, failed] = await Promise.all([
    prisma.pedido.count({ where: { ...where, estado: "entregado" } }),
    prisma.pedido.count({ where: { ...where, estado: "cancelado" } }),
  ]);

  return NextResponse.json({ completed, failed });
}