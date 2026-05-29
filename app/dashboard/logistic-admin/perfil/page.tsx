"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type AdminProfileForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  nombreEmpresa: string;
};

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { nombre: "", apellido: "" };
  }

  const parts = trimmed.split(/\s+/);
  const nombre = parts.shift() ?? "";
  const apellido = parts.join(" ");

  return { nombre, apellido };
}

function normalizeProfile(profile: Partial<AdminProfileForm> | null | undefined, fallbackName?: string | null): AdminProfileForm {
  const combinedName = [profile?.nombre ?? "", profile?.apellido ?? ""].filter(Boolean).join(" ").trim();
  const { nombre, apellido } = splitFullName(combinedName || fallbackName || "");

  return {
    nombre,
    apellido,
    telefono: profile?.telefono ?? "",
    nombreEmpresa: profile?.nombreEmpresa ?? "",
  };
}

export default function PerfilPage() {
  const { user } = useUser();
  const fallbackName = user?.fullName?.trim() ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const initialProfile: AdminProfileForm = {
    ...splitFullName(fallbackName),
    telefono: "",
    nombreEmpresa: "",
  };

  const [profile, setProfile] = useState<AdminProfileForm>(initialProfile);
  const [form, setForm] = useState<AdminProfileForm>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/logistic-admin/profile", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as | { profile?: Partial<AdminProfileForm> | null } | null;

        if (cancelled) return;

        if (response.ok && payload?.profile) {
          const loadedProfile = normalizeProfile(payload.profile, fallbackName);
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

  function handleChange<K extends keyof AdminProfileForm>(field: K, value: AdminProfileForm[K]) {
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
      const response = await fetch("/api/logistic-admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as | { profile?: Partial<AdminProfileForm> | null; error?: string } | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.error ?? "No se pudo guardar el perfil");
      }

      const savedProfile = normalizeProfile(payload.profile, fallbackName);
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
          <h2 className="text-2xl font-semibold mb-1">Perfil - Admin Logístico</h2>
          <p className="text-sm text-gray-600">{`${profile.nombre} ${profile.apellido}`.trim()}</p>
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
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre empresa</label>
            <input
              value={form.nombreEmpresa}
              onChange={(e) => handleChange("nombreEmpresa", e.target.value)}
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
