import { getLogisticAdminData } from "../data";
import VehiculosManager from "./ui";

export default async function LogisticAdminVehiculosPage() {
  const data = await getLogisticAdminData();
  return <VehiculosManager vehiculos={data.vehiculos} choferes={data.choferes} />;
}
