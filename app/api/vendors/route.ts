import { NextResponse } from "next/server";
import { getVendors } from "@/lib/vendors";

export async function GET() {
  const vendors = await getVendors();

  return NextResponse.json(vendors);
}
