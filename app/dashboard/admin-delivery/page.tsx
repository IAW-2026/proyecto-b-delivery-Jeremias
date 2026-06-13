import Link from "next/link";
import { getLogisticAdminData } from "@/lib/logistic-admin/data";
import { adminCardClass, adminPageShell } from "@/lib/logistic-admin/styles";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";

export const dynamic = "force-dynamic";

function getUserEventTone(type: string) {
  if (type === "user_block") return "bg-rose-100 text-rose-700 border-rose-200";
  if (type === "user_role") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getUserEventLabel(type: string) {
  if (type === "user_block") return "Baneo";
  if (type === "user_role") return "Rol";
  return "Acción";
}

export default async function AdminDeliveryPage() {
  const [data, globalUsersData] = await Promise.all([getLogisticAdminData(), getAdminDeliveryUsersData()]);

  const activeDrivers = data.choferes.filter((driver) => driver.estado === "activo");
  const workingVehicles = data.vehiculos.filter((vehicle) => vehicle.estado !== "pausado");
  const readyOrders = data.orders.filter((order) => order.status === "ready" && order.assignedToChoferId === null);

  const zonesWithoutCatalog = [...data.zonasFueraCatalogo].sort((left, right) => {
    const leftScore = left.pedidosTotales + left.pedidosAsignados + left.bidonesTotales;
    const rightScore = right.pedidosTotales + right.pedidosAsignados + right.bidonesTotales;
    return rightScore - leftScore;
  });

  const usersArray = globalUsersData?.users || [];

  const userEvents = usersArray.flatMap((rawUser) => {
    const user = rawUser as typeof rawUser & {
      role?: string;
      roleChangedAt?: string | Date;
      isBlocked?: boolean;
      blockedReason?: string;
      blockedAt?: string | Date;
    };

    const events: Array<{
      id: string;
      type: "user_role" | "user_block";
      title: string;
      description: string;
      updatedAt: string | Date;
    }> = [];

    if (user.roleChangedAt) {
      events.push({
        id: `role-${user.clerkUserId}`,
        type: "user_role",
        title: `Rol actualizado a ${user.role ?? "desconocido"}`,
        description: `Usuario ${user.clerkUserId.slice(-6)}...`,
        updatedAt: user.roleChangedAt,
      });
    }

    if (user.isBlocked) {
      events.push({
        id: `block-${user.clerkUserId}`,
        type: "user_block",
        title: "Acceso bloqueado",
        description: user.blockedReason ?? "Revisión de seguridad",
        updatedAt: user.blockedAt ?? new Date(),
      });
    }

    return events;
  });

  const recentUserActivity = userEvents
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className={`mx-auto max-w-7xl ${adminPageShell}`}>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Inicio</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
            Vista general de la operación, con foco en accesos de usuarios y señales básicas para entrar rápido al trabajo del día.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Sistema operativo</span>
        </div>
      </header>

      {data.databaseUnavailable ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500"></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Conexión inestable con la base de datos</p>
              <p className="mt-1 text-sm text-amber-700">Mostrando datos almacenados en caché. Las métricas se actualizarán automáticamente al reconectar.</p>
              {data.dbError ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-amber-600 hover:text-amber-800">Ver error técnico</summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-amber-100 p-3 text-xs text-amber-900">{data.dbError}</pre>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pedidos en Cola", value: readyOrders.length, style: { color: "var(--primary)" } },
          { label: "Choferes Activos", value: activeDrivers.length, style: { color: "var(--success)" } },
          { label: "Flota Operativa", value: workingVehicles.length, style: { color: "var(--primary)" } },
          { label: "Zonas Cubiertas", value: data.zonas.length, style: { color: "var(--accent)" } },
        ].map((stat, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>{stat.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight" style={stat.style}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className={`${adminCardClass} flex h-full flex-col overflow-hidden bg-white shadow-sm`}>
            <div className="border-b border-slate-100 p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Historial reciente</h2>
                  <p className="text-sm text-slate-500">Últimas acciones sobre usuarios: cambios de rol y bloqueos.</p>
                </div>
                <Link href="/dashboard/admin-delivery/pedidos" className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  Abrir módulo
                </Link>
              </div>
            </div>

            <div className="flex-1 p-6">
              {recentUserActivity.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Aún no hay cambios recientes sobre usuarios.
                </div>
              ) : (
                <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-slate-200">
                  {recentUserActivity.map((item) => (
                    <article key={item.id} className="relative flex gap-4">
                      <div className={`relative mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full ring-4 ring-white ${item.type === "user_block" ? "bg-rose-100" : "bg-blue-100"}`}>
                        <div className={`h-2.5 w-2.5 rounded-full ${item.type === "user_block" ? "bg-rose-500" : "bg-blue-500"}`} />
                      </div>
                      <div className="flex-auto rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getUserEventTone(item.type)}`}>
                                {getUserEventLabel(item.type)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                          </div>
                          <time className="whitespace-nowrap text-xs font-medium text-slate-400">
                            {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${adminCardClass} bg-white shadow-sm`}>
            <div className="border-b border-slate-100 p-6 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Resumen corto</h2>
              <p className="text-sm text-slate-500">Indicadores mínimos para entrar sin ruido.</p>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Zonas sin catálogo</p>
                    <p className="text-xs text-slate-500">Pendientes de mapeo</p>
                  </div>
                  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold ${zonesWithoutCatalog.length > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {zonesWithoutCatalog.length}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pedidos listos</p>
                    <p className="text-xs text-slate-500">Sin chofer asignado</p>
                  </div>
                  <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-700">
                    {readyOrders.length}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Usuarios activos</p>
                    <p className="text-xs text-slate-500">Con datos localizados</p>
                  </div>
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
                    {usersArray.length}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>

      </section>
    </div>
  );
}