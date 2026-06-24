import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";
import { parsePage, pageSize } from "@/lib/shared/utils";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page") ?? undefined);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || pageSize, 1), 100);
  const q = searchParams.get("q")?.trim();
  const idVendedor = searchParams.get("idVendedor")?.trim();
  const isBlockedFilter = searchParams.get("isBlocked")?.trim();

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
      select: { clerkUserId: true, isBlocked: true },
    });
    const accessMap = new Map<string, boolean>();
    for (const ac of accessControls) {
      accessMap.set(ac.clerkUserId, ac.isBlocked);
    }

    type AdminItem = { clerkUserId: string; nombre: string | null; idVendedor: string; nombreEmpresa: string | null; isBlocked: boolean; createdAt: string };

    const baseItems: AdminItem[] = items.map((profile: { clerkUserId: string; nombre: string | null; idVendedor: string; nombreEmpresa: string | null; createdAt: Date }) => ({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      idVendedor: profile.idVendedor,
      nombreEmpresa: profile.nombreEmpresa,
      isBlocked: accessMap.get(profile.clerkUserId) ?? false,
      createdAt: profile.createdAt.toISOString(),
    }));

    let mapped: AdminItem[];
    if (isBlockedFilter === "true") {
      mapped = baseItems.filter((a) => a.isBlocked);
    } else if (isBlockedFilter === "false") {
      mapped = baseItems.filter((a) => !a.isBlocked);
    } else {
      mapped = baseItems;
    }

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageCount: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching logistics admins:", error);
    return NextResponse.json({ error: "Error al obtener administradores logísticos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { clerkUserId?: string; idVendedor?: string; nombreEmpresa?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.clerkUserId || !body.idVendedor) {
    return NextResponse.json({ error: "Faltan campos requeridos: clerkUserId, idVendedor" }, { status: 400 });
  }

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const clerkUser = await client.users.getUser(body.clerkUserId).catch(() => null);
    if (!clerkUser) {
      return NextResponse.json({ error: "El usuario de Clerk no existe" }, { status: 404 });
    }

    const metadata = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>;
    const currentRoles = Array.isArray(metadata.roles)
      ? (metadata.roles as string[])
      : typeof metadata.roles === "string"
        ? [metadata.roles as string]
        : [];
    const mergedRoles = [...new Set([...currentRoles, "logistic_admin"])];

    await client.users.updateUser(body.clerkUserId, {
      publicMetadata: {
        ...metadata,
        roles: mergedRoles,
        role: null,
      },
    });

    const profile = await prisma.userProfile.upsert({
      where: { clerkUserId: body.clerkUserId },
      create: {
        clerkUserId: body.clerkUserId,
        role: "logistic_admin",
        idVendedor: body.idVendedor,
        nombreEmpresa: body.nombreEmpresa ?? null,
      },
      update: {
        role: "logistic_admin",
        idVendedor: body.idVendedor,
        nombreEmpresa: body.nombreEmpresa ?? null,
      },
    });

    const { revokeAllClerkSessions } = await import("@/lib/roles");
    await revokeAllClerkSessions(body.clerkUserId).catch(() => false);

    return NextResponse.json({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      idVendedor: profile.idVendedor,
      nombreEmpresa: profile.nombreEmpresa,
      isBlocked: false,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating logistics admin:", error);
    return NextResponse.json({ error: "Error al crear el administrador logístico" }, { status: 500 });
  }
}
