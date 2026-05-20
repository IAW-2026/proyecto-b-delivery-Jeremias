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

export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url);
    const userId = reqUrl.searchParams.get("userId");

    const sellerBase = process.env.SELLER_BASE_URL;
    if (sellerBase) {
      const sellerUrl = new URL("/api/vendors", sellerBase);
      if (userId) sellerUrl.searchParams.set("userId", userId);

      const headers: Record<string, string> = {};
      if (process.env.SELLER_SERVICE_KEY) {
        headers["Authorization"] = `Bearer ${process.env.SELLER_SERVICE_KEY}`;
      }

      const resp = await fetch(sellerUrl.toString(), { headers, cache: "no-store" });
      if (resp.ok) {
        const data = await resp.json();
        return NextResponse.json(data, { status: 200 });
      }
    }

    return NextResponse.json(vendorsMock, { status: 200 });
  } catch (err) {
    console.error("vendors GET error:", err);
    return NextResponse.json(vendorsMock, { status: 200 });
  }
}
