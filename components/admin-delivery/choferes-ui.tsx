"use client";

import ChoferesManager from "@/components/logistic-admin/choferes-ui";
import type { LogisticAdminViewData } from "@/lib/logistic-admin/data";
import type { ChoferStatus } from "@/lib/logistic-admin/choferes-utils";

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
  return <ChoferesManager {...props} basePath={props.basePath ?? "/dashboard/admin-delivery"} />;
}
