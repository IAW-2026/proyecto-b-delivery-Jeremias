"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pageSize } from "@/lib/shared/utils";
import { buildVehiculosQueryHref, parseVehiculosFilters, type SearchParamsInput, type Vehiculo, type VehiculosFilterState, type VehiculoStatus } from "./vehiculos-utils";
import * as actions from "@/lib/actions/logistic-admin";

type FormState = {
  patente: string;
  tipo: string;
  capacidadBidones: string;
};

type UseVehiculosControllerParams = {
  vehiculos: Vehiculo[];
  searchParams: SearchParamsInput;
  page: number;
  totalFilteredVehiculos: number;
  basePath?: string;
  vendorOptions?: Record<number, string>;
};

const emptyForm: FormState = {
  patente: "",
  tipo: "",
  capacidadBidones: "",
};

export function useVehiculosController({ vehiculos, searchParams, page, totalFilteredVehiculos, basePath = "/dashboard/logistic-admin", vendorOptions }: UseVehiculosControllerParams) {
  const router = useRouter();
  const filterState: VehiculosFilterState = parseVehiculosFilters(searchParams);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pausingVehicleId, setPausingVehicleId] = useState<number | null>(null);
  const [detailsVehicleId, setDetailsVehicleId] = useState<number | null>(null);
  const [pauseReasons, setPauseReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const vendorIds = vendorOptions ? Object.keys(vendorOptions).map(Number).sort() : [];
  const [selectedVendorId, setSelectedVendorId] = useState<number>(vendorIds[0] ?? 0);

  const pageStart = vehiculos.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFilteredVehiculos, page * pageSize);

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

    const patente = addForm.patente.trim().toUpperCase();
    const tipo = addForm.tipo.trim();
    const capacidadBidones = Number(addForm.capacidadBidones);

    if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    const duplicate = vehiculos.find(
      (v) => v.patente.toUpperCase() === patente
    );
    if (duplicate) {
      setError(`Ya existe un vehículo con la patente "${patente}"`);
      return;
    }

    setIsSaving(true);
    try {
      await actions.createVehicle(patente, tipo, capacidadBidones, selectedVendorId);
      setAddForm(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateVehicle(vehiculoId: number, original: Vehiculo) {
    const patente = editForm.patente.trim().toUpperCase();
    const tipo = editForm.tipo.trim();
    const capacidadBidones = Number(editForm.capacidadBidones);

    if (!patente || !tipo || !Number.isFinite(capacidadBidones) || capacidadBidones <= 0) {
      setError("Completá patente, tipo y capacidad válida (> 0).");
      return;
    }

    const duplicate = vehiculos.find(
      (v) => v.idVehiculo !== vehiculoId && v.patente.toUpperCase() === patente
    );
    if (duplicate) {
      setError(`Ya existe un vehículo con la patente "${patente}"`);
      return;
    }

    cancelEdit();
    setError(null);
    setIsSaving(true);

    try {
      await actions.updateVehicle(vehiculoId, { patente, tipo, capacidadBidones }, original.idVendedor);
    } catch (e) {
      setEditingId(vehiculoId);
      setEditForm({
        patente: original.patente,
        tipo: original.tipo,
        capacidadBidones: String(original.capacidadBidones),
      });
      setError(e instanceof Error ? e.message : "No se pudo guardar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(vehiculo: Vehiculo) {
    const ok = window.confirm("¿Eliminar este vehículo?");
    if (!ok) return;

    setIsSaving(true);
    setError(null);

    try {
      await actions.deleteVehicle(vehiculo.idVehiculo, vehiculo.idVendedor);
      if (editingId === vehiculo.idVehiculo) {
        cancelEdit();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el vehículo");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePause(vehiculo: Vehiculo) {
    if (vehiculo.estado !== "pausado") {
      setPausingVehicleId(vehiculo.idVehiculo);
      setPauseReasons((current) => ({
        ...current,
        [vehiculo.idVehiculo]: vehiculo.motivoPausa ?? current[vehiculo.idVehiculo] ?? "",
      }));
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await actions.setVehicleState(vehiculo.idVehiculo, "activo", undefined, vehiculo.idVendedor);
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
      await actions.setVehicleState(vehiculo.idVehiculo, "pausado", motivo, vehiculo.idVendedor);
      setPausingVehicleId(null);
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

  function openDetails(vehiculo: Vehiculo) {
    setDetailsVehicleId(vehiculo.idVehiculo);
  }

  function closeDetails() {
    setDetailsVehicleId(null);
  }

  function submitSearch(queryValue: string) {
    router.push(buildVehiculosQueryHref({ query: queryValue, page: 1 }, filterState, `${basePath}/vehiculos`));
  }

  function changeStatusFilter(status: "todos" | VehiculoStatus) {
    router.push(buildVehiculosQueryHref({ status, page: 1 }, filterState, `${basePath}/vehiculos`));
  }

  return {
    vendorOptions: vendorOptions ?? null,
    selectedVendorId,
    setSelectedVendorId,
    filterState,
    addForm,
    setAddForm,
    editForm,
    setEditForm,
    isSaving,
    editingId,
    pausingVehicleId,
    detailsVehicleId,
    pauseReasons,
    setPauseReasons,
    error,
    pageStart,
    pageEnd,
    handlers: {
      startEdit,
      cancelEdit,
      handleAddSubmit,
      handleUpdateVehicle,
      handleDelete,
      handleTogglePause,
      handleConfirmPause,
      handleCancelPause,
      openDetails,
      closeDetails,
      submitSearch,
      changeStatusFilter,
    },
  };
}
