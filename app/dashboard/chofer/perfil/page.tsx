"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { splitFullName } from "@/lib/shared/utils";

type ChoferProfileForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  disponible: boolean;
  cbuCvu: string;
  alias: string;
  cuilCuit: string;
};

function normalizeProfile(
  profile: Partial<ChoferProfileForm> | null | undefined,
  fallbackName?: string | null
): ChoferProfileForm {
  const combinedName = [profile?.nombre ?? "", profile?.apellido ?? ""].filter(Boolean).join(" ").trim();
  const { nombre, apellido } = splitFullName(combinedName || fallbackName || "");

  return {
    nombre,
    apellido,
    telefono: profile?.telefono ?? "",
    disponible: profile?.disponible ?? true,
    cbuCvu: profile?.cbuCvu ?? "",
    alias: profile?.alias ?? "",
    cuilCuit: profile?.cuilCuit ?? "",
  };
}

export default function PerfilPage() {
  const { user } = useUser();
  const fallbackName = user?.fullName?.trim() ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const initialProfile: ChoferProfileForm = {
    ...splitFullName(fallbackName),
    telefono: "",
    disponible: true,
    cbuCvu: "",
    alias: "",
    cuilCuit: "",
  };

  const [profile, setProfile] = useState<ChoferProfileForm>(initialProfile);
  const [form, setForm] = useState<ChoferProfileForm>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/chofer/profile", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { chofer?: Partial<ChoferProfileForm> | null }
          | null;

        if (cancelled) return;

        if (response.ok && payload?.chofer) {
          const loadedProfile = normalizeProfile(payload.chofer, fallbackName);
          setProfile(loadedProfile);
          setForm(loadedProfile);
          return;
        }

        const baseProfile = normalizeProfile(null, fallbackName);
        setProfile(baseProfile);
        setForm(baseProfile);
      } catch {
        if (!cancelled) {
          const baseProfile = normalizeProfile(null, fallbackName);
          setProfile(baseProfile);
          setForm(baseProfile);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [fallbackName]);

  function handleChange<K extends keyof ChoferProfileForm>(field: K, value: ChoferProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditClick() {
    setForm(normalizeProfile(profile));
    setIsEditing(true);
    setStatus("idle");
  }

  function handleCancelClick() {
    setForm(normalizeProfile(profile, fallbackName));
    setIsEditing(false);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    try {
      const response = await fetch("/api/chofer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as
        | { chofer?: Partial<ChoferProfileForm> | null; error?: string }
        | null;

      if (!response.ok || !payload?.chofer) {
        throw new Error(payload?.error ?? "No se pudo guardar el perfil");
      }

      const savedProfile = normalizeProfile(payload.chofer, fallbackName);
      setProfile(savedProfile);
      setForm(savedProfile);
      setIsEditing(false);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (isLoading) {
    return <div>Cargando perfil...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-sky-400 font-semibold mb-1">Perfil del Chofer</h2>
          <p className="text-sm text-black">{`${profile.nombre} ${profile.apellido}`.trim()}</p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={handleEditClick}
            className="px-4 py-2 rounded-md border border-blue-600 text-blue-700 bg-white hover:bg-blue-50"
          >
            Modificar datos
          </button>
        ) : null}
      </div>

      <div className="max-w-2xl bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apellido</label>
            <input
              value={form.apellido}
              onChange={(e) => handleChange("apellido", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Disponibilidad actual</label>
            <div className="mt-2 flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
              <input
                type="checkbox"
                checked={form.disponible}
                onChange={(e) => handleChange("disponible", e.target.checked)}
                disabled={!isEditing}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">
                {form.disponible ? "Disponible" : "No disponible"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CBU / CVU</label>
            <input
              value={form.cbuCvu}
              onChange={(e) => handleChange("cbuCvu", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Alias</label>
            <input
              value={form.alias}
              onChange={(e) => handleChange("alias", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CUIL / CUIT</label>
            <input
              value={form.cuilCuit}
              onChange={(e) => handleChange("cuilCuit", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2 text-gray-900"
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                disabled={status === "saving"}
              >
                {status === "saving" ? "Guardando..." : "Guardar"}
              </button>
            ) : null}
            {isEditing ? (
              <button
                type="button"
                onClick={handleCancelClick}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
            ) : null}
            {status === "saved" && <span className="text-green-600">Guardado.</span>}
            {status === "error" && <span className="text-red-600">Error al guardar.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
