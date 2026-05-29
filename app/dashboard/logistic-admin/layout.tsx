import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocalDisplayName } from "@/lib/localDisplayName";
import LogisticAdminLayoutClient from "./layout-client";

export default async function LogisticAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  const displayName = await getLocalDisplayName(userId);

  return <LogisticAdminLayoutClient displayName={displayName}>{children}</LogisticAdminLayoutClient>;
}
