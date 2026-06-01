import { prisma } from "@/lib/prisma";

type ChoferPedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "en_camino" | "entregado" | "cancelado" | "revision";
  motivoRevision?: string | null;
};

type ChoferVehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
};

export type { ChoferPedido };

export type ChoferStatus = {
  chofer: {
    idChofer: number;
    nombre: string;
    telefono: string;
    estado: string;
    idVehiculo: number | null;
    idZona: number | null;
    zona: string;
    vehiculo: ChoferVehiculo | null;
  };
  vehiculo: ChoferVehiculo | null;
  pedidos: ChoferPedido[];
  cantidadPedidos: number;
  totalBidones: number;
};

function mapStatusToChoferStatus(status: string): ChoferPedido["estado"] {
  if (status === "assigned" || status === "asignado" || status === "ready") return "ready";
  if (status === "en_camino") return "en_camino";
  if (status === "cancelled") return "cancelado";
  if (status === "cancelado") return "cancelado";
  if (status === "delivered") return "entregado";
  if (status === "entregado") return "entregado";
  if (status === "revision") return "revision";
  return "ready";
}

function getChoferZona(pedidos: ChoferPedido[]) {
  return pedidos[0]?.zona ?? "Sin zona asignada";
}

async function getClerkDisplayName(clerkUserId: string) {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY || process.env.CLERK_SECRET;
    if (!secretKey) return "Chofer nuevo";

    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return "Chofer nuevo";

    const user = await response.json();
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fullName || user.username || "Chofer nuevo";
  } catch {
    return "Chofer nuevo";
  }
}

export async function getChoferStatus(clerkUserId?: string | null): Promise<ChoferStatus> {
  const dbChofer = clerkUserId
    ? await prisma.chofer.findUnique({
        where: { clerkUserId },
        include: { vehiculo: true, zona: true },
      }).catch(() => null)
    : null;

  const displayName = clerkUserId ? await getClerkDisplayName(clerkUserId) : "Chofer nuevo";
  const choferId = dbChofer?.idChofer ?? 0;
  const assignedOrders: any[] = await prisma.pedido.findMany({ where: { idChoferAsignado: choferId } });

  const pedidos = assignedOrders.map((pedido) => ({
    idPedido: pedido.idPedido,
    cliente: pedido.cliente,
    direccion: pedido.direccion,
    telefono: pedido.telefono ?? "",
    cantBidones: pedido.cantBidones,
    zona: pedido.zona,
    estado: mapStatusToChoferStatus(pedido.estado),
    motivoRevision: pedido.motivoRevision ?? null,
  }));

  const totalBidones = pedidos.reduce((sum, pedido) => sum + pedido.cantBidones, 0);
  const dbVehiculo = dbChofer?.vehiculo
    ? {
        idVehiculo: dbChofer.vehiculo.idVehiculo,
        patente: dbChofer.vehiculo.patente,
        tipo: dbChofer.vehiculo.tipo,
        capacidadBidones: dbChofer.vehiculo.capacidadBidones,
        idVendedor: dbChofer.vehiculo.idVendedor,
      }
    : null;

  const effectiveVehiculo = dbVehiculo ?? null;
  const zonaNombre = dbChofer?.zona?.nombre ?? getChoferZona(pedidos);
  const zonaId = dbChofer?.zona?.idZona ?? 0;

  return {
    chofer: {
      idChofer: dbChofer?.idChofer ?? 0,
      nombre: dbChofer?.nombre ?? displayName,
      telefono: dbChofer?.telefono ?? "",
      estado: dbChofer?.estado ?? "pendiente",
      idVehiculo: dbChofer?.idVehiculo ?? null,
      idZona: zonaId,
      zona: zonaNombre,
      vehiculo: effectiveVehiculo,
    },
    vehiculo: effectiveVehiculo,
    pedidos,
    cantidadPedidos: pedidos.length,
    totalBidones,
  };
}