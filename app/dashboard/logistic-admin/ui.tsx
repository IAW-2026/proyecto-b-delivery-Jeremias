'use client';

import { useRouter } from "next/navigation";

type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
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
  status: "ready" | "assigned" | "cancelled";
  assignedToChoferId: number | null;
  assignedToChoferName: string | null;
  updatedAt: string;
};

type Props = {
  userName: string;
  companyId: number | null;
  choferes: Chofer[];
  vehiculos: Vehiculo[];
  orders: Order[];
};

function roleBadgeClass(status: string) {
  switch (status) {
    case "assigned":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

export default function LogisticAdminBoard({ userName, companyId, choferes, vehiculos, orders }: Props) {
  const router = useRouter();

  async function runAction(payload: Record<string, string | number | null>) {
    await fetch("/api/logistic-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    router.refresh();
  }

  const pendingOrders = orders.filter((order) => order.status !== "cancelled");
  const activeOrders = orders.filter((order) => order.status === "assigned");
  const activeDrivers = choferes.filter((driver) => driver.estado === "activo");
  const pendingDrivers = choferes.filter((driver) => driver.estado === "pendiente");

  return (
    <div className="space-y-8">
      <section className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400">Logistic admin</p>
            <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
              Centro operativo
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {userName} administra pedidos, flota y alta de deliverys para la empresa.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-medium">Empresa vinculada</p>
            <p className="text-slate-500">{companyId !== null ? `Vendedor #${companyId}` : "Sin empresa asignada"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-slate-600">Pedidos activos</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">{pendingOrders.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-slate-600">Pedidos asignados</p>
          <p className="mt-2 text-3xl font-semibold text-green-600">{activeOrders.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-slate-600">Deliverys activos</p>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{activeDrivers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-slate-600">Vehículos disponibles</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">{vehiculos.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Pedidos</h2>
              <p className="text-sm text-slate-500">Asignar, desasignar o cancelar pedidos recibidos desde Seller.</p>
            </div>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Todavía no llegaron pedidos listos para operar.
              </p>
            ) : (
              orders.map((order) => (
                <article key={order.idPedido} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900">Pedido #{order.idPedido}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${roleBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {order.cliente} · {order.direccion} · {order.zona}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.cantBidones} bidones · {order.telefono || "sin teléfono"}
                      </p>
                      {order.assignedToChoferName ? (
                        <p className="mt-2 text-sm text-blue-700">
                          Asignado a {order.assignedToChoferName}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {choferes.slice(0, 4).map((chofer) => (
                        <button
                          key={`${order.idPedido}-${chofer.idChofer}`}
                          type="button"
                          onClick={() => runAction({ action: "assign_order", idPedido: order.idPedido, idChofer: chofer.idChofer })}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Asignar a {chofer.nombre}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => runAction({ action: "unassign_order", idPedido: order.idPedido })}
                        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Desasignar
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction({ action: "cancel_order", idPedido: order.idPedido })}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Deliverys de la empresa</h2>
            <p className="mt-1 text-sm text-slate-500">Aceptar deliverys, cambiar estado y revisar vehículo asignado.</p>

            <div className="mt-4 space-y-3">
              {choferes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Aún no hay deliverys asociados a esta empresa.
                </p>
              ) : (
                choferes.map((chofer) => (
                  <article key={chofer.idChofer} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{chofer.nombre}</h3>
                        <p className="text-sm text-slate-600">{chofer.telefono || "Sin teléfono"}</p>
                        <p className="mt-1 text-xs text-slate-500">Estado: {chofer.estado}</p>
                        <p className="text-xs text-slate-500">
                          Vehículo: {chofer.vehiculo?.patente || "sin asignar"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => runAction({ action: "accept_delivery", idChofer: chofer.idChofer })}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction({ action: "reject_delivery", idChofer: chofer.idChofer })}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Flota</h2>
            <p className="mt-1 text-sm text-slate-500">Asignar o desasignar vehículos a los deliverys.</p>

            <div className="mt-4 space-y-3">
              {vehiculos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No hay vehículos cargados para esta empresa.
                </p>
              ) : (
                vehiculos.map((vehiculo) => (
                  <article key={vehiculo.idVehiculo} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">{vehiculo.patente}</h3>
                    <p className="text-sm text-slate-600">{vehiculo.tipo}</p>
                    <p className="text-xs text-slate-500">Capacidad: {vehiculo.capacidadBidones} bidones</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {choferes.map((chofer) => (
                        <button
                          key={`${vehiculo.idVehiculo}-${chofer.idChofer}`}
                          type="button"
                          onClick={() => runAction({ action: "assign_vehicle", idChofer: chofer.idChofer, idVehiculo: vehiculo.idVehiculo })}
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Asignar a {chofer.nombre}
                        </button>
                      ))}
                      {choferes.map((chofer) => (
                        <button
                          key={`clear-${vehiculo.idVehiculo}-${chofer.idChofer}`}
                          type="button"
                          onClick={() => runAction({ action: "assign_vehicle", idChofer: chofer.idChofer, idVehiculo: null })}
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Quitar de {chofer.nombre}
                        </button>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Solicitudes de alta</h2>
            <p className="mt-1 text-sm text-slate-500">Deliverys pendientes de aprobación.</p>

            <div className="mt-4 space-y-3">
              {pendingDrivers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No hay solicitudes pendientes.
                </p>
              ) : (
                pendingDrivers.map((chofer) => (
                  <article key={chofer.idChofer} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">{chofer.nombre}</h3>
                    <p className="text-sm text-slate-600">{chofer.telefono || "Sin teléfono"}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => runAction({ action: "accept_delivery", idChofer: chofer.idChofer })}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction({ action: "reject_delivery", idChofer: chofer.idChofer })}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}