"use client";

import {
  rutaDelDia,
  pedidosDelDia,
  getCantidadPedidos,
} from "@/lib/mocks/chofer";

export default function MiZonaPage() {
  const cantidadPedidos = getCantidadPedidos(pedidosDelDia);
  const fechaFormato = rutaDelDia.fecha.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          🗺️ Zona
        </h1>
        <p className="text-gray-600">Información de la zona asignada para hoy</p>
      </div>

      {/* Zona Principal Card */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-8 mb-6 border-l-4 border-purple-500">
        <div className="text-center">
          <p className="text-gray-600 text-sm font-medium mb-2">Zona Asignada</p>
          <h2 className="text-5xl font-bold text-purple-600 mb-2">
            {rutaDelDia.zona}
          </h2>
          <p className="text-gray-600">Zona para entrega hoy</p>
        </div>
      </div>

      {/* Información de la Ruta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {/* Pedidos en Zona */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📦</span>
            <h3 className="font-semibold text-gray-900">Pedidos</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{cantidadPedidos}</p>
          <p className="text-xs text-gray-600 mt-2">Pedidos en esta zona</p>
        </div>
      </div>

      {/* Estado de la Ruta */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Estado de la Ruta</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Estado</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="text-lg font-semibold text-green-600 capitalize">
                {rutaDelDia.estado}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Fecha</p>
            <p className="text-lg font-semibold">
              <span suppressHydrationWarning>{fechaFormato}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detalles de Localización */}
      <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📍</span> Detalles de Localización
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Zona ID</p>
            <p className="text-lg font-semibold text-gray-900">
              {rutaDelDia.idZona}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Ruta ID</p>
            <p className="text-lg font-semibold text-gray-900">
              {rutaDelDia.idRuta}
            </p>
          </div>
        </div>
      </div>

      {/* Mapa (Placeholder) */}
      <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center border border-gray-300 mb-6">
        <div className="text-center">
          <p className="text-2xl mb-2">🗺️</p>
          <p className="text-gray-600 font-medium">Mapa de la zona</p>
          <p className="text-xs text-gray-500 mt-1">
            Próxima actualización: integración con Google Maps
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <span className="font-semibold">💡 Consejo:</span> Verifica los
          horarios de tu ruta antes de comenzar las entregas. Asegúrate de tener
          suficientes bidones en el vehículo.
        </p>
      </div>

      {/* Nota de mock data */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">ℹ️ Nota:</span> Los datos mostrados
          son datos de ejemplo. Próximamente se mostrará un mapa interactivo.
        </p>
      </div>
    </div>
  );
}
