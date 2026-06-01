import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    // For debugging, we can show the first few chars but be careful in production
    clerkPublishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10) ?? null,
    clerkSecretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10) ?? null,
  });
}