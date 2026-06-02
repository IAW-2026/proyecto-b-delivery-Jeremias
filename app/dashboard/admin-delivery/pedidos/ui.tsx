"use client";

import LogisticAdminPedidosUi from "../../logistic-admin/pedidos/ui";
import type { LogisticOrder, OrderStatus } from "@/lib/logisticAdminStore";
import type { SearchBy } from "./utils";

type Chofer = {
  idChofer: number;
  nombre: string;
  idVehiculo: number | null;
  estado: string;
  zona: { nombre: string } | null;
  idVendedor: number;
};

type Props = {
  orders: LogisticOrder[];
  allFilteredOrders: LogisticOrder[];
  choferes: Chofer[];
  searchQuery: string;
  searchBy: SearchBy;
  assignmentFilter: "todos" | "sin_asignar";
  statusFilter: "todos" | OrderStatus;
  page: number;
  totalPages: number;
  totalFilteredOrders: number;
  basePath?: string;
  vendorNames: Record<number, string>;
};

export default function AdminDeliveryPedidosUi(props: Props) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel global</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Pedidos
        </h1>
        <p className="mt-2 text-sm text-slate-600">Vista completa de pedidos para asignacion, seguimiento operativo y control de estado.</p>
      </header>

      <LogisticAdminPedidosUi {...props} basePath={props.basePath ?? "/dashboard/admin-delivery"} />
    </div>
  );
}
