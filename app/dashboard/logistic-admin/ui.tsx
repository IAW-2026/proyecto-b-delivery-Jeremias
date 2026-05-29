'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/logisticAdminStore";
import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell, adminStatCardClass } from "./styles";

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
  estado?: string;
};

type Chofer = {
  idChofer: number;
  nombre: string;
  telefono: string | null;
  estado: string;
  disponible: boolean;
  idVehiculo: number | null;
  vehiculo?: Vehiculo | null;
};

type Order = {
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
};

type ChoferRequest = {
  id: number;
  nombre: string;
  telefono: string;
  vendorName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Props = {
  userName: string;
  companyId: number | null;
  companyName: string | null;
  inferredVendor?: { id: number; nombre?: string } | undefined;
  databaseUnavailable: boolean;
  choferes: Chofer[];
  vehiculos: Vehiculo[];
  orders: Order[];
  zonas: Array<{ idZona: number; zona: string; pedidosTotales: number; pedidosAsignados: number; pedidosReady: number; pedidosCancelados: number; bidonesTotales: number; rutasAsignadas: number }>;
  zonasFueraCatalogo: Array<{ zona: string; pedidosTotales: number; pedidosAsignados: number; pedidosReady: number; pedidosCancelados: number; bidonesTotales: number }>;
};

function orderBadgeClass(status: string) {
  switch (status) {
    case "ready":
      return "bg-blue-100 text-blue-700";
    case "asignado":
      return "bg-violet-100 text-violet-700";
    case "en_camino":
      return "bg-amber-100 text-amber-700";
    case "entregado":
      return "bg-emerald-100 text-emerald-700";
    case "cancelado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

function driverBadgeClass(status: string) {
  switch (status) {
    case "activo":
      return "bg-emerald-100 text-emerald-700";
    case "rechazado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function formatStatus(status: OrderStatus) {
  if (status === "ready") return "Listo";
  if (status === "asignado") return "Asignado";
  if (status === "en_camino") return "En camino";
  if (status === "entregado") return "Entregado";
  if (status === "cancelado") return "Cancelado";
  if (status === "revision") return "Revisión";
  return status;
}

export default function LogisticAdminBoard({
  userName,
  companyId,
  companyName,
  inferredVendor,
  databaseUnavailable,
  choferes,
  vehiculos,
  orders,
  zonas,
  zonasFueraCatalogo,
}: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<ChoferRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const stats = useMemo(() => {
    const readyOrders = orders.filter((order) => order.status === "ready" && order.assignedToChoferId === null);
    const activeDrivers = choferes.filter((driver) => driver.estado === "activo");
    const functioningVehicles = vehiculos.filter((vehicle) => vehicle.estado !== "pausado");

    return {
      readyUnassignedOrders: readyOrders,
      activeDrivers,
      functioningVehicles,
      totalZones: zonas.length,
      zonesWithoutCatalog: zonasFueraCatalogo.length,
    };
  }, [choferes, orders, vehiculos, zonas.length, zonasFueraCatalogo.length]);

  const recentOrders = useMemo(
    () => [...orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 5),
    [orders]
  );

  const recentDrivers = useMemo(
    () => [...choferes].sort((left, right) => left.nombre.localeCompare(right.nombre)).slice(0, 4),
    [choferes]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch("/api/logistic-admin/chofer-requests", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { requests?: ChoferRequest[] };
        if (!cancelled) {
          setRequests(payload.requests ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoadingRequests(false);
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`mx-auto max-w-7xl ${adminPageShell}`}>
      {databaseUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">No se pudo conectar a la base de datos</p>
          <p className="text-sm">
            Mostramos una vista limitada temporalmente. Reintentá en unos segundos mientras se restablece la conexión.
          </p>
        </div>
      ) : null}

      {/* Banner: inferred vendor - allow confirm */}
      {companyId === null && inferredVendor ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-yellow-900">Empresa inferida: {inferredVendor.nombre ?? `#${inferredVendor.id}`}</p>
              <p className="text-sm text-yellow-800">¿Confirmar que esta es tu empresa? Se guardará la asociación para futuras sesiones.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/vendors/${inferredVendor.id}/link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  });
                  router.refresh();
                }}
                className={adminButtonClass("warning")}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section className={adminHeaderClass}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400">Panel logístico</p>
            <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
              Centro operativo
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              {userName} coordina pedidos, choferes, vehículos y zonas desde un solo panel de control.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-medium">Empresa vinculada</p>
            <p className="text-slate-500">{companyName || "Sin empresa asignada"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Pedidos sin chofer asignados</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">{stats.readyUnassignedOrders.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Choferes activos</p>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{stats.activeDrivers.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Vehículos funcionando</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.functioningVehicles.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className={`${adminCardClass} p-6`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Accesos rápidos</h2>
              <p className="text-sm text-slate-500">Entrá directo a las pantallas operativas.</p>
            </div>
            {stats.zonesWithoutCatalog > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {stats.zonesWithoutCatalog} zonas fuera de catálogo
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard/logistic-admin/pedidos" className={adminButtonClass("edit")}>
              Gestionar pedidos
            </Link>
            <Link href="/dashboard/logistic-admin/choferes" className={adminButtonClass("edit")}>
              Ver choferes
            </Link>
            <Link href="/dashboard/logistic-admin/zonas" className={adminButtonClass("edit")}>
              Administrar zonas
            </Link>
            <Link href="/dashboard/logistic-admin/vehiculos" className={adminButtonClass("edit")}>
              Revisar vehículos
            </Link>
          </div>
        </div>

        <div className="space-y-6">

          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Actividad reciente</h2>
                <p className="text-sm text-slate-500">Últimos pedidos y choferes para orientar la operación.</p>
              </div>
              <Link href="/dashboard/logistic-admin/pedidos" className="text-sm font-medium text-sky-600 hover:text-sky-700">
                Ver todo
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentOrders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Todavía no hay pedidos cargados.
                </p>
              ) : (
                recentOrders.map((order) => (
                  <article key={order.idPedido} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">Pedido #{order.idPedido}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${orderBadgeClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {order.cliente} · {order.zona}
                        </p>
                        <p className="text-xs text-slate-500">{order.direccion}</p>
                      </div>
                      <p className="text-xs text-slate-500">{order.assignedToChoferName ?? "Sin chofer asignado"}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Estado del equipo</h2>
                <p className="text-sm text-slate-500">Un vistazo rápido a choferes y su disponibilidad.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentDrivers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No hay choferes cargados.
                </p>
              ) : (
                recentDrivers.map((chofer) => (
                  <article key={chofer.idChofer} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{chofer.nombre}</h3>
                        <p className="text-sm text-slate-600">{chofer.telefono || "Sin teléfono"}</p>
                        <p className="mt-2 text-xs text-slate-500">Vehículo: {chofer.vehiculo?.patente || "sin asignar"}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${driverBadgeClass(chofer.estado)}`}>
                        {chofer.estado}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Solicitudes de chofer</h2>
                <p className="text-sm text-slate-500">Un resumen breve de las últimas solicitudes; el detalle completo está en la sección de choferes.</p>
              </div>
              <Link href="/dashboard/logistic-admin/choferes" className="text-sm font-medium text-sky-600 hover:text-sky-700">
                Gestionar en choferes
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loadingRequests ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Cargando solicitudes...
                </p>
              ) : requests.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No hay solicitudes pendientes.
                </p>
              ) : (
                requests.slice(0, 3).map((request) => (
                  <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{request.nombre}</h3>
                        <p className="text-sm text-slate-600">{request.telefono}</p>
                        <p className="mt-1 text-xs text-slate-500">Empresa: {request.vendorName}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Pendiente</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Resumen de zonas</h2>
                <p className="text-sm text-slate-500">Cobertura registrada y zonas que todavía no entraron al catálogo.</p>
              </div>
              <Link href="/dashboard/logistic-admin/zonas" className="text-sm font-medium text-sky-600 hover:text-sky-700">
                Abrir zonas
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {zonas.slice(0, 4).map((zona) => (
                <div key={zona.idZona} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">{zona.zona}</p>
                  <p className="mt-1 text-sm text-slate-600">Pedidos: {zona.pedidosTotales}</p>
                  <p className="text-sm text-slate-600">Rutas: {zona.rutasAsignadas}</p>
                </div>
              ))}
              {zonasFueraCatalogo.slice(0, 2).map((zona) => (
                <div key={zona.zona} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">{zona.zona}</p>
                  <p className="mt-1 text-sm text-amber-800">Pedidos detectados: {zona.pedidosTotales}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}