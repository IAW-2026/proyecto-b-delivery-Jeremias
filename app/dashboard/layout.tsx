import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return children;
}