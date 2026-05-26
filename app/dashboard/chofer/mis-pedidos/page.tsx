"use client";

import { useState } from "react";
import {
  pedidosDelDia,
  getTotalBidones,
} from "@/lib/mocks/chofer";
import { Pedido } from "@/lib/mocks/chofer";

export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosDelDia);
  const [filtro, setFiltro] = useState<"todos" | "ready" | "en_camino" | "entregado">(
    "todos"
  );

  const pedidosFiltrados =
    filtro === "todos"
      ? pedidos
      : pedidos.filter((p) => p.estado === filtro);

  const totalBidones = getTotalBidones(pedidosFiltrados);

  const handleCambiarEstado = (idPedido: number, nuevoEstado: "ready" | "en_camino" | "entregado" | "cancelado") => {
    setPedidos(
      pedidos.map((p) =>
        p.idPedido === idPedido ? { ...p, estado: nuevoEstado } : p
      )
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#00AEEF" }}>
          📦 Pedidos
        </h1>
        <p className="text-gray-600">
          Pedidos listos para entregar en la zona Palihue
        </p>
      </div>

      {/* Filtros y Resumen */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-gray-600 text-sm font-medium">Resumen del día</p>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {pedidosFiltrados.length}
                </p>
                <p className="text-xs text-gray-600">Pedidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {totalBidones}
                </p>
                <p className="text-xs text-gray-600">Bidones</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            {(["todos", "ready", "en_camino", "entregado"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtro === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {f === "todos"
                  ? "Todos"
                  : f === "ready"
                  ? "Ready"
                  : f === "en_camino"
                  ? "En Camino"
                  : "Entregados"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Pedidos */}
      {pedidosFiltrados.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  #
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Cliente
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Dirección
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Teléfono
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Bidones
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Estado
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido, idx) => (
                <tr
                  key={pedido.idPedido}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4 text-gray-900 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-4 px-4 text-gray-900">{pedido.cliente}</td>
                  <td className="py-4 px-4 text-gray-600 text-sm">
                    {pedido.direccion}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    <a
                      href={`tel:${pedido.telefono}`}
                      className="text-blue-600 hover:underline"
                    >
                      {pedido.telefono}
                    </a>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block bg-orange-100 text-orange-800 rounded-full px-3 py-1 text-sm font-medium">
                      {pedido.cantBidones}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                        pedido.estado === "ready"
                          ? "bg-blue-100 text-blue-800"
                          : pedido.estado === "en_camino"
                          ? "bg-yellow-100 text-yellow-800"
                          : pedido.estado === "entregado"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {pedido.estado === "en_camino" ? "En Camino" : pedido.estado}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {pedido.estado === "ready" && (
                      <button
                        onClick={() => handleCambiarEstado(pedido.idPedido, "en_camino")}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        🚚 En Camino
                      </button>
                    )}
                    {pedido.estado === "en_camino" && (
                      <button
                        onClick={() => handleCambiarEstado(pedido.idPedido, "entregado")}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✓ Entregar
                      </button>
                    )}
                    {pedido.estado === "entregado" && (
                      <span className="text-green-600 font-medium">✓ Entregado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No hay pedidos para mostrar</p>
        </div>
      )}

      {/* Nota importante */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">ℹ️ Nota:</span> Los datos mostrados
          son datos de ejemplo (mock data). En producción, estos datos vendrán
          de la API.
        </p>
      </div>
    </div>
  );
}
