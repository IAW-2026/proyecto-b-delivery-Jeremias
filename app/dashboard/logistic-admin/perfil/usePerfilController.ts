"use client";

import { useEffect, useState } from "react";
import { createInitialProfile, normalizeProfile, type AdminProfileForm, type AdminProfilePayload } from "./utils";
import { getLogisticAdminProfile, updateLogisticAdminProfile } from "@/lib/actions/logistic-admin";

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
        const payload = await getLogisticAdminProfile();

        if (cancelled) return;

        const loadedProfile = normalizeProfile(payload, fallbackName);
        setProfile(loadedProfile);
        setForm(loadedProfile);
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
      const payload = await updateLogisticAdminProfile(form);

      const savedProfile = normalizeProfile(payload, fallbackName);
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