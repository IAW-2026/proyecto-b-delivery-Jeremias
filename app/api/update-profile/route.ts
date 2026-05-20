import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type ChoferProfilePayload = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  disponible?: boolean;
  cbuCvu?: string;
  alias?: string;
  cuilCuit?: string;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value !== "boolean") return null;
  return value;
}

async function updateClerkName(userId: string, firstName: string, lastName?: string) {
  const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;

  if (!secretKey) {
    throw new Error("Missing Clerk secret key");
  }

  const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      first_name: firstName,
      ...(lastName !== undefined ? { last_name: lastName } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Clerk update failed: ${response.status} ${text}`);
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      select: {
        nombre: true,
        telefono: true,
        disponible: true,
        cbuCvu: true,
        alias: true,
        cuilCuit: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        chofer: {
          nombre: chofer?.nombre ?? "",
          telefono: chofer?.telefono ?? "",
          disponible: chofer?.disponible ?? true,
          cbuCvu: chofer?.cbuCvu ?? "",
          alias: chofer?.alias ?? "",
          cuilCuit: chofer?.cuilCuit ?? "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("update-profile GET error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const payload = body as ChoferProfilePayload;

    const nombre = normalizeText(payload.nombre);
    const apellido = normalizeText(payload.apellido);
    const telefono = normalizeText(payload.telefono);
    const cbuCvu = normalizeText(payload.cbuCvu);
    const alias = normalizeText(payload.alias);
    const cuilCuit = normalizeText(payload.cuilCuit);
    const disponible = normalizeBoolean(payload.disponible);

    const existingChofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      select: { idChofer: true },
    });

    if (existingChofer) {
      await prisma.chofer.update({
        where: { clerkUserId: userId },
        data: {
          ...(nombre !== null ? { nombre } : {}),
          ...(telefono !== null ? { telefono } : {}),
          ...(disponible !== null ? { disponible } : {}),
          ...(cbuCvu !== null ? { cbuCvu } : {}),
          ...(alias !== null ? { alias } : {}),
          ...(cuilCuit !== null ? { cuilCuit } : {}),
        },
      });
    } else {
      // Determine idVendedor from UserRole if available; fallback to 0
      const userRole = await prisma.userRole.findUnique({
        where: { clerkUserId: userId },
        select: { idVendedor: true },
      });

      const idVendedorForCreate = userRole?.idVendedor ?? 0;

      await prisma.chofer.create({
        data: {
          clerkUserId: userId,
          idVendedor: idVendedorForCreate,
          ...(nombre !== null ? { nombre } : {}),
          ...(telefono !== null ? { telefono } : {}),
          ...(disponible !== null ? { disponible } : {}),
          ...(cbuCvu !== null ? { cbuCvu } : {}),
          ...(alias !== null ? { alias } : {}),
          ...(cuilCuit !== null ? { cuilCuit } : {}),
        },
      });
    }

    if (nombre !== null || apellido !== null) {
      await updateClerkName(userId, nombre ?? "", apellido ?? "");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update-profile error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}