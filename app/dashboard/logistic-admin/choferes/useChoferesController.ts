"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LogisticAdminViewData } from "../data";
import { pageSize, type ChoferesFilterState, type SearchBy, type SearchParamsInput, parseChoferesFilters } from "./utils";

type Chofer = LogisticAdminViewData["choferes"][number];
type Zona = LogisticAdminViewData["zonasCatalogo"][number];
type Vehiculo = LogisticAdminViewData["vehiculos"][number];

type ChoferRequest = {
  id: number;
  nombre: string;
  telefono: string;
  vendorName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type UseChoferesControllerParams = {
  choferes: Chofer[];
  zonas: Zona[];
  vehiculos: Vehiculo[];
  searchParams: SearchParamsInput;
  page: number;
  totalFilteredChoferes: number;
  basePath?: string;
};

export function useChoferesController({ choferes, searchParams, page, totalFilteredChoferes, basePath = "/dashboard/logistic-admin" }: UseChoferesControllerParams) {
  const router = useRouter();
  const filterState: ChoferesFilterState = parseChoferesFilters(searchParams);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingChoferId, setEditingChoferId] = useState<number | null>(null);
  const [selectedSearchBy, setSelectedSearchBy] = useState<SearchBy>(filterState.searchBy);
  const [requests, setRequests] = useState<ChoferRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
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

  const pageStart = choferes.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFilteredChoferes, page * pageSize);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch("/api/logistic-admin/chofer-requests", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { requests?: ChoferRequest[] };
        if (!cancelled) {
          setRequests(payload.requests ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoadingRequests(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function startEdit(chofer: Chofer) {
    setEditingChoferId(chofer.idChofer);
    setSelectedZones((current) => ({
      ...current,
      [chofer.idChofer]: chofer.idZona ? String(chofer.idZona) : "",
    }));
    setSelectedVehiculos((current) => ({
      ...current,
      [chofer.idChofer]: chofer.idVehiculo ? String(chofer.idVehiculo) : "",
    }));
    setError(null);
  }

  function cancelEdit(chofer: Chofer) {
    setEditingChoferId(null);
    setSelectedZones((current) => ({
      ...current,
      [chofer.idChofer]: chofer.idZona ? String(chofer.idZona) : "",
    }));
    setSelectedVehiculos((current) => ({
      ...current,
      [chofer.idChofer]: chofer.idVehiculo ? String(chofer.idVehiculo) : "",
    }));
    setError(null);
  }

  async function saveEdit(chofer: Chofer) {
    setSavingId(chofer.idChofer);
    setError(null);

    try {
      const zoneValue = selectedZones[chofer.idChofer];
      const vehicleValue = selectedVehiculos[chofer.idChofer];

      if (!zoneValue) {
        await runAction({ action: "clear_driver_zone", idChofer: chofer.idChofer });
      } else {
        await runAction({ action: "assign_driver_zone", idChofer: chofer.idChofer, idZona: Number(zoneValue) });
      }

      if (!vehicleValue) {
        await runAction({ action: "assign_vehicle", idChofer: chofer.idChofer, idVehiculo: null });
      } else {
        await runAction({ action: "assign_vehicle", idChofer: chofer.idChofer, idVehiculo: Number(vehicleValue) });
      }

      setEditingChoferId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar los cambios del chofer");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSetEstado(chofer: Chofer, estado: string) {
    setSavingId(chofer.idChofer);
    setError(null);

    try {
      await runAction({ action: "set_chofer_estado", idChofer: chofer.idChofer, estado });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(chofer: Chofer) {
    if (!confirm("¿Eliminar chofer? Esta acción no se puede deshacer.")) return;

    setSavingId(chofer.idChofer);
    setError(null);

    try {
      await runAction({ action: "delete_chofer", idChofer: chofer.idChofer });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el chofer");
    } finally {
      setSavingId(null);
    }
  }

  async function handleReviewRequest(requestId: number, action: "approve" | "reject") {
    setRequestActionId(requestId);

    try {
      const options: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };

      if (action === "reject") {
        const reason = window.prompt("Motivo del rechazo (opcional)")?.trim() ?? "";
        options.body = JSON.stringify({ reason });
      }

      const response = await fetch(`/api/logistic-admin/chofer-requests/${requestId}/${action}`, options);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "No se pudo procesar la solicitud");
      }

      setRequests((current) => current.filter((request) => request.id !== requestId));
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo procesar la solicitud");
    } finally {
      setRequestActionId(null);
    }
  }

  return {
    basePath,
    filterState,
    selectedSearchBy,
    setSelectedSearchBy,
    savingId,
    editingChoferId,
    requests,
    loadingRequests,
    requestActionId,
    error,
    pageStart,
    pageEnd,
    occupiedVehicleIds,
    editState: {
      selectedZones,
      selectedVehiculos,
    },
    handlers: {
      startEdit,
      cancelEdit,
      saveEdit,
      handleSetEstado,
      handleDelete,
      handleReviewRequest,
      setSelectedZones,
      setSelectedVehiculos,
    },
  };
}