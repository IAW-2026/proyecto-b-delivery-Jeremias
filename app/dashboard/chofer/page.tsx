"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  rutaDelDia,
  vehiculoAsignado,
  pedidosDelDia,
  getTotalBidones,
  getCantidadPedidos,
} from "@/app/lib/mockData/choferData";

export default function ChoferDashboard() {
  const { user } = useUser();
  const totalBidones = getTotalBidones(pedidosDelDia);
  const cantidadPedidos = getCantidadPedidos(pedidosDelDia);
  
  const [fechaFormato, setFechaFormato] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  useEffect(() => {
    setFechaFormato(
      new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );

    setHoraInicio(
      rutaDelDia.horaInicio?.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );

    setHoraFin(
      rutaDelDia.horaFin?.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }) || ""
    );
  }, []);

  const userNombre = user ? `${user.firstName} ${user.lastName}`.trim() : "Usuario";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          Bienvenido, {userNombre}
        </h1>
        <p className="text-gray-600">
          Hoy es{" "}
          <span suppressHydrationWarning className="font-semibold">{fechaFormato || "cargando..."}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Pedidos Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pedidos</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {cantidadPedidos}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Para entregar hoy</p>
        </div>

        {/* Bidones Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Bidones</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {totalBidones}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Total a llevar</p>
        </div>

        {/* Zona Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Zona</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {rutaDelDia.zona}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Zona de entrega</p>
        </div>

        {/* Vehículo Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Vehículo</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {vehiculoAsignado.patente}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Vehículo asignado</p>
        </div>
      </div>

      {/* Horario de Ruta */}
      <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#00AEEF" }}>
          📅 Información de Hoy
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Hora Inicio</p>
            <p className="text-lg font-bold">{horaInicio || "cargando..."}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Hora Fin</p>
            <p className="text-lg font-bold">{horaFin || "cargando..."}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Estado</p>
            <p className="text-lg font-bold text-green-600 capitalize">
              {rutaDelDia.estado}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/chofer/mis-pedidos">
          <div className="bg-blue-50 hover:bg-blue-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-blue-500">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-semibold text-blue-900">Ver Mis Pedidos</h3>
            <p className="text-sm text-blue-700 mt-1">
              {cantidadPedidos} pedidos pendientes
            </p>
          </div>
        </Link>

        <Link href="/dashboard/chofer/mi-zona">
          <div className="bg-purple-50 hover:bg-purple-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-purple-500">
            <div className="text-3xl mb-3">🗺️</div>
            <h3 className="font-semibold text-purple-900">Mi Zona</h3>
            <p className="text-sm text-purple-700 mt-1">
              Información de la zona {rutaDelDia.zona}
            </p>
          </div>
        </Link>

        <Link href="/dashboard/chofer/mi-vehiculo">
          <div className="bg-orange-50 hover:bg-orange-100 rounded-lg p-6 cursor-pointer transition-colors border-l-4 border-orange-500">
            <div className="text-3xl mb-3">🚛</div>
            <h3 className="font-semibold text-orange-900">Mi Vehículo</h3>
            <p className="text-sm text-orange-700 mt-1">
              {vehiculoAsignado.patente} - {vehiculoAsignado.tipo}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
