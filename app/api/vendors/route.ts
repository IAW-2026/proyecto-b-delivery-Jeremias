import { NextResponse } from "next/server";

export type Vendor = {
  id_vendedor: number;
  nombre: string;
  reputacion: number;
  descripcion: string;
  direccion: string;
};

const vendorsMock: Vendor[] = [
  {
    id_vendedor: 1,
    nombre: "Distribuciones Norte",
    reputacion: 4.7,
    descripcion: "Distribuidor mayorista de bebidas",
    direccion: "Av. Siempre Viva 742, Ciudad",
  },
  {
    id_vendedor: 2,
    nombre: "Suministros del Sur",
    reputacion: 4.2,
    descripcion: "Proveedor local de garrafas",
    direccion: "Calle Falsa 123, Pueblo",
  },
  {
    id_vendedor: 3,
    nombre: "Aguas del Centro",
    reputacion: 4.9,
    descripcion: "Empresa líder en distribución de agua",
    direccion: "Ruta Nacional 5, Km 45",
  },
];

export async function GET() {
  return NextResponse.json(vendorsMock, { status: 200 });
}
