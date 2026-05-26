"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
      if (editingId === null) {
        await runAction({ action: "create_zone", nombre });
      } else {
        await runAction({ action: "update_zone", idZona: editingId, nombre });
      }

      setForm(emptyForm);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(zona: Zona) {
    setEditingId(zona.idZona);
    setForm({ nombre: zona.zona });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
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
      if (editingId === zona.idZona) {
        cancelEdit();
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Logistic admin</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Zonas
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Alta, edición y eliminación de barrios de Bahía Blanca para ordenar cobertura y asignaciones.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className={`rounded-xl border p-4 ${statCardClass("blue")}`}>
          <p className="text-sm opacity-80">Barrios registrados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{zonas.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${statCardClass("emerald")}`}>
          <p className="text-sm opacity-80">Con pedidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.zonasConPedidos}</p>
        </div>
        <div className={`rounded-xl border p-4 ${statCardClass("amber")}`}>
          <p className="text-sm opacity-80">Sin pedidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.zonasSinPedidos}</p>
        </div>
        <div className={`rounded-xl border p-4 ${statCardClass("slate")}`}>
          <p className="text-sm opacity-80">Pedidos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalPedidos}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          {editingId === null ? "Agregar barrio" : `Editar barrio #${editingId}`}
        </h2>

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
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {editingId === null ? "Agregar" : "Guardar"}
            </button>
            {editingId !== null ? (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {zonas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          Todavía no hay barrios cargados.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {zonas.map((zona) => (
            <article key={zona.idZona} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{zona.zona}</h2>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ID {zona.idZona}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(zona)}
                    disabled={isSaving}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(zona)}
                    disabled={isSaving || zona.rutasAsignadas > 0}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                    title={zona.rutasAsignadas > 0 ? "No se puede borrar porque tiene rutas asociadas" : "Eliminar zona"}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Pedidos totales</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{zona.pedidosTotales}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Bidones</p>
                  <p className="mt-1 text-xl font-semibold text-blue-600">{zona.bidonesTotales}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Asignados</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-600">{zona.pedidosAsignados}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Rutas</p>
                  <p className="mt-1 text-xl font-semibold text-amber-600">{zona.rutasAsignadas}</p>
                </div>
              </div>

              {zona.pedidosReady > 0 ? (
                <p className="mt-3 text-xs text-slate-500">Pendientes en esta zona: {zona.pedidosReady}</p>
              ) : null}
              {zona.pedidosCancelados > 0 ? (
                <p className="text-xs text-slate-500">Cancelados en esta zona: {zona.pedidosCancelados}</p>
              ) : null}
            </article>
          ))}
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