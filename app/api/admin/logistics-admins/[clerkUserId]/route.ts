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

    if (!profile || profile.role !== "logistic_admin") {
      return NextResponse.json({ error: "Administrador logístico no encontrado" }, { status: 404 });
    }

    const access = await prisma.userAccessControl.findUnique({
      where: { clerkUserId },
      select: { isBlocked: true },
    });

    return NextResponse.json({
      clerkUserId: profile.clerkUserId,
      nombre: profile.nombre,
      idVendedor: profile.idVendedor,
      nombreEmpresa: profile.nombreEmpresa,
      isBlocked: access?.isBlocked ?? false,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching logistics admin:", error);
    return NextResponse.json({ error: "Error al obtener el administrador logístico" }, { status: 500 });
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

  let body: { nombre?: string; nombreEmpresa?: string };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!existing || existing.role !== "logistic_admin") {
      return NextResponse.json({ error: "Administrador logístico no encontrado" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.nombreEmpresa !== undefined) updateData.nombreEmpresa = body.nombreEmpresa.trim();

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
      idVendedor: profile.idVendedor,
      nombreEmpresa: profile.nombreEmpresa,
      isBlocked: access?.isBlocked ?? false,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating logistics admin:", error);
    return NextResponse.json({ error: "Error al actualizar el administrador logístico" }, { status: 500 });
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

    if (!existing || existing.role !== "logistic_admin") {
      return NextResponse.json({ error: "Administrador logístico no encontrado" }, { status: 404 });
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
      const filteredRoles = currentRoles.filter((r) => r !== "logistic_admin");

      await client.users.updateUser(clerkUserId, {
        publicMetadata: {
          ...metadata,
          roles: filteredRoles.length > 0 ? filteredRoles : ["delivery"],
          role: null,
        },
      });
    }

    await prisma.userProfile.update({
      where: { clerkUserId },
      data: { role: "removed" },
    });

    const { revokeAllClerkSessions } = await import("@/lib/roles");
    await revokeAllClerkSessions(clerkUserId).catch(() => false);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting logistics admin:", error);
    return NextResponse.json({ error: "Error al eliminar el administrador logístico" }, { status: 500 });
  }
}
