import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims, syncClerkRoleMetadata, revokeAllClerkSessions } from "@/lib/roles";
import { normalizeOrderStatus, normalizeZonaName } from "@/lib/shared/utils";
import type { OrderStatus } from "@/lib/logisticAdminStore";
import { getMockVendors } from "@/lib/mocks/ARCHIVED/vendors";

type VendorHint = {
  id: number;
  nombre?: string;
};

type VehiculoRecord = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado: string;
  motivoPausa: string | null;
  assignedToChoferId?: number | null;
  assignedToChoferName?: string | null;
};

type ChoferRecord = {
  idChofer: number;
  nombre: string;
  telefono: string | null;
  estado: string;
  disponible: boolean;
  idVehiculo: number | null;
  idZona: number | null;
  idVendedor: number;
  zonaNombre: string;
  zona: { nombre: string } | null;
  vehiculoPatente: string | null;
  vehiculoTipo: string | null;
  vehiculo?: { patente: string; tipo: string; idVehiculo: number; capacidadBidones: number; idVendedor: number; estado?: string } | null;
  totalPedidos: number;
};

type ZonaRecord = {
  idZona: number;
  nombre: string;
  zona: string;
  empresas: string[];
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
  choferesAsignados: number;
};

type ZoneStatsEntry = {
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
};

type DashboardOrder = {
  idPedido: number;
  estado: string;
  direccion: string;
  cliente: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
  status: OrderStatus;
  assignedToChoferId: number | null;
  assignedToChoferName: string | null;
  updatedAt: string;
  idVendedor: number;
};

export type LogisticAdminViewData = {
  roles: string[];
  idVendedor: number | null;
  vendorName: string | null;
  userName: string;
  companyId: number | null;
  companyName: string | null;
  inferredVendor?: VendorHint;
  databaseUnavailable: boolean;
  dbError?: string;
  vendorNames: Record<number, string>;
  vehiculos: VehiculoRecord[];
  choferes: ChoferRecord[];
  zonas: ZonaRecord[];
  zonasCatalogo: ZonaRecord[];
  pedidos: DashboardOrder[];
  orders: DashboardOrder[];
  zonasFueraCatalogo: ZoneStatsEntry[];
};

type ZonaResumen = {
  idZona: number;
  nombre: string;
  zona: string;
  empresas: string[];
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
  choferesAsignados: number;
};

function buildZonasResumen(
  zonas: { idZona: number; nombre: string; empresas: { idVendedor: number }[]; choferes: { idChofer: number }[] }[],
  vendorMap: Map<number, string>,
  pedidosByZona: Map<string, { count: number; asignados: number; ready: number; cancelados: number; bidones: number }>
): ZonaResumen[] {
  return zonas.map((zona) => {
    const stats = pedidosByZona.get(normalizeZonaName(zona.nombre)) ?? { count: 0, asignados: 0, ready: 0, cancelados: 0, bidones: 0 };
    return {
      idZona: zona.idZona,
      nombre: zona.nombre,
      zona: zona.nombre,
      empresas: zona.empresas.map((e) => String(e.idVendedor)),
      pedidosTotales: stats.count,
      pedidosAsignados: stats.asignados,
      pedidosReady: stats.ready,
      pedidosCancelados: stats.cancelados,
      bidonesTotales: stats.bidones,
      choferesAsignados: zona.choferes.length,
    };
  });
}

export const getLogisticAdminData = cache(async function getLogisticAdminData(): Promise<LogisticAdminViewData> {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/signin");

  const roles = resolveRolesFromClaims(sessionClaims);
  const isGlobalAdmin = roles.includes(ADMIN_DELIVERY_ROLE);

  const userProfile = await prisma.userProfile.findUnique({
    where: { clerkUserId: userId },
    select: { idVendedor: true, nombreEmpresa: true, role: true },
  });

  const idVendedor = userProfile?.idVendedor ?? null;
  const vendorName = userProfile?.nombreEmpresa ?? null;

  let inferredVendorId: number | null = null;
  let inferredVendorName: string | null = null;

  if (!userProfile && userId && !isGlobalAdmin) {
    try {
      const mockVendors = getMockVendors();
      if (mockVendors.length > 0) {
        inferredVendorId = mockVendors[0].id;
        inferredVendorName = mockVendors[0].nombre ?? null;
      }
    } catch (err) {
      console.error("Error resolving vendor from mock data:", err);
    }
  }

  if (inferredVendorId && userId && !isGlobalAdmin) {
    try {
      const synced = await syncClerkRoleMetadata(userId, "logistic_admin");
      console.debug("syncClerkRoleMetadata inferred result", userId, synced);
      const revoked = await revokeAllClerkSessions(userId).catch(() => false);
      console.debug("revokeAllClerkSessions inferred result", userId, revoked);

      await prisma.userProfile.create({
        data: {
          clerkUserId: userId,
          idVendedor: inferredVendorId,
          role: "logistic_admin",
        },
      });
    } catch (err) {
      console.debug("Could not persist inferred userRole:", err);
    }
  }

  const idVendedorToQuery = isGlobalAdmin ? null : userProfile?.idVendedor ?? inferredVendorId;

  const zoneEmpresaFilter = idVendedorToQuery !== null
    ? { empresas: { some: { idVendedor: idVendedorToQuery } } }
    : {};

  const vendorFilter = idVendedorToQuery !== null ? { idVendedor: idVendedorToQuery } : {};
  const vendorIdFilter = idVendedorToQuery !== null ? idVendedorToQuery : undefined;

  const [dbVehiculos, dbChoferes, dbZonas, dbPedidos] = await Promise.all([
    prisma.vehiculo.findMany({
      where: { ...vendorFilter },
      select: {
        idVehiculo: true,
        patente: true,
        tipo: true,
        capacidadBidones: true,
        idVendedor: true,
        estado: true,
        motivoPausa: true,
        choferes: { select: { idChofer: true, nombre: true }, take: 1 },
      },
      orderBy: { idVehiculo: "asc" },
    }),
    prisma.chofer.findMany({
      where: { ...vendorFilter },
      include: {
        vehiculo: { select: { idVehiculo: true, patente: true, tipo: true, capacidadBidones: true, idVendedor: true, estado: true } },
        zona: { select: { nombre: true } },
        _count: { select: { pedidosAsignados: { where: { estado: { notIn: ["entregado", "delivered", "cancelado", "cancelled"] } } } } },
      },
      orderBy: { idChofer: "desc" },
    }),
    prisma.zona.findMany({
      where: isGlobalAdmin ? {} : zoneEmpresaFilter,
      select: {
        idZona: true,
        nombre: true,
        empresas: { select: { idVendedor: true } },
        choferes: { select: { idChofer: true }, where: vendorIdFilter !== undefined ? { idVendedor: vendorIdFilter } : {} },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.pedido.findMany({
      where: { ...vendorFilter },
      include: { choferAsignado: { select: { idChofer: true, nombre: true } } },
      orderBy: { idPedido: "desc" },
    }),
  ]);

  const vendors = await prisma.userProfile.findMany({
    where: { role: { in: ["logistic_admin"] } },
    select: { idVendedor: true, nombreEmpresa: true },
    distinct: ["idVendedor"],
  });
  const vendorMap = new Map<number, string>();
  for (const v of vendors) {
    if (v.idVendedor) vendorMap.set(v.idVendedor, v.nombreEmpresa ?? `Empresa #${v.idVendedor}`);
  }

  const vehiculos: VehiculoRecord[] = dbVehiculos.map((v: { idVehiculo: number; patente: string; tipo: string; capacidadBidones: number; idVendedor: number; estado: string; motivoPausa: string | null; choferes: { idChofer: number; nombre: string }[] }) => ({
    idVehiculo: v.idVehiculo,
    patente: v.patente,
    tipo: v.tipo,
    capacidadBidones: v.capacidadBidones,
    idVendedor: v.idVendedor,
    estado: v.estado,
    motivoPausa: v.motivoPausa,
    assignedToChoferId: v.choferes[0]?.idChofer ?? null,
    assignedToChoferName: v.choferes[0]?.nombre ?? null,
  }));

  const choferes: ChoferRecord[] = dbChoferes.map((c: { idChofer: number; nombre: string; telefono: string | null; estado: string; disponible: boolean; idVehiculo: number | null; idZona: number | null; idVendedor: number; zona: { nombre: string } | null; vehiculo: { idVehiculo: number; patente: string; tipo: string; capacidadBidones: number; idVendedor: number; estado: string } | null; _count: { pedidosAsignados: number } }) => ({
    idChofer: c.idChofer,
    nombre: c.nombre,
    telefono: c.telefono,
    estado: c.estado,
    disponible: c.disponible,
    idVehiculo: c.idVehiculo,
    idZona: c.idZona,
    idVendedor: c.idVendedor,
    zonaNombre: c.zona?.nombre ?? "Sin zona",
    zona: c.zona ?? null,
    vehiculoPatente: c.vehiculo?.patente ?? null,
    vehiculoTipo: c.vehiculo?.tipo ?? null,
    vehiculo: c.vehiculo ?? null,
    totalPedidos: c._count.pedidosAsignados,
  }));

  const pedidos: DashboardOrder[] = dbPedidos.map((pedido: { idPedido: number; cliente: string; direccion: string; telefono: string | null; cantBidones: number; zona: string; estado: string; idChoferAsignado: number | null; choferAsignado: { idChofer: number; nombre: string } | null; updatedAt: Date | null; idVendedor: number }) => {
    const status = normalizeOrderStatus(pedido.estado) as OrderStatus;
    return {
      idPedido: pedido.idPedido,
      cliente: pedido.cliente,
      direccion: pedido.direccion,
      telefono: pedido.telefono ?? undefined,
      cantBidones: pedido.cantBidones,
      zona: normalizeZonaName(pedido.zona),
      estado: status,
      status,
      assignedToChoferId: pedido.idChoferAsignado ?? null,
      assignedToChoferName: pedido.choferAsignado?.nombre ?? null,
      updatedAt: pedido.updatedAt?.toISOString() ?? new Date().toISOString(),
      idVendedor: pedido.idVendedor,
    };
  });

  const pedidosByZona = new Map<string, { count: number; asignados: number; ready: number; cancelados: number; bidones: number }>();
  for (const order of pedidos) {
    const entry = pedidosByZona.get(order.zona) ?? { count: 0, asignados: 0, ready: 0, cancelados: 0, bidones: 0 };
    entry.count++;
    entry.bidones += order.cantBidones;
    if (order.assignedToChoferId !== null) entry.asignados++;
    if (order.status === "ready") entry.ready++;
    if (order.status === "cancelado") entry.cancelados++;
    pedidosByZona.set(order.zona, entry);
  }

  const zonas = buildZonasResumen(dbZonas, vendorMap, pedidosByZona);

  const zonaNames = new Set(zonas.map((z) => normalizeZonaName(z.nombre)));
  const ordersByZona = new Map<string, DashboardOrder[]>();
  for (const order of pedidos) {
    if (!zonaNames.has(order.zona)) {
      if (!ordersByZona.has(order.zona)) ordersByZona.set(order.zona, []);
      ordersByZona.get(order.zona)!.push(order);
    }
  }
  const zonasFueraCatalogo: ZoneStatsEntry[] = Array.from(ordersByZona.entries()).map(([zona, orders]) => ({
    zona,
    pedidosTotales: orders.length,
    pedidosAsignados: orders.filter((o) => o.assignedToChoferId !== null).length,
    pedidosReady: orders.filter((o) => o.status === "ready").length,
    pedidosCancelados: orders.filter((o) => o.status === "cancelado").length,
    bidonesTotales: orders.reduce((sum, o) => sum + o.cantBidones, 0),
  }));

  const inferredVendor: VendorHint | undefined = inferredVendorId ? { id: inferredVendorId, nombre: inferredVendorName ?? undefined } : undefined;
  const userName = userProfile?.nombre ?? vendorName ?? inferredVendorName ?? "Usuario";
  const companyId = idVendedorToQuery;
  const companyName = vendorName ?? inferredVendorName ?? null;
  const vendorNames: Record<number, string> = Object.fromEntries(vendorMap);

  if (!isGlobalAdmin && !inferredVendorId && !userProfile) {
    redirect(`/api/vendors/link`);
  }

  if (!isGlobalAdmin && (idVendedorToQuery === null || idVendedorToQuery === 0)) {
    redirect("/signin");
  }

  return {
    roles,
    idVendedor: idVendedorToQuery,
    vendorName: vendorName ?? inferredVendorName ?? "Sin empresa",
    userName,
    companyId,
    companyName,
    inferredVendor,
    databaseUnavailable: false,
    vendorNames,
    vehiculos,
    choferes,
    zonas,
    zonasCatalogo: zonas,
    pedidos,
    orders: pedidos,
    zonasFueraCatalogo,
  };
});
