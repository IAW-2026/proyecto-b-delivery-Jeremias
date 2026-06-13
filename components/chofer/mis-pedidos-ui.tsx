"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { pageSize } from "@/lib/shared/utils";
import { buildQueryHref, type PedidoStatus } from "@/lib/chofer/mis-pedidos-utils";
import * as actions from "@/lib/actions/chofer";

type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: PedidoStatus;
  motivoRevision?: string | null;
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

export default function MisPedidosUI({ pedidos, totalFiltered, totalBidones, searchQuery, statusFilter, page, totalPages }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [motivoPedidoId, setMotivoPedidoId] = useState<number | null>(null);
  const [revisionPendingId, setRevisionPendingId] = useState<number | null>(null);
  const [revisionReasons, setRevisionReasons] = useState<Record<number, string>>({});
  const [detailsPedidoId, setDetailsPedidoId] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const pageStart = pedidos.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFiltered, page * pageSize);

  useEffect(() => {
    if (motivoPedidoId !== null) {
      dialogRef.current?.focus();
    }
  }, [motivoPedidoId]);

  useEffect(() => {
    if (detailsPedidoId !== null) {
      detailsDialogRef.current?.focus();
    }
  }, [detailsPedidoId]);

  async function handleCambiarEstado(idPedido: number, nuevoEstado: Pedido["estado"], motivoRevision?: string) {
    setError(null);
    setPendingId(idPedido);

    try {
      await actions.updatePedidoStatus(idPedido, nuevoEstado, motivoRevision);
      setRevisionPendingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setPendingId(null);
    }
  }

  function handleOpenRevision(pedido: Pedido) {
    setError(null);
    setRevisionPendingId(pedido.idPedido);
    setRevisionReasons((current) => ({
      ...current,
      [pedido.idPedido]: pedido.motivoRevision ?? current[pedido.idPedido] ?? "",
    }));
  }

  function handleCancelRevision(idPedido: number) {
    setRevisionPendingId(null);
    setRevisionReasons((current) => ({
      ...current,
      [idPedido]: "",
    }));
    setError(null);
  }

  function openMotivo(pedidoId: number) {
    setMotivoPedidoId(pedidoId);
  }

  function closeMotivo() {
    setMotivoPedidoId(null);
  }

  function openDetails(pedidoId: number) {
    setDetailsPedidoId(pedidoId);
  }

  function closeDetails() {
    setDetailsPedidoId(null);
  }

  async function saveMotivoRevision() {
    if (motivoPedidoId === null) return;

    const motivo = revisionReasons[motivoPedidoId] ?? "";
    await handleCambiarEstado(motivoPedidoId, "revision", motivo);
    closeMotivo();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: "#00AEEF" }}>
          <span aria-hidden="true">📦</span> Mis pedidos
        </h1>
        <p className="text-gray-600">Pedidos listos para entregar</p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Buscar pedidos</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Buscá por cliente, dirección o zona. Después aplicá un filtro rápido si hace falta.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Filtros rápidos</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
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

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
          <form
            action="/dashboard/chofer/mis-pedidos"
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const queryValue = String(formData.get("query") ?? "");
              router.push(buildQueryHref("/dashboard/chofer/mis-pedidos", { q: queryValue, page: "1", ...(statusFilter !== "todos" ? { status: statusFilter } : {}) }));
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="page" value="1" />
            {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <label className="sr-only" htmlFor="mis-pedidos-search">
              Buscar pedidos
            </label>

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                id="mis-pedidos-search"
                name="query"
                defaultValue={searchQuery}
                placeholder="Buscar pedidos (cliente, dirección, zona)"
                className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Buscar
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form action="/dashboard/chofer/mis-pedidos" method="get" className="space-y-3">
              <input type="hidden" name="query" value={searchQuery} />
              <input type="hidden" name="page" value="1" />
              {statusFilter !== "todos" ? <input type="hidden" name="status" value={statusFilter} /> : null}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtrar por</span>
                <select
                  name="quickFilter"
                  value={statusFilter}
                  onChange={(event) => {
                    const nextStatus = event.currentTarget.value as Props["statusFilter"];
                    router.push(buildQueryHref("/dashboard/chofer/mis-pedidos", { status: nextStatus, page: "1", ...(searchQuery ? { q: searchQuery } : {}) }));
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="todos">Sin filtros</option>
                  <option value="ready">Listo</option>
                  <option value="en_camino">En camino</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="revision">Revisión</option>
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Incluye estados del pedido y accesos rápidos al estado actual de la entrega.</p>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {searchQuery ? (
            <Link
              href={buildQueryHref("/dashboard/chofer/mis-pedidos", { q: "", page: "1", ...(statusFilter !== "todos" ? { status: statusFilter } : {}) })}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpiar búsqueda
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {pedidos.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Mostrando {pageStart}-{pageEnd} de {totalFiltered} pedidos</p>
            <p>Página {page} de {totalPages}</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Cliente / Dirección</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Zona</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Bidones</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Estado</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Detalles</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido, idx) => (
                <Fragment key={pedido.idPedido}>
                  <tr className="border-t border-slate-100 text-sm text-slate-700 hover:bg-slate-50/50">
                  <td className="px-3 py-3.5">
                    <p className="font-medium text-gray-900">{pedido.cliente}</p>
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{pedido.direccion}</p>
                  </td>
                  <td className="px-3 py-3.5 text-center text-sm text-gray-700 whitespace-nowrap">{pedido.zona}</td>
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                      {pedido.cantBidones}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                        pedido.estado === "ready"
                          ? "bg-blue-100 text-blue-800"
                          : pedido.estado === "en_camino"
                          ? "bg-yellow-100 text-yellow-800"
                          : pedido.estado === "entregado"
                          ? "bg-green-100 text-green-800"
                          : pedido.estado === "revision"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {pedido.estado === "revision" && (
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                      )}
                      {pedido.estado === "ready"
                        ? "Listo"
                        : pedido.estado === "en_camino"
                        ? "En camino"
                        : pedido.estado === "revision"
                        ? "Revisión"
                        : pedido.estado === "cancelado"
                        ? "Cancelado"
                        : pedido.estado}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openDetails(pedido.idPedido)}
                      className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      title="Ver detalles"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 text-center align-middle whitespace-nowrap">
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
                          onClick={() => handleOpenRevision(pedido)}
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
                {revisionPendingId === pedido.idPedido ? (
                  <tr className="border-t border-slate-100 bg-violet-50/40">
                    <td colSpan={6} className="px-3 py-3.5">
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                        <label className="space-y-2">
                                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                            Motivo de revisión
                          </span>
                          <textarea
                            value={revisionReasons[pedido.idPedido] ?? ""}
                            onChange={(event) =>
                              setRevisionReasons((current) => ({
                                ...current,
                                [pedido.idPedido]: event.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Ejemplo: bidones dañados, faltante en la entrega, dirección incorrecta..."
                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            disabled={pendingId === pedido.idPedido}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleCambiarEstado(pedido.idPedido, "revision", revisionReasons[pedido.idPedido] ?? "")}
                            disabled={pendingId === pedido.idPedido}
                            className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
                          >
                            Guardar revisión
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelRevision(pedido.idPedido)}
                            disabled={pendingId === pedido.idPedido}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFiltered}</p>
            <div className="flex items-center gap-2">
              <Link href={buildQueryHref("/dashboard/chofer/mis-pedidos", { page: String(Math.max(1, page - 1)), ...(searchQuery ? { q: searchQuery } : {}), ...(statusFilter !== "todos" ? { status: statusFilter } : {}) })} aria-disabled={page <= 1} className={`${page <= 1 ? "pointer-events-none opacity-60" : ""} rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50`}>
                Anterior
              </Link>
              <Link href={buildQueryHref("/dashboard/chofer/mis-pedidos", { page: String(Math.min(totalPages, page + 1)), ...(searchQuery ? { q: searchQuery } : {}), ...(statusFilter !== "todos" ? { status: statusFilter } : {}) })} aria-disabled={page >= totalPages} className={`${page >= totalPages ? "pointer-events-none opacity-60" : ""} rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50`}>
                Siguiente
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          <p className="text-center">Todavía no tenés pedidos para mostrar</p>
        </div>
      )}

      {motivoPedidoId !== null ? (
        (() => {
          const pedido = pedidos.find((item) => item.idPedido === motivoPedidoId);
          if (!pedido) return null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={closeMotivo}>
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`motivo-pedido-${pedido.idPedido}`}
                tabIndex={-1}
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`motivo-pedido-${pedido.idPedido}`} className="text-xl font-semibold text-slate-900">
                      Motivo de revisión
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pedido #{pedido.idPedido} · {pedido.cliente}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                  <label className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                      Motivo de revisión
                    </span>
                    <textarea
                      value={revisionReasons[pedido.idPedido] ?? pedido.motivoRevision ?? ""}
                      onChange={(event) =>
                        setRevisionReasons((current) => ({
                          ...current,
                          [pedido.idPedido]: event.target.value,
                        }))
                      }
                      rows={5}
                      className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                      disabled={pendingId === pedido.idPedido}
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={saveMotivoRevision}
                      disabled={pendingId === pedido.idPedido}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                    >
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={closeMotivo}
                      disabled={pendingId === pedido.idPedido}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-60"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : null}

      {detailsPedidoId !== null ? (
        (() => {
          const pedido = pedidos.find((item) => item.idPedido === detailsPedidoId);
          if (!pedido) return null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={closeDetails}>
              <div ref={detailsDialogRef} role="dialog" aria-modal="true" aria-labelledby={`detalles-pedido-${pedido.idPedido}`} tabIndex={-1} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`detalles-pedido-${pedido.idPedido}`} className="text-xl font-semibold text-slate-900">
                      Detalles del pedido #{pedido.idPedido}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {pedido.cliente}
                    </p>
                  </div>
                  <button type="button" onClick={closeDetails} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200">
                    Cerrar
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
                    <span className="font-medium text-slate-500">Dirección</span>
                    <span className="text-slate-900">{pedido.direccion}</span>

                    <span className="font-medium text-slate-500">Teléfono</span>
                    <span className="text-slate-900">
                      {pedido.telefono}
                    </span>

                    <span className="font-medium text-slate-500">Zona</span>
                    <span className="text-slate-900">{pedido.zona}</span>

                    <span className="font-medium text-slate-500">Bidones</span>
                    <span className="text-slate-900">{pedido.cantBidones}</span>

                    <span className="font-medium text-slate-500">Estado</span>
                    <span className="text-slate-900 capitalize">{pedido.estado === "ready" ? "Listo" : pedido.estado === "en_camino" ? "En camino" : pedido.estado === "revision" ? "Revisión" : pedido.estado === "cancelado" ? "Cancelado" : pedido.estado}</span>

                    {pedido.estado === "revision" && pedido.motivoRevision ? (
                      <>
                        <span className="font-medium text-slate-500">Motivo revisión</span>
                        <span className="rounded-lg bg-violet-50 p-2 text-sm text-violet-900">
                          {pedido.motivoRevision}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : null}

    </div>
  );
}
