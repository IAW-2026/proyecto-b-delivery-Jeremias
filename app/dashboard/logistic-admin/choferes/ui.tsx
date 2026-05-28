"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Zona = {
  idZona: number;
  nombre: string;
};

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado?: string;
};

type Chofer = {
  idChofer: number;
  nombre: string;
  telefono: string | null;
  estado: string;
  disponible: boolean;
  idVehiculo: number | null;
  idZona: number | null;
  vehiculo?: {
    patente: string;
    tipo: string;
  } | null;
  zona?: Zona | null;
};

type Props = {
  choferes: Chofer[];
  zonas: Zona[];
  vehiculos: Vehiculo[];
};

function estadoClass(estado: string) {
  if (estado === "activo") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (estado === "rechazado" || estado === "inactivo") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-slate-50 text-slate-700 border border-slate-200";
}

export default function ChoferesManager({ choferes, zonas, vehiculos }: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingChoferId, setEditingChoferId] = useState<number | null>(null);
  const [selectedZones, setSelectedZones] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const chofer of choferes) {
      initial[chofer.idChofer] = chofer.idZona ? String(chofer.idZona) : "";
    }
    return initial;
  });
  const [selectedVehiculos, setSelectedVehiculos] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const chofer of choferes) {
      initial[chofer.idChofer] = chofer.idVehiculo ? String(chofer.idVehiculo) : "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const occupiedVehicleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const chofer of choferes) {
      if (chofer.idVehiculo !== null) {
        ids.add(chofer.idVehiculo);
      }
    }
    return ids;
  }, [choferes]);

  const activeCount = useMemo(() => choferes.filter((chofer) => chofer.estado === "activo").length, [choferes]);

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

  async function handleSaveZone(idChofer: number) {
    const zoneValue = selectedZones[idChofer];
    const vehicleValue = selectedVehiculos[idChofer];
    setSavingId(idChofer);
    setError(null);

    try {
      if (!zoneValue) {
        await runAction({ action: "clear_driver_zone", idChofer });
      } else {
        await runAction({ action: "assign_driver_zone", idChofer, idZona: Number(zoneValue) });
      }

      if (!vehicleValue) {
        await runAction({ action: "assign_vehicle", idChofer, idVehiculo: null });
      } else {
        await runAction({ action: "assign_vehicle", idChofer, idVehiculo: Number(vehicleValue) });
      }

      setEditingChoferId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar los cambios del chofer");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSetEstado(idChofer: number, estado: string) {
    setSavingId(idChofer);
    setError(null);
    try {
      await runAction({ action: "set_chofer_estado", idChofer, estado });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(idChofer: number) {
    if (!confirm("¿Eliminar chofer? Esta acción no se puede deshacer.")) return;
    setSavingId(idChofer);
    setError(null);
    try {
      await runAction({ action: "delete_chofer", idChofer });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el chofer");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-100 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">Logistic admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight" style={{ color: "#00AEEF" }}>
          Choferes
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          Estado del equipo de choferes, disponibilidad, vehículo asignado y barrio operativo.
        </p>
      </header>

      {/* Seccion de Estadísticas */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
          <p className="text-sm text-slate-500">Total choferes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{choferes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
          <p className="text-sm text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
          <p className="text-sm text-slate-500">Con zona</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">
            {choferes.filter((chofer) => chofer.idZona !== null).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm">
          <p className="text-sm text-slate-500">Sin zona</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {choferes.filter((chofer) => chofer.idZona === null).length}
          </p>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {choferes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          No hay choferes asociados a la empresa.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {choferes.map((chofer) => (
            <article key={chofer.idChofer} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{chofer.nombre}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Telefono: {chofer.telefono ?? "Sin teléfono"}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wide ${estadoClass(chofer.estado)}`}>
                  {chofer.estado}
                </span>
              </div>

              {/* Contenedor Zona */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zona actual</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {chofer.zona?.nombre ?? <span className="text-slate-400 font-normal italic">Sin zona</span>}
                    </p>
                  </div>

                  {editingChoferId === chofer.idChofer ? (
                    <select
                      value={selectedZones[chofer.idChofer] ?? ""}
                      onChange={(event) => setSelectedZones((current) => ({ ...current, [chofer.idChofer]: event.target.value }))}
                      className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      disabled={savingId === chofer.idChofer}
                    >
                      <option value="">Sin zona</option>
                      {zonas.map((zona) => (
                        <option key={zona.idZona} value={zona.idZona}>
                          {zona.nombre}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>

              {/* Contenedor Vehículo */}
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehículo actual</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {chofer.vehiculo?.patente ? `${chofer.vehiculo.patente} (${chofer.vehiculo.tipo})` : <span className="text-slate-400 font-normal italic">Sin asignar</span>}
                    </p>
                  </div>

                  {editingChoferId === chofer.idChofer ? (
                    <select
                      value={selectedVehiculos[chofer.idChofer] ?? ""}
                      onChange={(event) => setSelectedVehiculos((current) => ({ ...current, [chofer.idChofer]: event.target.value }))}
                      className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      disabled={savingId === chofer.idChofer}
                    >
                      <option value="">Sin asignar</option>
                      {vehiculos
                        .filter((vehiculo) => vehiculo.estado !== "pausado" && (vehiculo.idVehiculo === chofer.idVehiculo || !occupiedVehicleIds.has(vehiculo.idVehiculo)))
                        .map((vehiculo) => (
                          <option key={vehiculo.idVehiculo} value={vehiculo.idVehiculo}>
                            {vehiculo.patente} · {vehiculo.tipo}
                            {vehiculo.idVehiculo === chofer.idVehiculo ? " (actual)" : ""}
                          </option>
                        ))}
                    </select>
                  ) : null}
                </div>
              </div>

              {/* NUEVO PIE DE TARJETA: Todos los botones agrupados en una sola línea fluida */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-start gap-2">
                {editingChoferId === chofer.idChofer ? (
                  <>
                    {/* Guardar */}
                    <button
                      type="button"
                      onClick={() => handleSaveZone(chofer.idChofer)}
                      disabled={savingId === chofer.idChofer}
                      className="rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-1.5 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50"
                    >
                      {savingId === chofer.idChofer ? "Guardando..." : "Guardar"}
                    </button>

                    {/* Cancelar */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChoferId(null);
                        setSelectedZones((current) => ({ ...current, [chofer.idChofer]: chofer.idZona ? String(chofer.idZona) : "" }));
                        setSelectedVehiculos((current) => ({ ...current, [chofer.idChofer]: chofer.idVehiculo ? String(chofer.idVehiculo) : "" }));
                        setError(null);
                      }}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100/80"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => setEditingChoferId(chofer.idChofer)}
                      className="rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50/80"
                    >
                      Editar
                    </button>

                    {/* Inactivar / Activar (Dinámico Amarillo/Verde) */}
                    <button
                      type="button"
                      onClick={() => handleSetEstado(chofer.idChofer, chofer.estado === "activo" ? "inactivo" : "activo")}
                      disabled={savingId === chofer.idChofer}
                      className={`rounded-xl px-4 py-1.5 text-sm font-medium border transition-colors disabled:opacity-50 ${
                        chofer.estado === "activo"
                          ? "border-amber-200 bg-amber-50/40 text-amber-600 hover:bg-amber-50/80"
                          : "border-emerald-200 bg-emerald-50/40 text-emerald-600 hover:bg-emerald-50/80"
                      }`}
                    >
                      {savingId === chofer.idChofer ? "..." : chofer.estado === "activo" ? "Inactivar" : "Activar"}
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDelete(chofer.idChofer)}
                      disabled={savingId === chofer.idChofer}
                      className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50/80 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}