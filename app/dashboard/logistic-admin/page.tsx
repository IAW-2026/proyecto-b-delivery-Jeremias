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

  // If there's no UserRole in DB, try to resolve vendor via Seller service
  let inferredVendorId: number | null = null;
  let inferredVendorName: string | null = null;
  if (!userRole && user?.id) {
    try {
      const base = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const resp = await fetch(`${base}/api/vendors?userId=${user.id}`, { cache: "no-store" });
      if (resp.ok) {
        const data = (await resp.json()) as any[];
        if (Array.isArray(data) && data.length > 0) {
          inferredVendorId = data[0].id_vendedor ?? null;
          inferredVendorName = data[0].nombre ?? null;
        }
      }
    } catch (err) {
      console.error("Error resolving vendor from seller service:", err);
    }
  }

  // Persist inferred mapping to avoid repeated lookups
  if (inferredVendorId && user?.id) {
    try {
      await prisma.userRole.create({
        data: {
          clerkUserId: user.id,
          role: "logistic_admin",
          idVendedor: inferredVendorId,
        },
      });
    } catch (err) {
      // ignore errors (race/unique constraint), just log for debugging
      console.debug("Could not persist inferred userRole:", err);
    }
  }

  const idVendedorToQuery = userRole?.idVendedor ?? inferredVendorId;

  const choferes = idVendedorToQuery
    ? await prisma.chofer.findMany({
        where: { idVendedor: idVendedorToQuery },
        include: { vehiculo: true },
        orderBy: { idChofer: "asc" },
      })
    : [];

  const vehiculos = idVendedorToQuery
    ? await prisma.vehiculo.findMany({
        where: { idVendedor: idVendedorToQuery },
        orderBy: { idVehiculo: "asc" },
      })
    : [];

  const orders = getOrders();

  return (
    <ChoferLayout>
      <LogisticAdminBoard
        userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Usuario"}
        companyId={userRole?.idVendedor ?? inferredVendorId ?? null}
        inferredVendor={
          userRole?.idVendedor || inferredVendorId
            ? undefined
            : inferredVendorId
            ? { id: inferredVendorId, nombre: inferredVendorName ?? undefined }
            : undefined
        }
        choferes={choferes}
        vehiculos={vehiculos}
        orders={orders}
      />
    </ChoferLayout>
  );
}