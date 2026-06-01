import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getChoferStatus } from "@/lib/choferStatus";

export default async function ChoferDashboard() {
  const { userId } = await auth();
  const data = await getChoferStatus(userId);
  const fechaFormato = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const userNombre = data.chofer.nombre;
  const isPendingApproval = data.chofer.estado === "pendiente";
  const isInactive = data.chofer.estado === "inactivo" || data.chofer.estado === "rechazado";

  if (isInactive) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Cuenta desactivada</h1>
            <p className="text-gray-600 text-lg">
              Fuiste marcado como inactivo, contactate con tu administrador de la empresa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isPendingApproval) {
    return (
      <div>
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <div className="text-2xl mr-3">⏳</div>
            <div>
              <h2 className="font-semibold text-yellow-900">
                Tu solicitud está siendo procesada
              </h2>
              <p className="text-sm text-yellow-800 mt-1">
                La empresa solicitada está revisando tu información.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
            Bienvenido, {userNombre}
          </h1>
          <p className="text-gray-600">Estamos preparando todo para ti</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          Bienvenido, {userNombre}
        </h1>
        <p className="text-gray-600">
          Hoy es{" "}
          <span suppressHydrationWarning className="font-semibold">
            {fechaFormato || "cargando..."}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pedidos</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{data.cantidadPedidos}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Para entregar hoy</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Bidones</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{data.totalBidones}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Total a llevar</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Zona</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{data.chofer.zona}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Zona de entrega</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Vehículo</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{data.vehiculo?.patente ?? "Sin vehículo"}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Vehículo asignado</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#00AEEF" }}>
          📅 Información de Hoy
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Estado</p>
            <p className="text-lg font-bold text-green-600 capitalize">{data.chofer.estado}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/chofer/mis-pedidos">
          <div className="bg-blue-50 hover:bg-blue-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-blue-500">
            <div className="text-3xl mb-3" aria-hidden="true">📦</div>
            <h3 className="font-semibold text-blue-900">Ver Mis Pedidos</h3>
            <p className="text-sm text-blue-700 mt-1">{data.cantidadPedidos} pedidos pendientes</p>
          </div>
        </Link>

        <Link href="/dashboard/chofer/mi-zona">
          <div className="bg-purple-50 hover:bg-purple-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-purple-500">
            <div className="text-3xl mb-3" aria-hidden="true">🗺️</div>
            <h3 className="font-semibold text-purple-900">Mi Zona</h3>
            <p className="text-sm text-purple-700 mt-1">Información de la zona {data.chofer.zona}</p>
          </div>
        </Link>

        <Link href="/dashboard/chofer/mi-vehiculo">
          <div className="bg-orange-50 hover:bg-orange-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-orange-500">
            <div className="text-3xl mb-3" aria-hidden="true">🚛</div>
            <h3 className="font-semibold text-orange-900">Mi Vehículo</h3>
            <p className="text-sm text-orange-700 mt-1">
              {data.vehiculo?.patente ?? "Sin vehículo"} - {data.vehiculo?.tipo ?? "Sin tipo"}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
