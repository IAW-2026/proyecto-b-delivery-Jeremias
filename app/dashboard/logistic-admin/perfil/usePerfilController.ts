"use client";

import { useEffect, useState } from "react";
import { createInitialProfile, normalizeProfile, type AdminProfileForm, type AdminProfilePayload } from "./utils";

type UsePerfilControllerParams = {
  fallbackName?: string | null;
};

type ProfileStatus = "idle" | "saving" | "saved" | "error";

export function usePerfilController({ fallbackName }: UsePerfilControllerParams) {
  const initialProfile = createInitialProfile(fallbackName);
  const [profile, setProfile] = useState<AdminProfileForm>(initialProfile);
  const [form, setForm] = useState<AdminProfileForm>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>("idle");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/logistic-admin/profile", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { profile?: AdminProfilePayload } | null;

        if (cancelled) return;

        if (response.ok && payload?.profile !== undefined) {
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    try {
      const response = await fetch("/api/logistic-admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as { profile?: AdminProfilePayload; error?: string } | null;

      if (!response.ok || payload?.profile === undefined) {
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

  return {
    profile,
    form,
    isEditing,
    status,
    isLoading,
    handlers: {
      handleChange,
      handleEditClick,
      handleCancelClick,
      handleSubmit,
    },
  };
}