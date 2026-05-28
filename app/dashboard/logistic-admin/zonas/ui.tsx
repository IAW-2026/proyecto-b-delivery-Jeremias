"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "../styles";

type Zona = {
  idZona: number;
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
  rutasAsignadas: number;
};

type ZonaFueraCatalogo = {
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
};

type Props = {
  zonas: Zona[];
  zonasFueraCatalogo: ZonaFueraCatalogo[];
};

type FormState = {
  nombre: string;
};

const emptyForm: FormState = {
  nombre: "",
};

function statCardClass(kind: "blue" | "emerald" | "amber" | "slate") {
  switch (kind) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function ZonasManager({ zonas, zonasFueraCatalogo }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZonaId, setEditingZonaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const zonasConPedidos = zonas.filter((zona) => zona.pedidosTotales > 0).length;
    const totalPedidos = zonas.reduce((accumulator, zona) => accumulator + zona.pedidosTotales, 0);
    const totalRutas = zonas.reduce((accumulator, zona) => accumulator + zona.rutasAsignadas, 0);

    return {
      totalPedidos,
      totalRutas,
      zonasConPedidos,
      zonasSinPedidos: zonas.length - zonasConPedidos,
    };
  }, [zonas]);

  async function runAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/logistic-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "No se pudo completar la operación");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nombre = form.nombre.trim();
    if (!nombre) {
      setError("Escribí el nombre del barrio.");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({ action: "create_zone", nombre });

      setForm(emptyForm);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(zona: Zona) {
    setEditingZonaId(zona.idZona);
    setEditForm({ nombre: zona.zona });
    setError(null);
  }

  function cancelEdit() {
    setEditingZonaId(null);
    setEditForm(emptyForm);
    setError(null);
  }

  async function handleUpdateZone(idZona: number) {
    setError(null);

    const nombre = editForm.nombre.trim();
    if (!nombre) {
      setError("Escribí el nombre del barrio.");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({ action: "update_zone", idZona, nombre });

      cancelEdit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(zona: Zona) {
    if (zona.rutasAsignadas > 0) {
      setError("No se puede eliminar una zona con rutas asociadas. Primero reasigná o limpiá esas rutas.");
      return;
    }

    const ok = window.confirm(`¿Eliminar la zona ${zona.zona}?`);
    if (!ok) return;

    setIsSaving(true);
    setError(null);
    try {
      await runAction({ action: "delete_zone", idZona: zona.idZona });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={adminPageShell}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Zonas
        </h1>
        <p className="text-sm text-slate-600">
          Alta, edición y eliminación de barrios de Bahía Blanca para ordenar cobertura y asignaciones.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className={`${adminStatCardClass} ${statCardClass("blue")}`}>
          <p className="text-sm opacity-80">Barrios registrados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{zonas.length}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("emerald")}`}>
          <p className="text-sm opacity-80">Con pedidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.zonasConPedidos}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("amber")}`}>
          <p className="text-sm opacity-80">Sin pedidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.zonasSinPedidos}</p>
        </div>
        <div className={`${adminStatCardClass} ${statCardClass("slate")}`}>
          <p className="text-sm opacity-80">Pedidos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalPedidos}</p>
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className={adminButtonClass("edit")}
            >
              Agregar
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {zonas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          Todavía no hay barrios cargados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[200px] px-4 py-3">Barrio</th>
                <th className="w-[120px] px-4 py-3">Pedidos</th>
                <th className="w-[150px] px-4 py-3">Bidones solicitados</th>
                <th className="w-[150px] px-4 py-3">Choferes asignados</th>
                <th className="w-[240px] px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((zona) => (
                <Fragment key={zona.idZona}>
                  <tr className="border-t border-slate-100 text-sm text-slate-700 align-top">
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{zona.pedidosTotales}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{zona.bidonesTotales}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{zona.pedidosAsignados}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                        {editingZonaId === zona.idZona ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleUpdateZone(zona.idZona)}
                              disabled={isSaving}
                              className={adminButtonClass("save", "sm")}
                            >
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
                              onClick={() => handleDelete(zona)}
                              disabled={isSaving || zona.rutasAsignadas > 0}
                              className={adminButtonClass("danger", "sm")}
                              title={zona.rutasAsignadas > 0 ? "No se puede borrar porque tiene rutas asociadas" : "Eliminar zona"}
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
                      <td colSpan={5} className="px-4 py-4">
                        <p className="text-xs text-slate-500">Renombrá el barrio y guardá los cambios desde la misma fila.</p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {zonasFueraCatalogo.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">Zonas detectadas en pedidos que no están en el catálogo</h2>
          <p className="mt-1 text-sm text-amber-800">
            Estas aparecen en pedidos, pero todavía no fueron cargadas como barrios editables.
          </p>
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