import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { parsePage, pageSize } from "@/lib/shared/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page") ?? undefined);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || pageSize, 1), 100);
  const q = searchParams.get("q")?.trim();
  const idVendedor = searchParams.get("idVendedor")?.trim();

  const where: Record<string, unknown> = { role: "logistic_admin" };

  if (idVendedor) {
    where.idVendedor = idVendedor;
  }

  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [total, items] = await Promise.all([
      prisma.userProfile.count({ where }),
      prisma.userProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const clerkUserIds = items.map((i: { clerkUserId: string }) => i.clerkUserId);
    const accessControls = await prisma.userAccessControl.findMany({
      where: { clerkUserId: { in: clerkUserIds } },
      select: { clerkUserId: true, isBlocked: true, blockedReason: true, blockedAt: true },
    });
    const accessMap = new Map<string, { isBlocked: boolean; blockedReason: string | null; blockedAt: Date | null }>();
    for (const a of accessControls) {
      accessMap.set(a.clerkUserId, { isBlocked: a.isBlocked, blockedReason: a.blockedReason, blockedAt: a.blockedAt });
    }

    return NextResponse.json({
      items: items.map((profile: { clerkUserId: string; nombre: string | null; telefono: string | null; idVendedor: string; nombreEmpresa: string | null; createdAt: Date; updatedAt: Date }) => {
        const access = accessMap.get(profile.clerkUserId);
        return {
          clerkUserId: profile.clerkUserId,
          nombre: profile.nombre,
          telefono: profile.telefono,
          email: null,
          idVendedor: profile.idVendedor,
          nombreEmpresa: profile.nombreEmpresa,
          isBlocked: access?.isBlocked ?? false,
          blockedReason: access?.blockedReason ?? null,
          blockedAt: access?.blockedAt ? access.blockedAt.toISOString() : null,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        };
      }),
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching logistics admins:", error);
    return NextResponse.json({ error: "Error al obtener administradores logísticos" }, { status: 500 });
  }
}
