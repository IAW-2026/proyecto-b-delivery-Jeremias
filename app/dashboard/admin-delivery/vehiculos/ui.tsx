"use client";

import LogisticAdminVehiculosUi from "../../logistic-admin/vehiculos/ui";
import type { VehiculoStatus, Vehiculo } from "./utils";

type Props = {
  vehiculos: Vehiculo[];
  searchQuery: string;
  statusFilter: "todos" | VehiculoStatus;
  page: number;
  totalPages: number;
  totalFilteredVehiculos: number;
  totalVehiculos: number;
  activosCount: number;
  pausadosCount: number;
  basePath?: string;
  vendorNames: Record<number, string>;
};

export default function AdminDeliveryVehiculosUi(props: Props) {
  return <LogisticAdminVehiculosUi {...props} basePath={props.basePath ?? "/dashboard/admin-delivery"} />;
}
