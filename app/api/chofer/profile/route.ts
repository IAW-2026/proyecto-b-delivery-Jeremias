import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type ChoferProfilePayload = {
  nombre?: unknown;
  apellido?: unknown;
  telefono?: unknown;
  disponible?: unknown;
  cbuCvu?: unknown;
  alias?: unknown;
  cuilCuit?: unknown;
};

function toOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      include: { vehiculo: true },
    });

    return NextResponse.json({ ok: true, chofer }, { status: 200 });
  } catch (error) {
    console.error("chofer profile GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ChoferProfilePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();
    if (!fullName) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const existing = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const chofer = await prisma.chofer.update({
      where: { clerkUserId: userId },
      data: {
        nombre: fullName,
        telefono: toOptionalString(body.telefono),
        disponible: toBoolean(body.disponible, existing.disponible),
        cbuCvu: toOptionalString(body.cbuCvu),
        alias: toOptionalString(body.alias),
        cuilCuit: toOptionalString(body.cuilCuit),
      },
      include: { vehiculo: true },
    });

    return NextResponse.json({ ok: true, chofer }, { status: 200 });
  } catch (error) {
    console.error("chofer profile PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}