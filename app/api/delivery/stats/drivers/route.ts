import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [total, available] = await Promise.all([
    prisma.chofer.count(),
    prisma.chofer.count({ where: { disponible: true } }),
  ]);

  return NextResponse.json({ drivers: { available, total } });
}