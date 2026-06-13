import LogisticAdminBoard from "@/components/logistic-admin/dashboard-ui";
import { getLogisticAdminData } from "@/lib/logistic-admin/data";

export default async function LogisticAdminPage() {
  const data = await getLogisticAdminData();

  return (
    <>
      <LogisticAdminBoard
        userName={data.userName}
        companyId={data.companyId}
        companyName={data.companyName}
        inferredVendor={data.inferredVendor}
        databaseUnavailable={data.databaseUnavailable}
        dbError={data.dbError}
        choferes={data.choferes}
        vehiculos={data.vehiculos}
        orders={data.orders}
        zonas={data.zonas}
        zonasFueraCatalogo={data.zonasFueraCatalogo}
      />
    </>
  );
}