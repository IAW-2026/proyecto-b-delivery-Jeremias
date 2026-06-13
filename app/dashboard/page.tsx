import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { resolveRolesFromClaims } from "@/lib/roles";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const roles = resolveRolesFromClaims(sessionClaims);

  if (roles.includes("admin_delivery")) redirect("/dashboard/admin-delivery");
  if (roles.includes("logistic_admin")) redirect("/dashboard/logistic-admin");
  if (roles.includes("delivery")) redirect("/dashboard/chofer");

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