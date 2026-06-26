import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function PATCH(
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

    const current = await prisma.userAccessControl.findUnique({
      where: { clerkUserId },
      select: { isBlocked: true },
    });

    const isCurrentlyBlocked = current?.isBlocked ?? false;
    const nuevoEstado = !isCurrentlyBlocked;

    await prisma.userAccessControl.upsert({
      where: { clerkUserId },
      create: {
        clerkUserId,
        isBlocked: nuevoEstado,
        blockedReason: nuevoEstado ? "Bloqueado por administrador" : null,
        blockedByClerkUserId: null,
        blockedAt: nuevoEstado ? new Date() : null,
      },
      update: {
        isBlocked: nuevoEstado,
        blockedReason: nuevoEstado ? "Bloqueado por administrador" : null,
        blockedByClerkUserId: null,
        blockedAt: nuevoEstado ? new Date() : null,
      },
    });

    if (nuevoEstado) {
      const { revokeAllClerkSessions } = await import("@/lib/roles");
      await revokeAllClerkSessions(clerkUserId).catch(() => false);
    }

    return NextResponse.json({ ok: true, nuevoEstado: nuevoEstado ? "bloqueado" : "activo" });
  } catch (error) {
    console.error("Error toggling delivery admin block:", error);
    return NextResponse.json({ error: "Error al cambiar estado del administrador global" }, { status: 500 });
  }
}
