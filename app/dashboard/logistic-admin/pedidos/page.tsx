import { getLogisticAdminData } from "../data";

function statusBadgeClass(status: string) {
  if (status === "assigned") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-700";
}

export default async function LogisticAdminPedidosPage() {
  const data = await getLogisticAdminData();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Logistic admin</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Pedidos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vista completa de pedidos para asignación y seguimiento operativo.
        </p>
      </header>

      {data.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          No hay pedidos cargados en este momento.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Bidones</th>
                <th className="px-4 py-3">Chofer</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.idPedido} className="border-t border-slate-100 text-sm text-slate-700">
                  <td className="px-4 py-3 font-medium">#{order.idPedido}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{order.cliente}</p>
                    <p className="text-xs text-slate-500">{order.direccion}</p>
                  </td>
                  <td className="px-4 py-3">{order.zona}</td>
                  <td className="px-4 py-3">{order.cantBidones}</td>
                  <td className="px-4 py-3">{order.assignedToChoferName ?? "Sin asignar"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
