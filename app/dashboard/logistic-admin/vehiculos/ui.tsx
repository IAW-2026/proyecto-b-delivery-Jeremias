"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
};

type Chofer = {
  idChofer: number;
  nombre: string;
  idVehiculo: number | null;
};

type Props = {
  vehiculos: Vehiculo[];
  choferes: Chofer[];
};

type FormState = {
  patente: string;
  tipo: string;
  capacidadBidones: string;
};

const emptyForm: FormState = {
  patente: "",
  tipo: "",
  capacidadBidones: "",
};

export default function VehiculosManager({ vehiculos, choferes }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedByVehicleId = useMemo(() => {
    const map = new Map<number, string>();
    for (const chofer of choferes) {
      if (chofer.idVehiculo !== null) {
        map.set(chofer.idVehiculo, chofer.nombre);
      }
    }
    return map;
  }, [choferes]);

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

    const capacidad = Number(form.capacidadBidones);
    if (!form.patente.trim() || !form.tipo.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId === null) {
        await runAction({
          action: "create_vehicle",
          patente: form.patente,
          tipo: form.tipo,
          capacidadBidones: capacidad,
        });
      } else {
        await runAction({
          action: "update_vehicle",
          idVehiculo: editingId,
          patente: form.patente,
          tipo: form.tipo,
          capacidadBidones: capacidad,
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(vehiculo: Vehiculo) {
    setEditingId(vehiculo.idVehiculo);
    setForm({
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      capacidadBidones: String(vehiculo.capacidadBidones),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleDelete(idVehiculo: number) {
    const ok = window.confirm("¿Eliminar este vehículo? Si está asignado, se desasigna del chofer.");
    if (!ok) return;

    setIsSaving(true);
    setError(null);
    try {
      await runAction({ action: "delete_vehicle", idVehiculo });
      if (editingId === idVehiculo) {
        cancelEdit();
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  const assignedCount = vehiculos.filter((vehiculo) => assignedByVehicleId.has(vehiculo.idVehiculo)).length;
  const unassignedCount = vehiculos.length - assignedCount;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Logistic admin</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Vehículos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Alta, edición y eliminación de flota. Los cambios se guardan en base local.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Vehículos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{vehiculos.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Asignados</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{assignedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Sin asignar</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{unassignedCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          {editingId === null ? "Agregar vehículo" : `Editar vehículo #${editingId}`}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={form.patente}
            onChange={(event) => setForm((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))}
            placeholder="Patente"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={isSaving}
          />
          <select
            value={form.tipo}
            onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            disabled={isSaving}
          >
            <option value="">Seleccione tipo</option>
            <option value="Camioneta">Camioneta</option>
            <option value="Furgón">Furgón</option>
            <option value="Camión">Camión</option>
            <option value="Moto">Moto</option>
            <option value="Otro">Otro</option>
          </select>
          <input
            type="number"
            min={1}
            value={form.capacidadBidones}
            onChange={(event) => setForm((prev) => ({ ...prev, capacidadBidones: event.target.value }))}
            placeholder="Capacidad bidones"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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

      {vehiculos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          No hay vehículos asociados a la empresa.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {vehiculos.map((vehiculo) => {
            const choferAsignado = assignedByVehicleId.get(vehiculo.idVehiculo);
            return (
              <article key={vehiculo.idVehiculo} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-900">{vehiculo.patente}</h2>
                <p className="text-sm text-slate-600">{vehiculo.tipo}</p>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>Capacidad: {vehiculo.capacidadBidones} bidones</p>
                  <p>
                    Asignado a: <span className="font-medium text-slate-900">{choferAsignado ?? "Sin asignar"}</span>
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(vehiculo)}
                    disabled={isSaving}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(vehiculo.idVehiculo)}
                    disabled={isSaving}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
