import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncClerkRoleMetadata, revokeAllClerkSessions } from "@/lib/roles";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const idVendedor = Number(id);
    if (Number.isNaN(idVendedor)) {
      return NextResponse.json({ error: "Invalid vendor id" }, { status: 400 });
    }

    const existing = await prisma.userProfile.findUnique({ where: { clerkUserId: userId } });
    if (existing) {
      return NextResponse.json({ error: "User already has a vendor association" }, { status: 409 });
    }

    await prisma.userProfile.create({
      data: {
        clerkUserId: userId,
        idVendedor,
        role: "logistic_admin",
      },
    });

    await syncClerkRoleMetadata(userId, "logistic_admin");
    await revokeAllClerkSessions(userId).catch(() => false);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("vendors/[id]/link POST error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
