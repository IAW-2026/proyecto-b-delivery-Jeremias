import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrders } from "@/lib/logisticAdminStore";
import LogisticAdminBoard from "./ui";
import ChoferLayout from "@/app/dashboard/chofer/layout";

function normalizeRoles(rawRole: unknown): string[] {
  if (Array.isArray(rawRole)) {
    return [...new Set(rawRole.filter((value): value is string => typeof value === "string"))];
  }

  if (typeof rawRole === "string") {
    return [rawRole];
  }

  return [];
}

export default async function LogisticAdminPage() {
  const user = await currentUser();
  const roles = normalizeRoles(user?.publicMetadata.role);

  if (!roles.includes("logistic_admin") && !roles.includes("seller")) {
    redirect("/dashboard");
  }

  const userRole = user?.id
    ? await prisma.userRole.findUnique({
        where: { clerkUserId: user.id },
        select: { idVendedor: true },
      })
    : null;

  const choferes = userRole?.idVendedor
    ? await prisma.chofer.findMany({
        where: { idVendedor: userRole.idVendedor },
        include: { vehiculo: true },
        orderBy: { idChofer: "asc" },
      })
    : [];

  const vehiculos = userRole?.idVendedor
    ? await prisma.vehiculo.findMany({
        where: { idVendedor: userRole.idVendedor },
        orderBy: { idVehiculo: "asc" },
      })
    : [];

  const orders = getOrders();

  return (
    <ChoferLayout>
      <LogisticAdminBoard
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Usuario"}
        companyId={userRole?.idVendedor ?? null}
        choferes={choferes}
        vehiculos={vehiculos}
        orders={orders}
      />
    </ChoferLayout>
  );
}