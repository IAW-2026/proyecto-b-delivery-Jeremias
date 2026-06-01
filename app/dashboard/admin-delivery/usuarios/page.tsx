import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";
import { getVendors } from "@/lib/vendors";
import AdminDeliveryUsersUi from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryUsersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const [data, vendors] = await Promise.all([
    getAdminDeliveryUsersData({ excludeClerkUserId: userId }),
    getVendors(),
  ]);

  return (
    <div className="space-y-6">
      {data.clerkUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Clerk no respondió con el listado completo</p>
          <p className="text-sm">
            Mostramos lo que está disponible localmente. Reintentá cuando la API de Clerk vuelva a estar accesible.
          </p>
        </div>
      ) : null}

      <AdminDeliveryUsersUi users={data.users} vendors={vendors} />
    </div>
  );
}