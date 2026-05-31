import Link from "next/link";
import { getLogisticAdminData } from "../logistic-admin/data";
import { adminButtonClass, adminCardClass, adminPageShell, adminStatCardClass } from "../logistic-admin/styles";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";

function formatOrderStatus(status: string) {
  if (status === "ready") return "Listo";
  if (status === "en_camino") return "En camino";
  if (status === "entregado") return "Entregado";
  if (status === "cancelado") return "Cancelado";
  if (status === "revision") return "Revisión";
  return status;
}

export default async function AdminDeliveryPage() {
  const [data, globalUsersData] = await Promise.all([getLogisticAdminData(), getAdminDeliveryUsersData()]);
  const activeDrivers = data.choferes.filter((driver) => driver.estado === "activo");
  const workingVehicles = data.vehiculos.filter((vehicle) => vehicle.estado !== "pausado");
  const readyOrders = data.orders.filter((order) => order.status === "ready" && order.assignedToChoferId === null);
  const recentOrders = [...data.orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 5);
  const mostActiveZones = [...data.zonas].sort((left, right) => {
    const leftScore = left.pedidosTotales + left.pedidosAsignados + left.bidonesTotales;
    const rightScore = right.pedidosTotales + right.pedidosAsignados + right.bidonesTotales;
    return rightScore - leftScore;
  }).slice(0, 5);
  const zonesWithoutCatalog = [...data.zonasFueraCatalogo].sort((left, right) => {
    const leftScore = left.pedidosTotales + left.pedidosAsignados + left.bidonesTotales;
    const rightScore = right.pedidosTotales + right.pedidosAsignados + right.bidonesTotales;
    return rightScore - leftScore;
  });

  return (
    <div className={`mx-auto max-w-7xl ${adminPageShell}`}>
      <section className={`${adminCardClass} overflow-hidden border-slate-200 bg-slate-950 p-0 text-white shadow-lg`}>
        <div className="relative overflow-hidden px-6 py-7 sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_35%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.38em] text-sky-300">Admin delivery</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Centro de mando global</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Vista global para supervisar pedidos, choferes, vehículos y zonas de toda la plataforma sin depender de un vendedor.
                Esta pantalla ya usa la misma base operativa, pero con foco superior y alcance total.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              <p className="font-medium text-white">Usuario</p>
              <p>{data.userName}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-sky-200">Acceso global activo</p>
              <p className="mt-1 text-xs text-slate-300">{globalUsersData.globalAdminCount} usuarios con acceso global</p>
            </div>
          </div>
        </div>
      </section>

      {data.databaseUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">No se pudo conectar a la base de datos</p>
          <p className="text-sm">
            Mostramos una vista limitada temporalmente. Reintentá en unos segundos mientras se restablece la conexión.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Pedidos listos sin asignar</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600">{readyOrders.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Choferes activos</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{activeDrivers.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Vehículos operativos</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">{workingVehicles.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Zonas con catálogo</p>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{data.zonas.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios con acceso global</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{globalUsersData.globalAdminCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className={`${adminCardClass} p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Alcance total</h2>
                <p className="text-sm text-slate-500">
                  Este panel gobierna toda la operación: lectura operativa completa y control de accesos globales.
                </p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Modo superusuario
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Cobertura operativa</p>
                <p className="mt-1 text-base font-semibold text-slate-900">Pedidos, choferes, vehículos y zonas</p>
                <p className="mt-2 text-sm text-slate-600">Todo lo que ve `logistic_admin`, más la capa global de usuarios y permisos.</p>
              </article>
              <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm uppercase tracking-[0.18em] text-sky-500">Control global</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{globalUsersData.users.length} usuarios operativos visibles</p>
                <p className="mt-2 text-sm text-slate-600">La tabla global excluye tu propio usuario para evitar auto-revocación.</p>
              </article>
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Cobertura global</h2>
                <p className="text-sm text-slate-500">
                  La plataforma completa se ve desde aquí. No hay filtrado por vendedor en esta vista.
                </p>
              </div>
              <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Nivel superior
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {mostActiveZones.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2">
                  No hay zonas registradas todavía.
                </p>
              ) : (
                mostActiveZones.map((zone) => (
                  <article key={zone.idZona} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Zona</p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">{zone.zona}</h3>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                        {zone.rutasAsignadas} rutas
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-slate-600">
                      <div className="rounded-xl bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-sky-600">{zone.pedidosTotales}</p>
                        <p>Total</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-amber-600">{zone.pedidosAsignados}</p>
                        <p>Asignados</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center">
                        <p className="text-lg font-semibold text-emerald-600">{zone.bidonesTotales}</p>
                        <p>Bidones</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Actividad reciente global</h2>
                <p className="text-sm text-slate-500">Lectura compacta de los últimos movimientos de toda la operación.</p>
              </div>
              <Link href="/dashboard/admin-delivery/pedidos" className="text-sm font-medium text-sky-600 hover:text-sky-700">
                Abrir pedidos
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">Pedido #{order.idPedido}</h3>
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                            {formatOrderStatus(order.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{order.direccion}</p>
                        <p className="text-sm text-slate-500">
                          {order.cliente} · {order.cantBidones} bidones · {order.zona}
                        </p>
                      </div>
                      <p className="text-sm text-slate-400">{new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${adminCardClass} p-6`}>
            <h2 className="text-xl font-semibold text-slate-900">Accesos rápidos</h2>
            <p className="mt-2 text-sm text-slate-500">
              Navegación directa a las zonas operativas que también ve este rol.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <Link href="/dashboard/admin-delivery/usuarios" className={adminButtonClass("save")}>
                Usuarios globales
              </Link>
              <Link href="/dashboard/admin-delivery/pedidos" className={adminButtonClass("save")}>
                Pedidos globales
              </Link>
              <Link href="/dashboard/admin-delivery/choferes" className={adminButtonClass("edit")}>
                Choferes
              </Link>
              <Link href="/dashboard/admin-delivery/vehiculos" className={adminButtonClass("warning")}>
                Vehículos
              </Link>
              <Link href="/dashboard/admin-delivery/zonas" className={adminButtonClass("success")}>
                Zonas
              </Link>
              <Link href="/dashboard/admin-delivery/perfil" className={adminButtonClass("save")}>
                Perfil global
              </Link>
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <h2 className="text-xl font-semibold text-slate-900">Zonas fuera de catálogo</h2>
            <p className="mt-2 text-sm text-slate-500">
              Alertas de zonas detectadas que todavía no viven en el catálogo oficial.
            </p>

            <div className="mt-4 space-y-3">
              {zonesWithoutCatalog.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No se detectaron zonas fuera del catálogo.
                </p>
              ) : (
                zonesWithoutCatalog.map((zone) => (
                  <article key={zone.zona} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-amber-900">{zone.zona}</h3>
                        <p className="text-sm text-amber-800">{zone.pedidosTotales} pedidos · {zone.pedidosAsignados} asignados</p>
                      </div>
                      <p className="text-sm font-semibold text-amber-900">{zone.bidonesTotales} bidones</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`${adminCardClass} p-6`}>
            <h2 className="text-xl font-semibold text-slate-900">Reglas activas</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-slate-50 p-3">Clerk solo se usa para lectura de usuario y rol.</li>
              <li className="rounded-2xl bg-slate-50 p-3">La normalización de delivery y logistic_admin sigue habilitada.</li>
              <li className="rounded-2xl bg-slate-50 p-3">admin_delivery domina sobre cualquier otro rol.</li>
              <li className="rounded-2xl bg-slate-50 p-3">No se permite revocar tu propio acceso global desde esta pantalla.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}