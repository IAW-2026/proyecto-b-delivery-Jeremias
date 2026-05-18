import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  let userRole = null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user-role`,
      {
        headers: {
          "X-User-ID": user?.id || "",
        },
      }
    );

    userRole = await response.json();
  } catch (error) {
    console.error("Error fetching user role:", error);
  }

  if (userRole?.role === "delivery") {
    redirect("/dashboard/chofer");
  }

  if (userRole?.role === "logistic_admin") {
    redirect("/dashboard/rutas");
  }

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