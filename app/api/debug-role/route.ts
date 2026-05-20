import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const CLERK_API_BASE = "https://api.clerk.com";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbRow = await prisma.userRole.findUnique({ where: { clerkUserId: userId } });

    // fetch clerk metadata
    let clerkUser: any = null;
    try {
      const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
      if (secretKey) {
        const res = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
        });
        if (res.ok) clerkUser = await res.json();
      }
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ ok: true, userId, dbRow, clerkUser }, { status: 200 });
  } catch (err) {
    console.error("debug-role error:", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
