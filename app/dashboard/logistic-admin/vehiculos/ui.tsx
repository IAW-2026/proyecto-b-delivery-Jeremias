"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado?: string;
  motivoPausa?: string | null;
  assignedToChoferName?: string | null;
};

type Props = {
  vehiculos: Vehiculo[];
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

export default function VehiculosManager({ vehiculos }: Props) {
  const router = useRouter();
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pausingVehicleId, setPausingVehicleId] = useState<number | null>(null);
  const [pauseReasons, setPauseReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  function vehicleStatusLabel(estado?: string) {
    if (estado === "pausado") return "Pausado";
    return "Activo";
  }

  function vehicleStatusClass(estado?: string) {
    if (estado === "pausado") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  }

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

  function startEdit(vehiculo: Vehiculo) {
    setEditingId(vehiculo.idVehiculo);
    setEditForm({
      patente: vehiculo.patente,
      tipo: vehiculo.tipo,
      capacidadBidones: String(vehiculo.capacidadBidones),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setError(null);
  }

  async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const capacidad = Number(addForm.capacidadBidones);
    if (!addForm.patente.trim() || !addForm.tipo.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({
        action: "create_vehicle",
        patente: addForm.patente,
        tipo: addForm.tipo,
        capacidadBidones: capacidad,
      });

      setAddForm(emptyForm);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateVehicle(event: React.FormEvent<HTMLFormElement>, idVehiculo: number) {
    event.preventDefault();
    setError(null);

    const capacidad = Number(editForm.capacidadBidones);
    if (!editForm.patente.trim() || !editForm.tipo.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    setIsSaving(true);
    try {
      await runAction({
        action: "update_vehicle",
        idVehiculo,
        patente: editForm.patente,
        tipo: editForm.tipo,
        capacidadBidones: capacidad,
      });

      cancelEdit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(idVehiculo: number) {
    const ok = window.confirm("¿Eliminar este vehículo?");
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

  async function handleTogglePause(vehiculo: Vehiculo) {
    setIsSaving(true);
    setError(null);

    try {
      if (vehiculo.estado === "pausado") {
        await runAction({ action: "set_vehicle_state", idVehiculo: vehiculo.idVehiculo, estado: "activo" });
        setPausingVehicleId(null);
      } else {
        setPausingVehicleId(vehiculo.idVehiculo);
        setPauseReasons((current) => ({
          ...current,
          [vehiculo.idVehiculo]: vehiculo.motivoPausa ?? current[vehiculo.idVehiculo] ?? "",
        }));
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado del vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmPause(vehiculo: Vehiculo) {
    const motivo = pauseReasons[vehiculo.idVehiculo]?.trim() ?? "";
    if (!motivo) {
      setError("Debés indicar un motivo para pausar el vehículo.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await runAction({
        action: "set_vehicle_state",
        idVehiculo: vehiculo.idVehiculo,
        estado: "pausado",
        motivoPausa: motivo,
      });
      setPausingVehicleId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo pausar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelPause(idVehiculo: number) {
    setPausingVehicleId(null);
    setPauseReasons((current) => ({ ...current, [idVehiculo]: "" }));
    setError(null);
  }

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

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Vehículos totales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{vehiculos.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pausados</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {vehiculos.filter((vehiculo) => vehiculo.estado === "pausado").length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Agregar vehículo</h2>

        <form onSubmit={handleAddSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={addForm.patente}
            onChange={(event) => setAddForm((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))}
            placeholder="Patente"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={isSaving}
          />
          <select
            value={addForm.tipo}
            onChange={(event) => setAddForm((prev) => ({ ...prev, tipo: event.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
            value={addForm.capacidadBidones}
            onChange={(event) => setAddForm((prev) => ({ ...prev, capacidadBidones: event.target.value }))}
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
              Agregar
            </button>
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
          {vehiculos.map((vehiculo) => (
            <article key={vehiculo.idVehiculo} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{vehiculo.patente}</h2>
                  <p className="text-sm text-slate-600">{vehiculo.tipo}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${vehicleStatusClass(vehiculo.estado)}`}>
                  {vehicleStatusLabel(vehiculo.estado)}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>Capacidad: {vehiculo.capacidadBidones} bidones</p>
                <p>
                  Chofer asignado: <span className="font-medium text-slate-900">{vehiculo.assignedToChoferName ?? "Sin asignar"}</span>
                </p>
                {vehiculo.estado === "pausado" ? (
                  <p className="text-amber-700">
                    Motivo de pausa: <span className="font-medium">{vehiculo.motivoPausa ?? "Sin motivo"}</span>
                  </p>
                ) : null}
              </div>

              {pausingVehicleId === vehiculo.idVehiculo ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                    Motivo de pausa
                  </label>
                  <textarea
                    value={pauseReasons[vehiculo.idVehiculo] ?? ""}
                    onChange={(event) =>
                      setPauseReasons((current) => ({
                        ...current,
                        [vehiculo.idVehiculo]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Fallas mecánicas, trámite, revisión, etc."
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    disabled={isSaving}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmPause(vehiculo)}
                      disabled={isSaving}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                    >
                      {isSaving ? "Guardando" : "Pausar vehículo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelPause(vehiculo.idVehiculo)}
                      disabled={isSaving}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

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
                <button
                  type="button"
                  onClick={() => handleTogglePause(vehiculo)}
                  disabled={isSaving}
                  className={`rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60 ${
                    vehiculo.estado === "pausado"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {vehiculo.estado === "pausado" ? "Reanudar uso" : "Pausar uso"}
                </button>
              </div>

              {editingId === vehiculo.idVehiculo ? (
                <form onSubmit={(event) => handleUpdateVehicle(event, vehiculo.idVehiculo)} className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">Editar vehículo</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                      value={editForm.patente}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))}
                      placeholder="Patente"
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                      disabled={isSaving}
                    />
                    <select
                      value={editForm.tipo}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, tipo: event.target.value }))}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
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
                      value={editForm.capacidadBidones}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, capacidadBidones: event.target.value }))}
                      placeholder="Capacidad bidones"
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
