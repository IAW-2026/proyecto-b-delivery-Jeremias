import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  try {
    // Leer userId del header que viene del cliente
    const userId = request.headers.get("X-User-ID");
    if (!userId) {
      return NextResponse.json({ role: null }, { status: 200 });
    }
      // Obtener usuario de Clerk
    const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
    if (!secretKey) {
      return NextResponse.json({ role: null }, { status: 200 });
    }

    const clerkApiBase = 'https://api.clerk.com';
    const res = await fetch(`${clerkApiBase}/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ role: null }, { status: 200 });
    }
    const user = await res.json();
    // Clerk REST returns snake_case for metadata
    const role = (user.public_metadata && user.public_metadata.role) || (user.publicMetadata && user.publicMetadata.role) || null;
    return NextResponse.json({ role }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ role: null, error: "Error fetching role" }, { status: 500 });
  }
}