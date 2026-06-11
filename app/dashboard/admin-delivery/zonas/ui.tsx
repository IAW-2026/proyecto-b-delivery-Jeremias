"use client";

import LogisticAdminZonasUi from "../../logistic-admin/zonas/ui";
import type { LogisticAdminViewData } from "../../logistic-admin/data";

type Zona = LogisticAdminViewData["zonas"][number];
type ZonaFueraCatalogo = LogisticAdminViewData["zonasFueraCatalogo"][number];

type Props = {
  zonas: Zona[];
  zonasFueraCatalogo: ZonaFueraCatalogo[];
  searchQuery: string;
  page: number;
  totalPages: number;
  totalFilteredZonas: number;
  totalZonas: number;
  zonasConPedidos: number;
  zonasSinPedidos: number;
  totalPedidos: number;
  vendorNames: Record<number, string>;
  basePath?: string;
};

export default function AdminDeliveryZonasUi(props: Props) {
  return <LogisticAdminZonasUi {...props} vendorOptions={props.vendorNames} basePath={props.basePath ?? "/dashboard/admin-delivery"} />;
}
