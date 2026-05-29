import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type AdminProfilePayload = {
  nombre?: unknown;
  apellido?: unknown;
  telefono?: unknown;
  nombreEmpresa?: unknown;
};

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.adminDelivery.findUnique({ where: { clerkUserId: userId } });
    const userRole = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });

    const nombreFull = admin?.nombre ?? null;
    let nombre = "";
    let apellido = "";
    let telefono = admin?.telefono ?? null;
    if (nombreFull) {
      const parts = nombreFull.trim().split(/\s+/);
      nombre = parts.shift() ?? "";
      apellido = parts.join(" ");
    }

    return NextResponse.json({ ok: true, profile: { nombre: nombre || null, apellido: apellido || null, nombreEmpresa: userRole?.nombreEmpresa ?? null, telefono: telefono ?? null } }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin profile GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as AdminProfilePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();
    if (!fullName) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    // Create or update admin record in local DB (upsert) so users can save their profile
    const updatedAdmin = await prisma.adminDelivery.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, nombre: fullName, telefono: toOptionalString(body.telefono) },
      update: { nombre: fullName, telefono: toOptionalString(body.telefono) },
    });

    // update userRole.nombreEmpresa if provided and exists
    const nombreEmpresa = toOptionalString(body.nombreEmpresa);
    let updatedUserRole = null;
    const existingRole = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });
    if (existingRole && nombreEmpresa !== null) {
      updatedUserRole = await prisma.userRole.update({ where: { clerkUserId: userId }, data: { nombreEmpresa } });
    }

    return NextResponse.json({ ok: true, profile: { nombre: updatedAdmin.nombre, nombreEmpresa: updatedUserRole?.nombreEmpresa ?? existingRole?.nombreEmpresa ?? null, telefono: updatedAdmin.telefono ?? null } }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin profile PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
