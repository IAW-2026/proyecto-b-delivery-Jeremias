import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const CLERK_API_BASE = "https://api.clerk.com";

async function maybeSyncClerkName(userId: string, nombre: string) {
  const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
  if (!secretKey) return;

  try {
    const userResponse = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!userResponse.ok) return;

    const user = await userResponse.json();
    const currentName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username || "";
    if (currentName) return;

    const patchResponse = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: nombre,
        last_name: "",
      }),
    });

    if (!patchResponse.ok) {
      const text = await patchResponse.text();
      console.debug("Clerk name patch returned:", patchResponse.status, text);
    }
  } catch (error) {
    console.debug("Failed to sync Clerk name:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestRecord = await prisma.choferRequest.findUnique({
      where: { clerkUserId: userId },
    });

    return NextResponse.json({ ok: true, request: requestRecord }, { status: 200 });
  } catch (error) {
    console.error("chofer-requests GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nombre = String((body as { nombre?: unknown }).nombre ?? "").trim();
    const telefono = String((body as { telefono?: unknown }).telefono ?? "").trim();
    const idVendedor = Number((body as { idVendedor?: unknown; id_vendedor?: unknown }).idVendedor ?? (body as { idVendedor?: unknown; id_vendedor?: unknown }).id_vendedor ?? 0);
    const vendorName = String((body as { vendorName?: unknown }).vendorName ?? "").trim();

    if (!nombre || !telefono || !Number.isInteger(idVendedor) || idVendedor <= 0) {
      return NextResponse.json({ error: "Missing request data" }, { status: 400 });
    }

    await maybeSyncClerkName(userId, nombre);

    const existingRequest = await prisma.choferRequest.findUnique({
      where: { clerkUserId: userId },
    });

    if (existingRequest && (existingRequest.status === "pending" || existingRequest.status === "approved")) {
      return NextResponse.json(
        {
          error:
            existingRequest.status === "pending"
              ? "Ya tenés una solicitud pendiente"
              : "Ya tenés una solicitud aprobada",
          request: existingRequest,
        },
        { status: 409 }
      );
    }

    const requestRecord = await prisma.choferRequest.upsert({
      where: { clerkUserId: userId },
      update: {
        nombre,
        telefono,
        idVendedor,
        vendorName: vendorName || `Empresa #${idVendedor}`,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reason: null,
      },
      create: {
        clerkUserId: userId,
        nombre,
        telefono,
        idVendedor,
        vendorName: vendorName || `Empresa #${idVendedor}`,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error("chofer-requests POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}