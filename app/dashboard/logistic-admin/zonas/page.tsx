import { getLogisticAdminData } from "../data";
import ZonasManager from "./ui";

export default async function LogisticAdminZonasPage() {
  const data = await getLogisticAdminData();

  return <ZonasManager zonas={data.zonas} zonasFueraCatalogo={data.zonasFueraCatalogo} />;
}
