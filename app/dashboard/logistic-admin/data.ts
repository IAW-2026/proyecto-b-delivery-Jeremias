import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  syncAutomaticZoneAssignments,
  type LogisticOrder,
} from "@/lib/logisticAdminStore";

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
  rutasAsignadas: number;
};

type ZonaFueraCatalogo = {
  zona: string;
  pedidosTotales: number;
  pedidosAsignados: number;
  pedidosReady: number;
  pedidosCancelados: number;
  bidonesTotales: number;
};

type ZonaCatalogoRecord = {
  idZona: number;
  nombre: string;
  _count: {
    ruta: number;
  };
};

type ZonaSelectorRecord = {
  idZona: number;
  nombre: string;
};

type UserRoleRecord = {
  idVendedor: number;
  role: string;
  nombreEmpresa: string | null;
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

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

async function safeCurrentUser() {
  try {
    return await currentUser();
  } catch (error) {
    console.error("Clerk currentUser failed in logistic admin data:", error);
    return null;
  }
}

function normalizeZonaName(value: string) {
  return value.trim().toLowerCase();
}

function buildZonasResumen(orders: LogisticOrder[], zonasCatalogo: ZonaCatalogoRecord[]) {
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
      };

    current.pedidosTotales += 1;
    current.bidonesTotales += order.cantBidones;

    if (order.status === "assigned") current.pedidosAsignados += 1;
    if (order.status === "ready") current.pedidosReady += 1;
    if (order.status === "cancelled") current.pedidosCancelados += 1;

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
      rutasAsignadas: zona._count.ruta,
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
        select: { idVendedor: true, role: true, nombreEmpresa: true },
      }),
    null,
    "userRole.findUnique"
  );

  const user = await safeCurrentUser();
  const clerkRoles = normalizeRoles(user?.publicMetadata.role);
  const dbRoles = normalizeRoles(userRole?.role);
  const canAccess =
    clerkRoles.includes("logistic_admin") ||
    clerkRoles.includes("seller") ||
    dbRoles.includes("logistic_admin") ||
    dbRoles.includes("seller");
  const userName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Usuario";

  if (!canAccess) {
    redirect("/dashboard");
  }

  let inferredVendorId: number | null = null;
  let inferredVendorName: string | null = null;

  if (!userRole && userId) {
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
      console.error("Error resolving vendor from seller service:", err);
    }
  }

  if (inferredVendorId && userId) {
    try {
        await prisma.userRole.create({
        data: {
          clerkUserId: userId,
          role: "logistic_admin",
          idVendedor: inferredVendorId,
        },
      });
    } catch (err) {
      console.debug("Could not persist inferred userRole:", err);
    }
  }

  const idVendedorToQuery = userRole?.idVendedor ?? inferredVendorId;

  const zonasCatalogo = await safePrismaQuery<ZonaCatalogoRecord[]>(
    () =>
      prisma.zona.findMany({
        orderBy: { nombre: "asc" },
        include: { _count: { select: { ruta: true } } },
      }),
    [],
    "zona.findMany"
  );

  const [choferes, vehiculos] = idVendedorToQuery
    ? await Promise.all([
        safePrismaQuery(
          () =>
            prisma.chofer.findMany({
              where: { idVendedor: idVendedorToQuery },
              include: { vehiculo: true, zona: true },
              orderBy: { idChofer: "asc" },
            }),
          [],
          "chofer.findMany"
        ),
        safePrismaQuery(
          () =>
            prisma.vehiculo.findMany({
              where: { idVendedor: idVendedorToQuery },
              orderBy: { idVehiculo: "asc" },
            }),
          [],
          "vehiculo.findMany"
        ),
      ])
    : [[], []];

  const orders = syncAutomaticZoneAssignments(choferes as ChoferRecord[]);
  const zonasResumen = buildZonasResumen(orders, zonasCatalogo);

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
    choferes,
    vehiculos,
    orders,
    zonas: zonasResumen.zonas,
    zonasFueraCatalogo: zonasResumen.zonasFueraCatalogo,
    zonasCatalogo: zonasCatalogo.map((zona) => ({ idZona: zona.idZona, nombre: zona.nombre })),
    databaseUnavailable,
  };
}
