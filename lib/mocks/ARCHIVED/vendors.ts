export type Vendor = {
  id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
  descripcion?: string;
};

export const MOCK_VENDORS: Vendor[] = [
  { id: 1, nombre: "Distribuciones Norte", direccion: "Av. Siempre Viva 742" },
  { id: 2, nombre: "Suministros del Sur", direccion: "Calle Falsa 123" },
];

export function getMockVendors(): Vendor[] {
  return MOCK_VENDORS;
}
