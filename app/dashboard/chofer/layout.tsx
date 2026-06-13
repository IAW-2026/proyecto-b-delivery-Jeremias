import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocalDisplayName } from "@/lib/localDisplayName";
import ChoferLayoutClient from "@/components/chofer/layout-client";

export default async function ChoferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  const [displayName, chofer] = await Promise.all([
    getLocalDisplayName(userId),
    prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      select: { estado: true },
    }),
  ]);

  const choferEstado = chofer?.estado ?? null;

  return <ChoferLayoutClient displayName={displayName} choferEstado={choferEstado}>{children}</ChoferLayoutClient>;
}
