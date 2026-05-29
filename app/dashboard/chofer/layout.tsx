import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocalDisplayName } from "@/lib/localDisplayName";
import ChoferLayoutClient from "./layoutClient";

export default async function ChoferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  const displayName = await getLocalDisplayName(userId);

  return <ChoferLayoutClient displayName={displayName}>{children}</ChoferLayoutClient>;
}
