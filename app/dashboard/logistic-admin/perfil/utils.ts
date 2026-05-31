export type AdminProfileForm = {
  nombre: string;
  apellido: string;
  telefono: string;
  nombreEmpresa: string;
};

export type AdminProfilePayload = Partial<AdminProfileForm> | null | undefined;

export function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { nombre: "", apellido: "" };
  }

  const parts = trimmed.split(/\s+/);
  const nombre = parts.shift() ?? "";
  const apellido = parts.join(" ");

  return { nombre, apellido };
}

export function normalizeProfile(profile: AdminProfilePayload, fallbackName?: string | null): AdminProfileForm {
  const combinedName = [profile?.nombre ?? "", profile?.apellido ?? ""].filter(Boolean).join(" ").trim();
  const { nombre, apellido } = splitFullName(combinedName || fallbackName || "");

  return {
    nombre,
    apellido,
    telefono: profile?.telefono ?? "",
    nombreEmpresa: profile?.nombreEmpresa ?? "",
  };
}

export function createInitialProfile(fallbackName?: string | null): AdminProfileForm {
  return {
    ...splitFullName(fallbackName ?? ""),
    telefono: "",
    nombreEmpresa: "",
  };
}