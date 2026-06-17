export type Vendor = {
  id: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  descripcion?: string;
  clerkUserId?: string;
};

const VENDORS_API_URL = process.env.VENDORS_API_URL;
const VENDORS_API_KEY = process.env.VENDORS_API_KEY;

export async function fetchVendors(): Promise<Vendor[]> {
  if (!VENDORS_API_URL) return [];

  try {
    const response = await fetch(VENDORS_API_URL, {
      cache: "no-store",
      headers: {
        "X-API-Key": VENDORS_API_KEY ?? "",
      },
    });
    if (!response.ok) return [];
    const body = await response.json();
    const rawList = body.vendors ?? body.data ?? body;
    const list = Array.isArray(rawList) ? rawList : [];
    return list.map((v: Record<string, unknown>) => ({
      id: String(v.id ?? ""),
      nombre: String(v.name ?? v.nombre ?? ""),
      direccion: String(v.address ?? v.direccion ?? ""),
      telefono: v.telefono ? String(v.telefono) : undefined,
      descripcion: v.description ? String(v.description) : undefined,
      clerkUserId: v.clerkUserId ? String(v.clerkUserId) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getVendors(): Promise<Vendor[]> {
  return fetchVendors();
}
