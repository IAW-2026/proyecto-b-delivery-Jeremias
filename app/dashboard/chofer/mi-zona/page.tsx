import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getChoferStatus } from "@/lib/choferStatus";
import MiZonaUI from "./ui";

export default async function MiZonaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/signin");

  const data = await getChoferStatus(userId);

  return (
    <MiZonaUI
      chofer={data.chofer}
      cantidadPedidos={data.cantidadPedidos}
    />
  );
}
