import LogisticAdminBoard from "./ui";
import { getLogisticAdminData } from "./data";

export default async function LogisticAdminPage() {
  const data = await getLogisticAdminData();

  return (
    <>
      <div style={{ background: "#fee", padding: 12, margin: 12, borderRadius: 8, fontSize: 13, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
        <strong>DEBUG:</strong> {JSON.stringify(data._debug, null, 2)}
      </div>
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