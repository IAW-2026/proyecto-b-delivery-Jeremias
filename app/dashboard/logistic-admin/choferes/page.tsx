import { getLogisticAdminData } from "../data";
import ChoferesManager from "./ui";

export default async function LogisticAdminChoferesPage() {
  const data = await getLogisticAdminData();

  return <ChoferesManager choferes={data.choferes} zonas={data.zonasCatalogo} />;
}
