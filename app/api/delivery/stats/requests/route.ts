import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  const where: Record<string, unknown> = { status: "pending" };
  if (empresaId) where.idVendedor = empresaId;

  const count = await prisma.choferRequest.count({ where });

  return NextResponse.json({ pendingRequests: count });
}