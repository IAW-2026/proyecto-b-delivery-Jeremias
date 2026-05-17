"use client";

import {
  vehiculoAsignado,
  pedidosDelDia,
  getTotalBidones,
  getBidonesDisponibles,
} from "@/app/lib/mockData/choferData";

export default function MiVehiculoPage() {
  const totalBidones = getTotalBidones(pedidosDelDia);
  const bidonesDisponibles = getBidonesDisponibles(
    pedidosDelDia,
    vehiculoAsignado.capacidadBidones
  );
  const porcentajeUsado = Math.round(
    (totalBidones / vehiculoAsignado.capacidadBidones) * 100
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          🚛 Mi Vehículo
        </h1>
        <p className="text-gray-600">Detalles del vehículo asignado</p>
      </div>

      {/* Vehículo Principal Card */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-8 mb-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium mb-2">
              Patente del Vehículo
            </p>
            <h2 className="text-5xl font-bold text-orange-600">
              {vehiculoAsignado.patente}
            </h2>
          </div>
          <div className="text-7xl opacity-30">🚛</div>
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Tipo de Vehículo */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Tipo</p>
          <p className="text-2xl font-bold text-gray-900">
            {vehiculoAsignado.tipo}
          </p>
          <p className="text-xs text-gray-600 mt-2">Clasificación del vehículo</p>
        </div>

        {/* Capacidad */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Capacidad</p>
          <p className="text-2xl font-bold text-blue-600">
            {vehiculoAsignado.capacidadBidones}
          </p>
          <p className="text-xs text-gray-600 mt-2">Bidones máximos</p>
        </div>

        {/* Disponibilidad */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">
            {bidonesDisponibles}
          </p>
          <p className="text-xs text-gray-600 mt-2">Espacios libres</p>
        </div>
      </div>

      {/* Capacidad de Carga */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          📊 Capacidad de Carga
        </h3>

        {/* Barra de Progreso */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <p className="text-sm text-gray-700">
              Bidones utilizados: <span className="font-semibold">{totalBidones}</span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{porcentajeUsado}%</span>
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                porcentajeUsado < 75
                  ? "bg-green-500"
                  : porcentajeUsado < 100
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${porcentajeUsado}%` }}
            />
          </div>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 mb-1">En Uso</p>
            <p className="text-xl font-bold text-orange-600">{totalBidones}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Disponibles</p>
            <p className="text-xl font-bold text-green-600">{bidonesDisponibles}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Capacidad</p>
            <p className="text-xl font-bold text-blue-600">
              {vehiculoAsignado.capacidadBidones}
            </p>
          </div>
        </div>
      </div>

      {/* Estado del Vehículo */}
      <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>✓</span> Estado del Vehículo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <p className="text-green-800 font-medium">Disponible</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <p className="text-green-800 font-medium">Mantenimiento al día</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <p className="text-green-800 font-medium">Combustible: Completo</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <p className="text-green-800 font-medium">Seguros vigentes</p>
          </div>
        </div>
      </div>

      {/* Avisos de Carga */}
      {porcentajeUsado >= 90 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">
            <span className="font-semibold">⚠️ Advertencia:</span> El vehículo
            está casi a capacidad máxima ({porcentajeUsado}%). Verifica que
            todos los bidones estén bien asegurados.
          </p>
        </div>
      ) : porcentajeUsado >= 75 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">⚡ Información:</span> El vehículo
            está al {porcentajeUsado}% de capacidad. Considera revisar la carga.
          </p>
        </div>
      ) : null}

      {/* Información de Mantenimiento */}
      <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔧</span> Información de Mantenimiento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Último mantenimiento</p>
            <p className="font-semibold">15 de Mayo, 2026</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Próximo mantenimiento</p>
            <p className="font-semibold">01 de Junio, 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
