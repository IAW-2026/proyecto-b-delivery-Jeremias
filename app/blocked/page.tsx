import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BlockedClient from "./blocked-client";
import { getUserAccessControl } from "@/lib/userAccess";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function BlockedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const access = await getUserAccessControl(userId);

  if (!access?.isBlocked) {
    redirect("/dashboard");
  }

  return <BlockedClient />;
}
