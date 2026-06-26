import { NextRequest } from "next/server";

export function validateAdminApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.CONTROL_PLANE_API_KEY;
}
