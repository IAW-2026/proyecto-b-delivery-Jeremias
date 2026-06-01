"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pageSize } from "@/lib/shared/utils";
import { buildZonasQueryHref, parseZonasFilters, type SearchParamsInput, type Zona, type ZonasFilterState } from "./utils";
import * as actions from "@/lib/actions/logistic-admin";

type FormState = {
  nombre: string;
};

type UseZonasControllerParams = {
  zonas: Zona[];
  searchParams: SearchParamsInput;
  page: number;
  totalFilteredZonas: number;
  basePath?: string;
};

const emptyForm: FormState = {
  nombre: "",
};

export function useZonasController({ zonas, searchParams, page, totalFilteredZonas, basePath = "/dashboard/logistic-admin" }: UseZonasControllerParams) {
  const router = useRouter();
  const filterState: ZonasFilterState = parseZonasFilters(searchParams);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZonaId, setEditingZonaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageStart = zonas.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalFilteredZonas, page * pageSize);

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
      await actions.createZone(nombre);
      setForm(emptyForm);
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
      await actions.updateZone(idZona, nombre);
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(zona: Zona) {
    const ok = window.confirm(`¿Eliminar la zona ${zona.zona}?`);
    if (!ok) return;

    setIsSaving(true);
    setError(null);
    try {
      await actions.deleteZone(zona.idZona);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la zona");
    } finally {
      setIsSaving(false);
    }
  }

  function submitSearch(queryValue: string) {
    router.push(buildZonasQueryHref({ query: queryValue, page: 1 }, filterState, `${basePath}/zonas`));
  }

  return {
    filterState,
    form,
    setForm,
    editForm,
    setEditForm,
    isSaving,
    editingZonaId,
    error,
    pageStart,
    pageEnd,
    handlers: {
      handleSubmit,
      startEdit,
      cancelEdit,
      handleUpdateZone,
      handleDelete,
      submitSearch,
    },
  };
}