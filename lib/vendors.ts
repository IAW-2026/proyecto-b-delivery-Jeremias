import { getMockVendors, Vendor as MockVendor } from "@/lib/mocks/vendors";

export type Vendor = MockVendor & { id_usuario?: number; id_vendedor?: number };

export async function getVendors(): Promise<Vendor[]> {
  const vendorsApiUrl = process.env.VENDORS_API_URL;

  // If an external Seller API is configured, try it, otherwise return local mocks.
  if (!vendorsApiUrl) {
    return getMockVendors();
  }

  try {
    const response = await fetch(vendorsApiUrl, { cache: "no-store" });
    if (!response.ok) return getMockVendors();
    return (await response.json()) as Vendor[];
  } catch {
    return getMockVendors();
  }
}
