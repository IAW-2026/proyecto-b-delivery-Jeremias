import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await currentUser();

  // Prefer DB mapping for role resolution (authoritative)
  let roleRow: { role?: string } | null = null;
  if (user?.id) {
    try {
      roleRow = await prisma.userRole.findUnique({ where: { clerkUserId: user.id } });
    } catch (err) {
      console.error("Error reading userRole from DB:", err);
    }
  }

  if (roleRow?.role === "logistic_admin") redirect("/dashboard/logistic-admin");
  if (roleRow?.role === "delivery") redirect("/dashboard/chofer");

  // Fallback: use API which reads Clerk metadata
  let userRole: { role?: string[] } | null = null;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user-role`,
      { headers: { "X-User-ID": user?.id || "" }, cache: "no-store" }
    );

    userRole = await response.json();
  } catch (error) {
    console.error("Error fetching user role (fallback):", error);
  }

  if (userRole?.role?.includes("logistic_admin")) redirect("/dashboard/logistic-admin");
  if (userRole?.role?.includes("delivery")) redirect("/dashboard/chofer");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-8 py-12 text-zinc-950">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold" style={{ color: "#00AEEF" }}>
          Dashboard
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          No encontramos un rol asignado para tu usuario. Si ya debería existir, contacta al administrador.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Esta ruta solo actúa como punto de entrada y redirige al panel correcto cuando detecta un rol válido.
        </p>
      </div>
    </div>
  );
}