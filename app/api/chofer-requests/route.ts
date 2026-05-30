import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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