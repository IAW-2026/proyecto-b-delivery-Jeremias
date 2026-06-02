import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_DELIVERY_ROLE,
  LOGISTIC_ADMIN_ROLE,
  resolveRolesFromClaims,
  syncClerkRoleMetadata,
  revokeAllClerkSessions,
} from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ role: [] }, { status: 401 });
    }

    const displayedRole = resolveRolesFromClaims(sessionClaims);

    return NextResponse.json({ role: displayedRole }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: [], error: "Error fetching role" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const idVendedor = Number(body.idVendedor ?? body.id_vendedor ?? 0);
    const role = typeof body.role === "string" ? body.role : LOGISTIC_ADMIN_ROLE;

    if (role === ADMIN_DELIVERY_ROLE) {
      return NextResponse.json({ error: "admin_delivery cannot be assigned from the app" }, { status: 400 });
    }

    if (!idVendedor) return NextResponse.json({ error: "Missing idVendedor" }, { status: 400 });

    const synced = await syncClerkRoleMetadata(userId, role);
    console.debug("syncClerkRoleMetadata result", userId, role, synced);
    const revoked = await revokeAllClerkSessions(userId).catch(() => false);
    console.debug("revokeAllClerkSessions result", userId, revoked);

    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      update: { idVendedor, role },
      create: { clerkUserId: userId, idVendedor, role },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("user-role POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}