import { NextRequest, NextResponse } from "next/server";
import { getCompanyContext } from "@/lib/companyContext";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const context = await getCompanyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.idVendedor === null) {
      return NextResponse.json({ ok: true, requests: [] }, { status: 200 });
    }

    const requests = await prisma.choferRequest.findMany({
      where: { idVendedor: context.idVendedor, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, requests }, { status: 200 });
  } catch (error) {
    console.error("logistic-admin chofer-requests GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}