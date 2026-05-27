import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getChoferStatus } from "@/lib/choferStatus";

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  return NextResponse.json(await getChoferStatus(userId), { status: 200 });
}