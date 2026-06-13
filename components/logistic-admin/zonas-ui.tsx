"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "@/lib/logistic-admin/styles";
import { buildZonasQueryHref, statCardClass, type Zona, type ZonaFueraCatalogo } from "@/lib/logistic-admin/zonas-utils";
import { useZonasController } from "@/lib/logistic-admin/zonas-controller";

type Props = {
  zonas: Zona[];
  zonasFueraCatalogo: ZonaFueraCatalogo[];
  searchQuery: string;
  page: number;
  totalPages: number;
  totalFilteredZonas: number;
  totalZonas: number;
  zonasConPedidos: number;
  zonasSinPedidos: number;
  totalPedidos: number;
  vendorNames?: Record<number, string>;
  vendorOptions?: Record<number, string>;
  basePath?: string;
};

export default function ZonasManager({
  zonas,
  zonasFueraCatalogo,
  searchQuery,
  page,
  totalPages,
  totalFilteredZonas,
  totalZonas,
  zonasConPedidos,
  zonasSinPedidos,
  totalPedidos,
  vendorNames,
  basePath = "/dashboard/logistic-admin",
  vendorOptions,
}: Props) {
  const controller = useZonasController({
    zonas,
    searchParams: { query: searchQuery, page: String(page) },
    page,
    totalFilteredZonas,
    basePath,
    vendorOptions,
  });

  const { vendorOptions: hasVendorOptions, selectedVendorId, setSelectedVendorId, filterState, form, setForm, editForm, setEditForm, isSaving, editingZonaId, error, pageStart, pageEnd, showEmpresasForZone, setShowEmpresasForZone, handlers } = controller;
  const { handleSubmit, startEdit, cancelEdit, handleUpdateZone, handleDelete, handleDisassociateVendor, submitSearch } = handlers;

  const empresasDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showEmpresasForZone) {
      empresasDialogRef.current?.focus();
    }
  }, [showEmpresasForZone]);

  return (
    <div className={adminPageShell}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Zonas
        </h1>
        <p className="text-sm text-slate-600">Alta, edición y eliminación de barrios de Bahía Blanca para ordenar cobertura y asignaciones.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className={`${adminStatCardClass} ${statCardClass("blue")}`}>
          <p className="text-sm opacity-80">Barrios registrados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalZonas}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("emerald")}`}>
          <p className="text-sm opacity-80">Con pedidos actualmente</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{zonasConPedidos}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("amber")}`}>
          <p className="text-sm opacity-80">Sin pedidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{zonasSinPedidos}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("slate")}`}>
          <p className="text-sm opacity-80">Pedidos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalPedidos}</p>
        </div>
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5`}>
        <h2 className="text-lg font-semibold text-slate-900">Agregar barrio</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={form.nombre}
            onChange={(event) => setForm({ nombre: event.target.value })}
            placeholder="Ej: Palihue"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:max-w-md"
            disabled={isSaving}
          />
          {vendorOptions ? (
            <select
              value={selectedVendorId}
              onChange={(event) => setSelectedVendorId(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isSaving}
            >
              {Object.entries(vendorOptions).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className={adminButtonClass("edit")}>
              Agregar
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className={`${adminCardClass} bg-slate-50 p-5 shadow-sm`}>
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Buscar barrios</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Usá un solo campo para encontrar barrios y seguir trabajando desde la misma tarjeta.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Búsqueda rápida</p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            action={`${basePath}/zonas`}
            method="get"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              submitSearch(String(formData.get("query") ?? ""));
            }}
            className="space-y-3"
          >
            <input type="hidden" name="page" value="1" />
            <label className="sr-only" htmlFor="zonas-search">
              Buscar barrios
            </label>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                id="zonas-search"
                name="query"
                defaultValue={searchQuery}
                placeholder="Buscar por barrio"
                className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button type="submit" className={adminButtonClass("edit", "sm")}>
                Buscar
              </button>
            </div>

            {searchQuery ? (
              <Link
                href={buildZonasQueryHref({ query: "", page: 1 }, filterState, `${basePath}/zonas`)}
                className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Limpiar búsqueda
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      {zonas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          {searchQuery ? `No hay resultados para "${searchQuery}".` : "Todavía no hay barrios cargados."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {pageStart}-{pageEnd} de {totalFilteredZonas} barrios
            </p>
            <p>
              Página {page} de {totalPages}
            </p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Barrio</th>
                {vendorNames ? <th className="px-3 py-3">Empresa</th> : null}
                <th className="px-3 py-3 text-center whitespace-nowrap">Pedidos</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Bidones</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Choferes</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((zona) => (
                <Fragment key={zona.idZona}>
                    <tr className="border-t border-slate-100 align-top text-sm text-slate-700">
                      <td className="px-3 py-3.5">
                        {editingZonaId === zona.idZona ? (
                        <input
                          value={editForm.nombre}
                          onChange={(event) => setEditForm({ nombre: event.target.value })}
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          disabled={isSaving}
                        />
                      ) : (
                        <div>
                          <p className="font-medium text-slate-900">{zona.zona}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ID {zona.idZona}</p>
                        </div>
                      )}
                    </td>
                    {vendorNames ? (
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => setShowEmpresasForZone(zona)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver empresas ({zona.empresas?.length ?? 0})
                        </button>
                      </td>
                    ) : null}
                    <td className="px-3 py-3.5 text-center">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{zona.pedidosTotales}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{zona.bidonesTotales}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{zona.choferesAsignados}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                        {editingZonaId === zona.idZona ? (
                          <>
                            <button type="button" onClick={() => void handleUpdateZone(zona.idZona)} disabled={isSaving} className={adminButtonClass("save", "sm")}>
                              {isSaving ? "Guardando..." : "Guardar"}
                            </button>
                            <button type="button" onClick={cancelEdit} disabled={isSaving} className={adminButtonClass("cancel", "sm")}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(zona)} disabled={isSaving} className={adminButtonClass("edit", "sm")}>
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(zona)}
                              disabled={isSaving}
                              className={adminButtonClass("danger", "sm")}
                              title="Eliminar zona"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingZonaId === zona.idZona ? (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={vendorNames ? 6 : 5} className="px-3 py-3.5">
                        <p className="text-xs text-slate-500">Renombrá el barrio y guardá los cambios desde la misma fila.</p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Resultados filtrados: {totalFilteredZonas}</p>
            <div className="flex items-center gap-2">
              <Link
                href={buildZonasQueryHref({ page: Math.max(1, page - 1) }, filterState, `${basePath}/zonas`)}
                aria-disabled={page <= 1}
                className={`${adminButtonClass("cancel", "sm")} ${page <= 1 ? "pointer-events-none opacity-60" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={buildZonasQueryHref({ page: Math.min(totalPages, page + 1) }, filterState, `${basePath}/zonas`)}
                aria-disabled={page >= totalPages}
                className={`${adminButtonClass("cancel", "sm")} ${page >= totalPages ? "pointer-events-none opacity-60" : ""}`}
              >
                Siguiente
              </Link>
            </div>
          </div>
        </div>
      )}

      {showEmpresasForZone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6" onClick={() => setShowEmpresasForZone(null)}>
          <div
            ref={empresasDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="empresas-dialog-title"
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="empresas-dialog-title" className="text-xl font-semibold text-slate-900">
                  Empresas vinculadas
                </h2>
                <p className="mt-1 text-sm text-slate-500">&quot;{showEmpresasForZone.zona}&quot;</p>
              </div>
              <button type="button" onClick={() => setShowEmpresasForZone(null)} className={adminButtonClass("cancel", "sm")}>
                Cerrar
              </button>
            </div>

            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 space-y-2">
              {showEmpresasForZone.empresas && showEmpresasForZone.empresas.length > 0 ? (
                showEmpresasForZone.empresas.map((e) => {
                  const vid = Number(e);
                  const nombre = vendorNames?.[vid] ?? `Empresa #${vid}`;
                  return (
                    <div key={vid} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{nombre}</p>
                      <button
                        type="button"
                        onClick={() => void handleDisassociateVendor(vid)}
                        disabled={isSaving}
                        className={adminButtonClass("danger", "sm")}
                      >
                        {isSaving ? "Desvinculando..." : "Desvincular"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Sin empresas vinculadas.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {zonasFueraCatalogo.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">Zonas detectadas en pedidos que no están en el catálogo</h2>
          <p className="mt-1 text-sm text-amber-800">Estas aparecen en pedidos, pero todavía no fueron cargadas como barrios editables.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {zonasFueraCatalogo.map((zona) => (
              <article key={zona.zona} className="rounded-xl border border-amber-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{zona.zona}</h3>
                <p className="mt-1 text-sm text-slate-600">Pedidos: {zona.pedidosTotales}</p>
                <p className="text-sm text-slate-600">Bidones: {zona.bidonesTotales}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
