"use client";

import VehiculosManager from "@/components/logistic-admin/vehiculos-ui";
import type { VehiculoStatus, Vehiculo } from "@/lib/logistic-admin/vehiculos-utils";

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
  return <VehiculosManager {...props} vendorOptions={props.vendorNames} basePath={props.basePath ?? "/dashboard/admin-delivery"} />;
}
