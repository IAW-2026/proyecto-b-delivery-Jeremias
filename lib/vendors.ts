export type Vendor = {
  id_usuario: number;
  id_vendedor: number;
  nombre: string;
  reputacion: number;
  cuil: string;
  cuit: string;
  descripcion: string;
  direccion: string;
};

const fallbackVendors: Vendor[] = [
  {
    id_usuario: 1001,
    id_vendedor: 1,
    nombre: "Distribuciones Norte",
    reputacion: 4.7,
    cuil: "20-12345678-9",
    cuit: "20-12345678-9",
    descripcion: "Distribuidor mayorista de bebidas",
    direccion: "Av. Siempre Viva 742, Ciudad",
  },
  {
    id_usuario: 1002,
    id_vendedor: 2,
    nombre: "Suministros del Sur",
    reputacion: 4.2,
    cuil: "23-87654321-0",
    cuit: "23-87654321-0",
    descripcion: "Proveedor local de garrafas",
    direccion: "Calle Falsa 123, Pueblo",
  },
];

export async function getVendors(): Promise<Vendor[]> {
  const vendorsApiUrl = process.env.VENDORS_API_URL;

  if (!vendorsApiUrl) {
    return fallbackVendors;
  }

  try {
    const response = await fetch(vendorsApiUrl, { cache: "no-store" });

    if (!response.ok) {
      return fallbackVendors;
    }

    return (await response.json()) as Vendor[];
  } catch {
    return fallbackVendors;
  }
}
