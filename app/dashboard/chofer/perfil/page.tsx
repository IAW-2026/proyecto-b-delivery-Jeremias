"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type ChoferProfileForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  disponible: boolean;
  cbuCvu: string;
  alias: string;
  cuilCuit: string;
};

const emptyProfile: ChoferProfileForm = {
  nombre: "",
  apellido: "",
  telefono: "",
  disponible: true,
  cbuCvu: "",
  alias: "",
  cuilCuit: "",
};

function normalizeProfile(
  profile: Partial<ChoferProfileForm> | null | undefined,
  userFirstName?: string | null,
  userLastName?: string | null
): ChoferProfileForm {
  return {
    nombre: userFirstName ?? profile?.nombre ?? "",
    apellido: userLastName ?? profile?.apellido ?? "",
    telefono: profile?.telefono ?? "",
    disponible: profile?.disponible ?? true,
    cbuCvu: profile?.cbuCvu ?? "",
    alias: profile?.alias ?? "",
    cuilCuit: profile?.cuilCuit ?? "",
  };
}

export default function PerfilPage() {
  const { user, isLoaded } = useUser();

  const [profile, setProfile] = useState<ChoferProfileForm>(emptyProfile);
  const [form, setForm] = useState<ChoferProfileForm>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/update-profile");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Error");
        }

        const nextProfile = normalizeProfile(data?.chofer, user?.firstName, user?.lastName);

        if (!cancelled) {
          setProfile(nextProfile);
          setForm(nextProfile);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.firstName, user?.lastName]);

  function handleChange<K extends keyof ChoferProfileForm>(field: K, value: ChoferProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditClick() {
    setForm(normalizeProfile(profile, user?.firstName, user?.lastName));
    setIsEditing(true);
    setStatus("idle");
  }

  function handleCancelClick() {
    setForm(normalizeProfile(profile, user?.firstName, user?.lastName));
    setIsEditing(false);
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");
      await user?.reload?.();
      setProfile(form);
      setIsEditing(false);
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Perfil del Chofer</h2>
          <p className="text-sm text-gray-600">
            {`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.fullName || "Usuario"}
          </p>
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
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apellido</label>
            <input
              value={form.apellido}
              onChange={(e) => handleChange("apellido", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
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
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CBU / CVU</label>
            <input
              value={form.cbuCvu}
              onChange={(e) => handleChange("cbuCvu", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Alias</label>
            <input
              value={form.alias}
              onChange={(e) => handleChange("alias", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CUIL / CUIT</label>
            <input
              value={form.cuilCuit}
              onChange={(e) => handleChange("cuilCuit", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
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
