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
  const isBlockedFilter = searchParams.get("isBlocked")?.trim();

  const where: Record<string, unknown> = { role: "admin_delivery" };

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

    type AdminItem = { clerkUserId: string; nombre: string | null; telefono: string | null; isBlocked: boolean; createdAt: string };

    const baseItems: AdminItem[] = items.map((profile: { clerkUserId: string; nombre: string | null; telefono: string | null; createdAt: Date }) => ({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      telefono: profile.telefono,
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
    console.error("Error fetching delivery admins:", error);
    return NextResponse.json({ error: "Error al obtener administradores globales" }, { status: 500 });
  }
}

function generateTempPassword(): string {
  return crypto.randomUUID().slice(0, 12);
}

export async function POST(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { email?: string; nombre?: string; telefono?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.email || !body.nombre) {
    return NextResponse.json({ error: "Faltan campos requeridos: email, nombre" }, { status: 400 });
  }

  const password = generateTempPassword();

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const nameParts = body.nombre.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const clerkUser = await client.users.createUser({
      emailAddress: [body.email.trim()],
      password,
      firstName,
      lastName,
      publicMetadata: { roles: ["admin_delivery"] },
    });

    await Promise.all([
      prisma.userProfile.upsert({
        where: { clerkUserId: clerkUser.id },
        create: {
          clerkUserId: clerkUser.id,
          role: "admin_delivery",
          idVendedor: "",
          nombre: body.nombre.trim(),
          telefono: body.telefono?.trim() ?? "",
        },
        update: {
          role: "admin_delivery",
          idVendedor: "",
          nombre: body.nombre.trim(),
          telefono: body.telefono?.trim() ?? "",
        },
      }),
      prisma.userAccessControl.upsert({
        where: { clerkUserId: clerkUser.id },
        create: { clerkUserId: clerkUser.id, isBlocked: false },
        update: { isBlocked: false },
      }),
    ]);

    const { revokeAllClerkSessions } = await import("@/lib/roles");
    await revokeAllClerkSessions(clerkUser.id).catch(() => false);

    return NextResponse.json({
      clerkUserId: clerkUser.id,
      nombre: body.nombre.trim(),
      telefono: body.telefono?.trim() ?? "",
      isBlocked: false,
      createdAt: new Date().toISOString(),
      temporaryPassword: password,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email en Clerk" }, { status: 409 });
    }
    console.error("Error creating delivery admin:", error);
    return NextResponse.json({ error: "Error al crear el administrador global" }, { status: 500 });
  }
}
