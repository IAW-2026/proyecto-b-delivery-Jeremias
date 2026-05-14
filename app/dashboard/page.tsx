import { currentUser } from "@clerk/nextjs/server";
import UserMenuClient from "./user-menu";

export default async function DashboardPage() {
  const user = await currentUser();

  // Fetch user role from API
  let userRole = null;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user-role`, {
      headers: {
        "X-User-ID": user?.id || "",
      },
    });
    userRole = await response.json();
  } catch (error) {
    console.error("Error fetching user role:", error);
  }

  const isLogistic_admin = userRole?.role === "logistic_admin";
  const isDelivery = userRole?.role === "delivery";

  return (
    <div className="flex flex-col h-full bg-white text-zinc-950">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white px-8 py-4 shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: "#00AEEF" }}>
        </h2>
        <UserMenuClient />
      </div>

      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-bold" style={{ color: "#00AEEF" }}>
            Bienvenido, {user?.firstName?.toUpperCase()}
          </h3>
          <p className="mt-2 text-zinc-500 text-sm">
            Rol: {userRole?.role || "sin asignar"}
          </p>

          {isLogistic_admin && (
            <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
              <p className="text-blue-900 font-medium">
                Panel de Administrador
              </p>
              <p className="text-blue-800 text-sm mt-2">
                Puedes gestionar choferes, rutas y vehículos.
              </p>
            </div>
          )}

          {isDelivery && (
            <div className="mt-6 p-4 bg-orange-100 rounded-lg border border-orange-200">
              <p className="text-orange-900 font-medium">
                Panel de Delivery
              </p>
              <p className="text-orange-800 text-sm mt-2">
                Puedes ver tus rutas y pedidos asignados.
              </p>
            </div>
          )}

          {!userRole && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-900 font-medium">
                Rol no asignado
              </p>
              <p className="text-yellow-800 text-sm mt-2">
                Contacta con el administrador para que te asigne un rol.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
