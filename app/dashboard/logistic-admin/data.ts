import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrders, type LogisticOrder, type OrderStatus } from "@/lib/logisticAdminStore";
import { ADMIN_DELIVERY_ROLE, resolveRolesFromClaims, syncClerkRoleMetadata, revokeAllClerkSessions } from "@/lib/roles";
import { normalizeOrderStatus, normalizeZonaName } from "@/lib/shared/utils";

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
  vehiculo?: VehiculoRecord | null;
  zona: {
    idZona: number;
    nombre: string;
  } | null;
};

type ZonaResumen = {
  idZona: number;
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
  choferesAsignados: number;
};

type ZonaFueraCatalogo = {
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
  choferesAsignados: number;
};

type ZonaCatalogoRecord = {
  idZona: number;
  nombre: string;
};

type ZonaSelectorRecord = {
  idZona: number;
  nombre: string;
};

function isArchivedChofer(chofer: ChoferRecord) {
  return chofer.estado === "inactivo" && chofer.disponible === false && chofer.idVehiculo === null && chofer.idZona === null;
}

type UserRoleRecord = {
  idVendedor: number;
  nombreEmpresa: string | null;
};

type PedidoDbRecord = {
  idPedido: number;
  estado: string;
  direccion: string;
  cliente: string;
  telefono: string | null;
  cantBidones: number;
  zona: string;
  idChoferAsignado: number | null;
  assignedAt: Date | null;
  updatedAt: Date | null;
  motivoRevision: string | null;
  choferAsignado?: { nombre: string | null } | null;
};

export type LogisticAdminViewData = {
  userName: string;
  companyId: number | null;
  inferredVendor?: VendorHint;
  choferes: ChoferRecord[];
  vehiculos: VehiculoRecord[];
  orders: LogisticOrder[];
  zonas: ZonaResumen[];
  zonasFueraCatalogo: ZonaFueraCatalogo[];
  zonasCatalogo: ZonaSelectorRecord[];
  companyName: string | null;
  databaseUnavailable: boolean;
};

function isPrismaTimeoutError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const prismaCode = "code" in error ? (error as { code?: unknown }).code : undefined;
  const message = "message" in error ? (error as { message?: unknown }).message : undefined;
  const errorName = "name" in error ? (error as { name?: unknown }).name : undefined;

  const normalizedMessage = typeof message === "string" ? message.toLowerCase() : "";
  const normalizedName = typeof errorName === "string" ? errorName.toLowerCase() : "";

  const connectionFailureHints = [
    "etimedout",
    "connection terminated",
    "timeout acquiring a connection",
    "connection timeout",
    "timed out while trying to connect",
    "pool is full",
    "too many clients",
  ];

  return (
    prismaCode === "ETIMEDOUT" ||
    normalizedName.includes("timeout") ||
    connectionFailureHints.some((hint) => normalizedMessage.includes(hint))
  );
}

function mapDbPedidoToLogisticOrder(pedido: PedidoDbRecord): LogisticOrder {
  const validStatuses = ["assigned", "asignado", "ready", "cancelled", "cancelado", "delivered", "entregado", "en_camino", "revision"] as const;
  if (!validStatuses.includes(pedido.estado as never)) {
    console.warn(`Unknown pedido.estado "${pedido.estado}" for pedido #${pedido.idPedido}, mapping to "ready"`);
  }

  const status: OrderStatus =
    pedido.estado === "assigned" || pedido.estado === "asignado" || pedido.estado === "ready"
      ? "ready"
      : pedido.estado === "cancelled" || pedido.estado === "cancelado"
      ? "cancelado"
      : pedido.estado === "delivered" || pedido.estado === "entregado"
      ? "entregado"
      : pedido.estado === "en_camino"
      ? "en_camino"
      : pedido.estado === "revision"
      ? "revision"
      : "ready";

  return {
    idPedido: pedido.idPedido,
    estado: status,
    direccion: pedido.direccion,
    cliente: pedido.cliente,
    telefono: pedido.telefono ?? undefined,
    cantBidones: pedido.cantBidones,
    zona: pedido.zona,
    motivoRevision: pedido.motivoRevision ?? null,
    assignedToChoferId: pedido.idChoferAsignado,
    assignedToChoferName: pedido.choferAsignado?.nombre ?? null,
    status,
    updatedAt: (pedido.updatedAt ?? pedido.assignedAt ?? new Date()).toISOString(),
  };
}

async function seedPedidosFromStoreIfEmpty() {
  const count = await prisma.pedido.count();
  if (count > 0) return;

  const storeOrders = getOrders();
  if (storeOrders.length === 0) return;

  await prisma.pedido.createMany({
    data: storeOrders.map((order) => ({
      idPedido: order.idPedido,
      estado: order.status,
      direccion: order.direccion,
      cliente: order.cliente,
      telefono: order.telefono ?? null,
      cantBidones: order.cantBidones,
      zona: order.zona,
          motivoRevision: order.motivoRevision ?? null,
      idChoferAsignado: order.assignedToChoferId,
      assignedAt: order.assignedToChoferId ? new Date(order.updatedAt) : null,
      updatedAt: new Date(order.updatedAt),
    })),
    skipDuplicates: true,
  });
}

async function safeCurrentUser() {
  try {
    return await currentUser();
  } catch (error) {
    console.error("Clerk currentUser failed in logistic admin data:", error);
    return null;
  }
}

function buildZonasResumen(orders: LogisticOrder[], zonasCatalogo: ZonaCatalogoRecord[], choferes: ChoferRecord[]) {
  const ordersByZone = new Map<
    string,
    {
      zona: string;
      pedidosTotales: number;
      pedidosAsignados: number;
      pedidosReady: number;
      pedidosCancelados: number;
      bidonesTotales: number;
    }
  >();

  const choferesByZone = new Map<string, number>();

  for (const chofer of choferes) {
    if (chofer.estado !== "activo" || chofer.idZona === null || !chofer.zona) {
      continue;
    }

    const key = normalizeZonaName(chofer.zona.nombre);
    choferesByZone.set(key, (choferesByZone.get(key) ?? 0) + 1);
  }

  for (const order of orders) {
    const zoneName = order.zona?.trim() || "Sin zona";
    const key = normalizeZonaName(zoneName);
    const current =
      ordersByZone.get(key) ??
      {
        zona: zoneName,
        pedidosTotales: 0,
        pedidosAsignados: 0,
        pedidosReady: 0,
        pedidosCancelados: 0,
        bidonesTotales: 0,
        choferesAsignados: 0,
      };

    const normalizedStatus = normalizeOrderStatus(order.status);
    const isFinalized = normalizedStatus === "cancelado" || normalizedStatus === "entregado";

    if (!isFinalized) {
      current.pedidosTotales += 1;
      current.bidonesTotales += order.cantBidones;
    }

    if (!isFinalized && order.assignedToChoferId !== null) current.pedidosAsignados += 1;
    if (!isFinalized && normalizedStatus === "ready" && order.assignedToChoferId === null) current.pedidosReady += 1;
    if (normalizedStatus === "cancelado") current.pedidosCancelados += 1;

    ordersByZone.set(key, current);
  }

  const zonas = zonasCatalogo.map((zona) => {
    const key = normalizeZonaName(zona.nombre);
    const stats = ordersByZone.get(key);

    if (stats) {
      ordersByZone.delete(key);
    }

    const resumen: ZonaResumen = {
      idZona: zona.idZona,
      zona: zona.nombre,
      pedidosTotales: stats?.pedidosTotales ?? 0,
      pedidosAsignados: stats?.pedidosAsignados ?? 0,
      pedidosReady: stats?.pedidosReady ?? 0,
      pedidosCancelados: stats?.pedidosCancelados ?? 0,
      bidonesTotales: stats?.bidonesTotales ?? 0,
      choferesAsignados: choferesByZone.get(key) ?? 0,
    };

    return resumen;
  });

  const zonasFueraCatalogo = [...ordersByZone.values()].map((zona) => {
    const resumen: ZonaFueraCatalogo = {
      zona: zona.zona,
      pedidosTotales: zona.pedidosTotales,
      pedidosAsignados: zona.pedidosAsignados,
      pedidosReady: zona.pedidosReady,
      pedidosCancelados: zona.pedidosCancelados,
      bidonesTotales: zona.bidonesTotales,
      choferesAsignados: choferesByZone.get(normalizeZonaName(zona.zona)) ?? 0,
    };

    return resumen;
  });

  return {
    zonas,
    zonasFueraCatalogo,
  };
}

export async function getLogisticAdminData(): Promise<LogisticAdminViewData> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  let databaseUnavailable = false;

  async function safePrismaQuery<T>(query: () => Promise<T>, fallback: T, context: string): Promise<T> {
    try {
      return await query();
    } catch (error) {
      if (isPrismaTimeoutError(error)) {
        databaseUnavailable = true;
        console.error(`Prisma timeout in ${context}:`, error);
        return fallback;
      }

      throw error;
    }
  }

  const userRole = await safePrismaQuery<UserRoleRecord | null>(
    () =>
      prisma.userRole.findUnique({
        where: { clerkUserId: userId },
        select: { idVendedor: true, nombreEmpresa: true },
      }),
    null,
    "userRole.findUnique"
  );

  const user = await safeCurrentUser();
  const adminProfile = await safePrismaQuery<{ nombre: string } | null>(
    async () => {
      const logisticAdminProfile = await prisma.logisticAdmin.findUnique({ where: { clerkUserId: userId }, select: { nombre: true } });
      if (logisticAdminProfile) {
        return logisticAdminProfile;
      }

      return prisma.adminDelivery.findUnique({ where: { clerkUserId: userId }, select: { nombre: true } });
    },
    null,
    "logisticAdmin.findUnique"
  );
  const { sessionClaims } = await auth();
  const roles = resolveRolesFromClaims(sessionClaims);
  const canAccess = roles.includes(ADMIN_DELIVERY_ROLE) || roles.includes("logistic_admin");
  // Prefer local DB name (logisticAdmin.nombre) when available; fall back to Clerk name
  const localName = adminProfile?.nombre?.trim();
  const userName = (localName && localName.length > 0
    ? localName
    : `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()) || "Usuario";

  if (!canAccess) {
    redirect("/dashboard");
  }

  let inferredVendorId: number | null = null;
  let inferredVendorName: string | null = null;

  const isGlobalAdmin = roles.includes(ADMIN_DELIVERY_ROLE);

  if (!userRole && userId && !isGlobalAdmin) {
    try {
      const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const resp = await fetch(`${base}/api/vendors?userId=${userId}`, { cache: "no-store" });
      if (resp.ok) {
        const data = (await resp.json()) as Array<{ id_vendedor?: number; nombre?: string }>;
        if (Array.isArray(data) && data.length > 0) {
          inferredVendorId = data[0].id_vendedor ?? null;
          inferredVendorName = data[0].nombre ?? null;
        }
      }
    } catch (err) {
      console.error("Error resolving vendor from external service:", err);
    }
  }

  if (inferredVendorId && userId && !isGlobalAdmin) {
    try {
      const synced = await syncClerkRoleMetadata(userId, "logistic_admin");
      console.debug("syncClerkRoleMetadata inferred result", userId, synced);
      const revoked = await revokeAllClerkSessions(userId).catch(() => false);
      console.debug("revokeAllClerkSessions inferred result", userId, revoked);

      await prisma.userRole.create({
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

  const idVendedorToQuery = isGlobalAdmin ? null : userRole?.idVendedor ?? inferredVendorId;

  const zonasCatalogo = await safePrismaQuery<ZonaCatalogoRecord[]>(
    () =>
      prisma.zona.findMany({
        orderBy: { nombre: "asc" },
      }),
    [],
    "zona.findMany"
  );

  let choferes: ChoferRecord[] = [];
  let vehiculos: VehiculoRecord[] = [];

  if (isGlobalAdmin) {
    choferes = await safePrismaQuery(
      () =>
        prisma.chofer.findMany({
          include: { vehiculo: true, zona: true },
          orderBy: { idChofer: "asc" },
        }),
      [],
      "chofer.findMany(global)"
    );

    vehiculos = await safePrismaQuery(
      () =>
        prisma.vehiculo.findMany({
          orderBy: { idVehiculo: "asc" },
        }),
      [],
      "vehiculo.findMany(global)"
    );
  } else if (idVendedorToQuery) {
    // Run sequentially to avoid opening many DB connections at once
    choferes = await safePrismaQuery(
      () =>
        prisma.chofer.findMany({
          where: { idVendedor: idVendedorToQuery },
          include: { vehiculo: true, zona: true },
          orderBy: { idChofer: "asc" },
        }),
      [],
      "chofer.findMany"
    );

    vehiculos = await safePrismaQuery(
      () =>
        prisma.vehiculo.findMany({
          where: { idVendedor: idVendedorToQuery },
          orderBy: { idVehiculo: "asc" },
        }),
      [],
      "vehiculo.findMany"
    );
  }

  const visibleChoferes = (choferes as ChoferRecord[]).filter((chofer) => !isArchivedChofer(chofer));

  const assignedByVehicle = new Map<number, { idChofer: number; nombre: string }>();
  for (const chofer of visibleChoferes) {
    if (chofer.idVehiculo !== null) {
      assignedByVehicle.set(chofer.idVehiculo, { idChofer: chofer.idChofer, nombre: chofer.nombre });
    }
  }

  const vehiculosWithAssignment = (vehiculos as VehiculoRecord[]).map((vehiculo) => {
    const assigned = assignedByVehicle.get(vehiculo.idVehiculo);
    return {
      ...vehiculo,
      assignedToChoferId: assigned?.idChofer ?? null,
      assignedToChoferName: assigned?.nombre ?? null,
    };
  });

  await safePrismaQuery(() => seedPedidosFromStoreIfEmpty(), undefined, "pedido.seedFromStoreIfEmpty");

  const orders = await safePrismaQuery(
    () =>
      prisma.pedido.findMany({
        include: { choferAsignado: true },
        orderBy: { idPedido: "asc" },
      }).then((pedidos: PedidoDbRecord[]) => pedidos.map(mapDbPedidoToLogisticOrder)),
    getOrders(),
    "pedido.findMany"
  );
  // Mark orders whose assigned chofer is archived (exists in DB but not in visibleChoferes)
  const ordersWithArchivedFlag = orders.map((o) => ({
    ...o,
    assignedChoferArchived: o.assignedToChoferId !== null && !visibleChoferes.some((c) => c.idChofer === o.assignedToChoferId),
  }));
  const zonasResumen = buildZonasResumen(orders, zonasCatalogo, visibleChoferes);

  return {
    userName,
    companyId: userRole?.idVendedor ?? inferredVendorId ?? null,
    companyName: userRole?.nombreEmpresa ?? inferredVendorName ?? null,
    inferredVendor:
      userRole?.idVendedor || inferredVendorId
        ? undefined
        : inferredVendorId
        ? { id: inferredVendorId, nombre: inferredVendorName ?? undefined }
        : undefined,
    choferes: visibleChoferes,
    vehiculos: vehiculosWithAssignment,
    orders: ordersWithArchivedFlag,
    zonas: zonasResumen.zonas,
    zonasFueraCatalogo: zonasResumen.zonasFueraCatalogo,
    zonasCatalogo: zonasCatalogo.map((zona) => ({ idZona: zona.idZona, nombre: zona.nombre })),
    databaseUnavailable,
  };
}
