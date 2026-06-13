"use server";

import { auth } from "@clerk/nextjs/server";
import { resolveRolesFromClaims } from "@/lib/roles";

export async function getUserRole(): Promise<string[]> {
  const { sessionClaims } = await auth();
  return resolveRolesFromClaims(sessionClaims);
}
