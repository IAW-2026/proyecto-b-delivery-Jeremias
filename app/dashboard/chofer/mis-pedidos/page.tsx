"use client";

import { useEffect, useState } from "react";

type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "asignado" | "en_camino" | "entregado" | "cancelado" | "revision";
};

export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Pedido["estado"]>("todos");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const response = await fetch("/api/chofer/status", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { pedidos?: Pedido[] };
        if (!cancelled) {
          setPedidos(data.pedidos ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const pedidosFiltrados = filtro === "todos" ? pedidos : pedidos.filter((pedido) => pedido.estado === filtro);
  const totalBidones = pedidosFiltrados.reduce((sum, pedido) => sum + pedido.cantBidones, 0);

  async function handleCambiarEstado(idPedido: number, nuevoEstado: Pedido["estado"]) {
    setError(null);

    try {
      const response = await fetch("/api/chofer/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPedido, estado: nuevoEstado }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo actualizar el estado");
      }

      const data = (await response.json()) as { pedido?: Pedido };
      if (data.pedido) {
        setPedidos((current) =>
          current.map((pedido) => (pedido.idPedido === idPedido ? { ...pedido, estado: data.pedido!.estado } : pedido))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: "#00AEEF" }}>
          📦 Pedidos
        </h1>
        <p className="text-gray-600">Pedidos listos para entregar en la zona Palihue</p>
      </div>

      <div className="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Resumen del día</p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">{pedidosFiltrados.length}</p>
                <p className="text-xs text-gray-600">Pedidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{totalBidones}</p>
                <p className="text-xs text-gray-600">Bidones</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["todos", "ready", "en_camino", "entregado", "revision"] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filtro === valor ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {valor === "todos"
                  ? "Todos"
                  : valor === "ready"
                  ? "Listo"
                  : valor === "en_camino"
                  ? "En camino"
                  : valor === "entregado"
                  ? "Entregados"
                  : valor === "revision"
                  ? "Revisión"
                  : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg bg-gray-50 py-12 text-center">
          <p className="text-lg text-gray-600">Cargando tus pedidos...</p>
        </div>
      ) : pedidosFiltrados.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Dirección</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Teléfono</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Bidones</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido, idx) => (
                <tr key={pedido.idPedido} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-4 text-gray-900">{pedido.cliente}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{pedido.direccion}</td>
                  <td className="px-4 py-4 text-gray-600">
                    <a href={`tel:${pedido.telefono}`} className="text-blue-600 hover:underline">
                      {pedido.telefono}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                      {pedido.cantBidones}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                        pedido.estado === "ready"
                          ? "bg-blue-100 text-blue-800"
                          : pedido.estado === "asignado"
                          ? "bg-violet-100 text-violet-800"
                          : pedido.estado === "en_camino"
                          ? "bg-yellow-100 text-yellow-800"
                          : pedido.estado === "entregado"
                          ? "bg-green-100 text-green-800"
                          : pedido.estado === "revision"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {pedido.estado === "ready"
                        ? "Listo"
                        : pedido.estado === "asignado"
                        ? "Listo para salir"
                        : pedido.estado === "en_camino"
                        ? "En camino"
                        : pedido.estado === "revision"
                        ? "Revisión"
                        : pedido.estado}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {pedido.estado === "ready" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "en_camino")}
                        disabled={loading}
                        className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-violet-700"
                      >
                        🚚 En Camino
                      </button>
                    )}
                    {pedido.estado === "asignado" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "en_camino")}
                        disabled={loading}
                        className="rounded-lg bg-yellow-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-yellow-700"
                      >
                        🚚 Empezar
                      </button>
                    )}
                    {pedido.estado === "en_camino" && (
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(pedido.idPedido, "entregado")}
                          disabled={loading}
                          className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700"
                        >
                          ✓ Entregar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(pedido.idPedido, "revision")}
                          disabled={loading}
                          className="rounded-lg bg-slate-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                        >
                          ⚠ Revisión
                        </button>
                      </div>
                    )}
                    {pedido.estado === "revision" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "ready")}
                        disabled={loading}
                        className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-violet-700"
                      >
                        ↺ Volver a Listo
                      </button>
                    )}
                    {pedido.estado === "entregado" && <span className="font-medium text-green-600">✓ Entregado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 py-12 text-center">
          <p className="text-lg text-gray-600">Todavía no tenés pedidos para mostrar</p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">ℹ️ Nota:</span> Tus cambios se guardan en la app y se actualizan al instante.
        </p>
      </div>
    </div>
  );
}
