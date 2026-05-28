"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "asignado" | "en_camino" | "entregado" | "cancelado" | "revision";
};

type Props = {
  pedidos: Pedido[];
  totalFiltered: number;
  totalBidones: number;
  searchQuery: string;
  statusFilter: "todos" | Pedido["estado"];
  page: number;
  totalPages: number;
};

function buildQueryHref(nextValues: { query?: string; status?: "todos" | Pedido["estado"]; page?: number }, currentQuery: string, currentStatus: Props["statusFilter"], currentPage: number) {
  const params = new URLSearchParams();
  const query = nextValues.query ?? currentQuery;
  const status = nextValues.status ?? currentStatus;
  const page = nextValues.page ?? currentPage;

  if (query) params.set("query", query);
  if (status !== "todos") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/dashboard/chofer/mis-pedidos?${queryString}` : "/dashboard/chofer/mis-pedidos";
}

export default function MisPedidosUI({ pedidos, totalFiltered, totalBidones, searchQuery, statusFilter, page, totalPages }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleCambiarEstado(idPedido: number, nuevoEstado: Pedido["estado"]) {
    setError(null);
    setPendingId(idPedido);

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

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: "#00AEEF" }}>
          📦 Mis pedidos
        </h1>
        <p className="text-gray-600">Pedidos listos para entregar</p>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pendientes</p>
            <p className="mt-1 text-3xl font-semibold text-blue-600">{totalFiltered}</p>
            <p className="mt-1 text-sm text-slate-500">Pedidos que todavía requieren entrega</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bidones pendientes</p>
            <p className="mt-1 text-3xl font-semibold text-green-600">{totalBidones}</p>
            <p className="mt-1 text-sm text-slate-500">Total de bidones por entregar</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form action="/dashboard/chofer/mis-pedidos" method="get" className="w-full">
            <input type="hidden" name="page" value="1" />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <label className="sr-only" htmlFor="mis-pedidos-search">
              Buscar pedidos
            </label>
            <div className="flex gap-2">
              <input
                id="mis-pedidos-search"
                name="query"
                defaultValue={searchQuery}
                placeholder="Buscar por cliente o dirección"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Buscar
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["todos", "Todos"],
            ["ready", "Listo"],
            ["asignado", "Asignados"],
            ["en_camino", "En camino"],
            ["entregado", "Entregados"],
            ["revision", "Revisión"],
            ["cancelado", "Cancelados"],
          ] as const).map(([value, label]) => (
            <Link
              key={value}
              href={buildQueryHref({ status: value, page: 1 }, searchQuery, statusFilter, page)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {pedidos.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Dirección</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Teléfono</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Zona</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Bidones</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido, idx) => (
                <tr key={pedido.idPedido} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{(page - 1) * 8 + idx + 1}</td>
                  <td className="px-4 py-4 text-gray-900">{pedido.cliente}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{pedido.direccion}</td>
                  <td className="px-4 py-4 text-gray-600">
                    <a href={`tel:${pedido.telefono}`} className="text-blue-600 hover:underline">
                      {pedido.telefono}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700">{pedido.zona}</td>
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
                        : pedido.estado === "cancelado"
                        ? "Cancelado"
                        : pedido.estado}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {pedido.estado === "ready" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "en_camino")}
                        disabled={pendingId === pedido.idPedido}
                        className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                      >
                        🚚 En Camino
                      </button>
                    )}
                    {pedido.estado === "asignado" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "en_camino")}
                        disabled={pendingId === pedido.idPedido}
                        className="rounded-lg bg-yellow-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-60"
                      >
                        🚚 Empezar
                      </button>
                    )}
                    {pedido.estado === "en_camino" && (
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(pedido.idPedido, "entregado")}
                          disabled={pendingId === pedido.idPedido}
                          className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                        >
                          ✓ Entregar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(pedido.idPedido, "revision")}
                          disabled={pendingId === pedido.idPedido}
                          className="rounded-lg bg-slate-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                        >
                          ⚠ Revisión
                        </button>
                      </div>
                    )}
                    {pedido.estado === "revision" && (
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(pedido.idPedido, "ready")}
                        disabled={pendingId === pedido.idPedido}
                        className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                      >
                        ↺ Volver a Listo
                      </button>
                    )}
                    {pedido.estado === "entregado" && <span className="font-medium text-green-600">✓ Entregado</span>}
                    {pedido.estado === "cancelado" && <span className="font-medium text-red-600">Cancelado</span>}
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

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Link
            href={buildQueryHref({ page: Math.max(1, page - 1) }, searchQuery, statusFilter, page)}
            aria-disabled={page <= 1}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              page <= 1 ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildQueryHref({ page: Math.min(totalPages, page + 1) }, searchQuery, statusFilter, page)}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              page >= totalPages ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}
