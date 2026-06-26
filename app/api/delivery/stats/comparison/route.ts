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

  async function getCounts(
    from: Date | undefined,
    to: Date | undefined,
  ) {
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = from;
      if (to) (where.createdAt as Record<string, Date>).lte = to;
    }

    const [completed, failed] = await Promise.all([
      prisma.pedido.count({ where: { ...where, estado: "entregado" } }),
      prisma.pedido.count({ where: { ...where, estado: "cancelado" } }),
    ]);

    return { completed, failed };
  }

  const currentFrom = dateFrom ? new Date(dateFrom) : undefined;
  const currentTo = dateTo ? new Date(dateTo) : undefined;

  let previousFrom: Date | undefined;
  let previousTo: Date | undefined;

  if (currentFrom && currentTo) {
    const rangeMs = currentTo.getTime() - currentFrom.getTime();
    previousTo = new Date(currentFrom.getTime());
    previousFrom = new Date(currentFrom.getTime() - rangeMs);
  }

  const [current, previous] = await Promise.all([
    getCounts(currentFrom, currentTo),
    getCounts(previousFrom, previousTo),
  ]);

  return NextResponse.json({ current, previous });
}