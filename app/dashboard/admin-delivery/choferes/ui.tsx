"use client";

import LogisticAdminChoferesUi from "../../logistic-admin/choferes/ui";
import type { LogisticAdminViewData } from "../../logistic-admin/data";
import type { ChoferStatus } from "./utils";

type Zona = LogisticAdminViewData["zonasCatalogo"][number];
type Vehiculo = LogisticAdminViewData["vehiculos"][number];
type Chofer = LogisticAdminViewData["choferes"][number];

type Props = {
  choferes: Chofer[];
  zonas: Zona[];
  vehiculos: Vehiculo[];
  searchQuery: string;
  statusFilter: "todos" | ChoferStatus;
  page: number;
  totalPages: number;
  totalFilteredChoferes: number;
  totalChoferes: number;
  activeCount: number;
  withZoneCount: number;
  withoutZoneCount: number;
  basePath?: string;
  vendorNames: Record<number, string>;
};

export default function AdminDeliveryChoferesUi(props: Props) {
  return <LogisticAdminChoferesUi {...props} basePath={props.basePath ?? "/dashboard/admin-delivery"} />;
}
