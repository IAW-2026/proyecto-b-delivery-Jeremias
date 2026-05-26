"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Zona = {
  idZona: number;
  nombre: string;
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
};

function estadoClass(estado: string) {
  if (estado === "activo") return "bg-emerald-100 text-emerald-700";
  if (estado === "rechazado") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function ChoferesManager({ choferes, zonas }: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedZones, setSelectedZones] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const chofer of choferes) {
      initial[chofer.idChofer] = chofer.idZona ? String(chofer.idZona) : "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

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
    setSavingId(idChofer);
    setError(null);

    try {
      if (!zoneValue) {
        await runAction({ action: "clear_driver_zone", idChofer });
      } else {
        await runAction({ action: "assign_driver_zone", idChofer, idZona: Number(zoneValue) });
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la zona del chofer");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Logistic admin</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Choferes
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Estado del equipo de choferes, disponibilidad, vehículo asignado y barrio operativo.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total choferes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{choferes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Con zona</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">
            {choferes.filter((chofer) => chofer.idZona !== null).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
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
        <div className="grid gap-4 lg:grid-cols-2">
          {choferes.map((chofer) => (
            <article key={chofer.idChofer} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{chofer.nombre}</h2>
                  <p className="text-sm text-slate-600">{chofer.telefono ?? "Sin teléfono"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoClass(chofer.estado)}`}>
                  {chofer.estado}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Chofer ID: #{chofer.idChofer}</p>
                <p>
                  Vehículo: {chofer.vehiculo?.patente ?? "Sin asignar"}
                  {chofer.vehiculo?.tipo ? ` (${chofer.vehiculo.tipo})` : ""}
                </p>
                <p>Zona actual: {chofer.zona?.nombre ?? "Sin zona"}</p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedZones[chofer.idChofer] ?? ""}
                  onChange={(event) => setSelectedZones((current) => ({ ...current, [chofer.idChofer]: event.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={savingId === chofer.idChofer}
                >
                  <option value="">Sin zona</option>
                  {zonas.map((zona) => (
                    <option key={zona.idZona} value={zona.idZona}>
                      {zona.nombre}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleSaveZone(chofer.idChofer)}
                  disabled={savingId === chofer.idChofer}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {savingId === chofer.idChofer ? "Guardando" : "Guardar zona"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}