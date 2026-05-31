import { NextResponse } from "next/server";
import { getMockVendors } from "@/lib/mocks/ARCHIVED/vendors";

export async function GET() {
  return NextResponse.json({ vendors: getMockVendors() }, { status: 200 });
}