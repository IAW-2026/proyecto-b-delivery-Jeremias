import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCompanyContext } from "@/lib/companyContext";

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  try {
    const companyContext = await getCompanyContext(request);
    if (!companyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await context.params;
    const id = Number(requestId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const pendingRequest = await prisma.choferRequest.findUnique({
      where: { id },
    });
    if (!pendingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (companyContext.idVendedor === null || pendingRequest.idVendedor !== companyContext.idVendedor) {
      return NextResponse.json({ error: "Request does not belong to this company" }, { status: 403 });
    }

    const reviewer = getAuth(request).userId;
    if (!reviewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chofer.upsert({
      where: { clerkUserId: pendingRequest.clerkUserId },
      update: {
        nombre: pendingRequest.nombre,
        telefono: pendingRequest.telefono,
        idVendedor: pendingRequest.idVendedor,
        estado: "activo",
        disponible: true,
        idVehiculo: null,
        idZona: null,
      },
      create: {
        clerkUserId: pendingRequest.clerkUserId,
        nombre: pendingRequest.nombre,
        telefono: pendingRequest.telefono,
        idVendedor: pendingRequest.idVendedor,
        estado: "activo",
        disponible: true,
        idVehiculo: null,
        idZona: null,
      },
    });

    await prisma.userRole.upsert({
      where: { clerkUserId: pendingRequest.clerkUserId },
      update: {
        role: "delivery",
        idVendedor: pendingRequest.idVendedor,
        nombreEmpresa: pendingRequest.vendorName,
      },
      create: {
        clerkUserId: pendingRequest.clerkUserId,
        role: "delivery",
        idVendedor: pendingRequest.idVendedor,
        nombreEmpresa: pendingRequest.vendorName,
      },
    });

    const approved = await prisma.choferRequest.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        reason: null,
      },
    });

    return NextResponse.json({ ok: true, request: approved }, { status: 200 });
  } catch (error) {
    console.error("approve chofer request error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}