import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const CLERK_API_BASE = "https://api.clerk.com";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, phone } = body;

    const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
    if (!secretKey) return NextResponse.json({ error: "Missing Clerk secret" }, { status: 500 });

    // Obtener metadata actual
    const getRes = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
    });
    if (!getRes.ok) {
      const txt = await getRes.text();
      console.error("Clerk GET user error:", getRes.status, txt);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
    const user = await getRes.json();
    const currentMeta = user.public_metadata ?? user.publicMetadata ?? user.public_metadata ?? {};

    // PATCH para actualizar usuario (nombres y public_metadata.phone)
    const patchBody: {
        first_name?: string;
        last_name?: string;
        public_metadata?: Record<string, unknown>;
    } = {};
    if (firstName !== undefined) patchBody.first_name = firstName;
    if (lastName !== undefined) patchBody.last_name = lastName;
    patchBody.public_metadata = { ...currentMeta, ...(phone ? { phone } : {}) };

    const patchRes = await fetch(`${CLERK_API_BASE}/v1/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchBody),
    });

    if (!patchRes.ok) {
      const txt = await patchRes.text();
      console.error("Clerk PATCH user error:", patchRes.status, txt);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update-profile error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}