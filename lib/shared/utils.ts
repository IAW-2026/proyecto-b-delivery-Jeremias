export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export const pageSize = 8;

export function normalizeOrderStatus(value: string) {
  if (value === "ready" || value === "en_camino" || value === "entregado" || value === "cancelado" || value === "revision") {
    return value;
  }

  if (value === "assigned") return "ready";
  if (value === "asignado") return "ready";
  if (value === "cancelled") return "cancelado";
  if (value === "delivered") return "entregado";

  return "ready";
}

export function normalizeZonaName(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function nowIso() {
  return new Date().toISOString();
}

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
