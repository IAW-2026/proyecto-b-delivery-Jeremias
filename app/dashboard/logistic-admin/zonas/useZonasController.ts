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
  vendorOptions?: Record<number, string>;
};

const emptyForm: FormState = {
  nombre: "",
};

export function useZonasController({ zonas, searchParams, page, totalFilteredZonas, basePath = "/dashboard/logistic-admin", vendorOptions }: UseZonasControllerParams) {
  const router = useRouter();
  const filterState: ZonasFilterState = parseZonasFilters(searchParams);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingZonaId, setEditingZonaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmpresasForZone, setShowEmpresasForZone] = useState<Zona | null>(null);
  const vendorIds = vendorOptions ? Object.keys(vendorOptions).map(Number).sort() : [];
  const [selectedVendorId, setSelectedVendorId] = useState<number>(vendorIds[0] ?? 0);

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
      const result = await actions.createZone(nombre, selectedVendorId);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar la zona");
        return;
      }
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

  function getZona(idZona: number) {
    return zonas.find((z) => z.idZona === idZona);
  }

  async function handleUpdateZone(idZona: number) {
    setError(null);

    const nombre = editForm.nombre.trim();
    const currentZona = getZona(idZona);
    if (!nombre || !currentZona) {
      setError("Escribí el nombre del barrio.");
      return;
    }

    const duplicate = zonas.find((z) =>
      z.idZona !== idZona &&
      z.zona.toLowerCase() === nombre.toLowerCase()
    );
    if (duplicate) {
      setError(`Ya existe una zona con el nombre "${nombre}"`);
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
    if (vendorOptions) {
      const ok = window.confirm(`¿Eliminar la zona global "${zona.zona}"? Se desvinculará de todas las empresas y se borrará definitivamente.`);
      if (!ok) return;
      setIsSaving(true);
      setError(null);
      try {
        await actions.globalDeleteZone(zona.idZona);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la zona");
      } finally {
        setIsSaving(false);
      }
    } else {
      const ok = window.confirm(`¿Desvincular la zona "${zona.zona}" de tu empresa?`);
      if (!ok) return;
      setIsSaving(true);
      setError(null);
      try {
        await actions.deleteZone(zona.idZona);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo desvincular la zona");
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleDisassociateVendor(idVendedor: number) {
    if (!showEmpresasForZone) return;
    setIsSaving(true);
    setError(null);
    try {
      await actions.disassociateVendorFromZone(showEmpresasForZone.idZona, idVendedor);
      setShowEmpresasForZone(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desvincular la empresa");
    } finally {
      setIsSaving(false);
    }
  }

  function submitSearch(queryValue: string) {
    router.push(buildZonasQueryHref({ query: queryValue, page: 1 }, filterState, `${basePath}/zonas`));
  }

  return {
    vendorOptions: vendorOptions ?? null,
    selectedVendorId,
    setSelectedVendorId,
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
    showEmpresasForZone,
    setShowEmpresasForZone,
    handlers: {
      handleSubmit,
      startEdit,
      cancelEdit,
      handleUpdateZone,
      handleDelete,
      handleDisassociateVendor,
      submitSearch,
    },
  };
}