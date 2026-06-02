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

    const userProfile = await prisma.userProfile.findUnique({ where: { clerkUserId: userId } });

    const nombreFull = userProfile?.nombre ?? "";
    const parts = nombreFull.trim().length > 0 ? nombreFull.trim().split(/\s+/) : [];
    const nombre = parts.shift() ?? "";
    const apellido = parts.join(" ");
    const telefono = userProfile?.telefono ?? null;

    return NextResponse.json({ ok: true, profile: { nombre: nombre || null, apellido: apellido || null, nombreEmpresa: userProfile?.nombreEmpresa ?? null, telefono } }, { status: 200 });
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

    let savedName = fullName;
    let savedPhone: string | null = toOptionalString(body.telefono);

    const updatedProfile = await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, role: "logistic_admin", idVendedor: 0, nombre: fullName, telefono: savedPhone },
      update: { nombre: fullName, telefono: savedPhone },
    });

    savedName = updatedProfile.nombre;
    savedPhone = updatedProfile.telefono ?? null;

    // update nombreEmpresa if provided
    const nombreEmpresa = toOptionalString(body.nombreEmpresa);
    let updatedProfileEmpresa = null;
    if (nombreEmpresa !== null) {
      updatedProfileEmpresa = await prisma.userProfile.update({
        where: { clerkUserId: userId },
        data: { nombreEmpresa },
      }).catch(() => null);
    }

    const finalEmpresa = updatedProfileEmpresa?.nombreEmpresa ?? nombreEmpresa ?? null;

    return NextResponse.json({ ok: true, profile: { nombre: savedName, nombreEmpresa: finalEmpresa, telefono: savedPhone } }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin profile PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
