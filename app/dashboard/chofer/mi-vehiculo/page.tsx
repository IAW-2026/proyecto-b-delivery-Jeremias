"use client";

import { useEffect, useState } from "react";

type ChoferStatusResponse = {
  vehiculo: {
    patente: string;
    tipo: string;
    capacidadBidones: number;
  } | null;
  totalBidones: number;
};

export default function MiVehiculoPage() {
  const [data, setData] = useState<ChoferStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const response = await fetch("/api/chofer/status", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as ChoferStatusResponse;
      if (!cancelled) setData(payload);
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const vehiculo = data?.vehiculo;
  const totalBidones = data?.totalBidones ?? 0;
  const bidonesDisponibles = vehiculo ? vehiculo.capacidadBidones - totalBidones : 0;
  const porcentajeUsado = vehiculo ? Math.round((totalBidones / vehiculo.capacidadBidones) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          <span aria-hidden="true">🚛</span> Vehículo
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
              {vehiculo?.patente ?? "Sin vehículo"}
            </h2>
          </div>
          <div className="text-7xl opacity-30" aria-hidden="true">🚛</div>
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Tipo de Vehículo */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Tipo</p>
          <p className="text-2xl font-bold text-gray-900">
            {vehiculo?.tipo ?? "Sin tipo"}
          </p>
          <p className="text-xs text-gray-600 mt-2">Clasificación del vehículo</p>
        </div>

        {/* Capacidad */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Capacidad</p>
          <p className="text-2xl font-bold text-blue-600">
            {vehiculo?.capacidadBidones ?? 0}
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
          <span aria-hidden="true">📊</span> Capacidad de Carga
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
              {vehiculo?.capacidadBidones ?? 0}
            </p>
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
    </div>
  );
}
