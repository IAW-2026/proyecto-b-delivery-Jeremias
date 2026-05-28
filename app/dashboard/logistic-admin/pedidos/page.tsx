import { getLogisticAdminData } from "../data";
import LogisticAdminPedidosUi from "./ui";

export default async function LogisticAdminPedidosPage() {
  const data = await getLogisticAdminData();
  const ordersKey = data.orders.map((order) => `${order.idPedido}:${order.status}:${order.assignedToChoferId ?? "none"}`).join("|");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Logistic admin</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Pedidos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vista completa de pedidos para asignación, seguimiento operativo y control de estado.
        </p>
      </header>

      <LogisticAdminPedidosUi key={ordersKey} orders={data.orders} choferes={data.choferes} />
    </div>
  );
}
