import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocalDisplayName } from "@/lib/localDisplayName";
import AdminDeliveryLayoutClient from "@/components/admin-delivery/layout-client";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  const displayName = await getLocalDisplayName(userId);

  return <AdminDeliveryLayoutClient displayName={displayName}>{children}</AdminDeliveryLayoutClient>;
}
