import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clerkUserId: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { clerkUserId } = await params;
  if (!clerkUserId) {
    return NextResponse.json({ error: "clerkUserId requerido" }, { status: 400 });
  }

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!profile || profile.role !== "admin_delivery") {
      return NextResponse.json({ error: "Administrador global no encontrado" }, { status: 404 });
    }

    const access = await prisma.userAccessControl.findUnique({
      where: { clerkUserId },
      select: { isBlocked: true },
    });

    return NextResponse.json({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      telefono: profile.telefono,
      isBlocked: access?.isBlocked ?? false,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching delivery admin:", error);
    return NextResponse.json({ error: "Error al obtener el administrador global" }, { status: 500 });
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ clerkUserId: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { clerkUserId } = await params;
  if (!clerkUserId) {
    return NextResponse.json({ error: "clerkUserId requerido" }, { status: 400 });
  }

  let body: { nombre?: string; telefono?: string };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!existing || existing.role !== "admin_delivery") {
      return NextResponse.json({ error: "Administrador global no encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.telefono !== undefined) updateData.telefono = body.telefono.trim();

    const profile = await prisma.userProfile.update({
      where: { clerkUserId },
      data: updateData,
    });

    const access = await prisma.userAccessControl.findUnique({
      where: { clerkUserId },
      select: { isBlocked: true },
    });

    return NextResponse.json({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      telefono: profile.telefono,
      isBlocked: access?.isBlocked ?? false,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating delivery admin:", error);
    return NextResponse.json({ error: "Error al actualizar el administrador global" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clerkUserId: string }> }
) {
  if (!validateAdminApiKey(_request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { clerkUserId } = await params;
  if (!clerkUserId) {
    return NextResponse.json({ error: "clerkUserId requerido" }, { status: 400 });
  }

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!existing || existing.role !== "admin_delivery") {
      return NextResponse.json({ error: "Administrador global no encontrado" }, { status: 404 });
    }

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const clerkUser = await client.users.getUser(clerkUserId).catch(() => null);
    if (clerkUser) {
      const metadata = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>;
      const currentRoles = Array.isArray(metadata.roles)
        ? (metadata.roles as string[])
        : typeof metadata.roles === "string"
          ? [metadata.roles as string]
          : [];
      const filteredRoles = currentRoles.filter((r) => r !== "admin_delivery");

      await client.users.updateUser(clerkUserId, {
        publicMetadata: {
          ...metadata,
          roles: filteredRoles.length > 0 ? filteredRoles : null,
          role: null,
        },
      });
    }

    await prisma.userProfile.delete({
      where: { clerkUserId },
    });

    const { revokeAllClerkSessions } = await import("@/lib/roles");
    await revokeAllClerkSessions(clerkUserId).catch(() => false);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting delivery admin:", error);
    return NextResponse.json({ error: "Error al eliminar el administrador global" }, { status: 500 });
  }
}
