import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getChoferStatus } from "@/lib/choferStatus";
import MiVehiculoUI from "@/components/chofer/mi-vehiculo-ui";

export default async function MiVehiculoPage() {
  const { userId } = await auth();
  if (!userId) redirect("/signin");

  const data = await getChoferStatus(userId);
  const vehiculo = data.vehiculo;
  const totalBidones = data.totalBidones;
  const capacidad = vehiculo?.capacidadBidones ?? 0;
  const bidonesDisponibles = capacidad > 0 ? Math.max(0, capacidad - totalBidones) : 0;
  const porcentajeUsado = capacidad > 0 ? Math.min(100, Math.round((totalBidones / capacidad) * 100)) : 0;

  return <MiVehiculoUI vehiculo={vehiculo} totalBidones={totalBidones} bidonesDisponibles={bidonesDisponibles} porcentajeUsado={porcentajeUsado} capacidad={capacidad} />;
}
