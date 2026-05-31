import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminDeliveryUsersData } from "@/lib/adminDeliveryUsers";
import AdminDeliveryUsersClient from "./client";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryUsersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  const data = await getAdminDeliveryUsersData({ excludeClerkUserId: userId });  
  const blockedUsers = data.users.filter((user) => user.isBlocked).length;
  const editableUsers = data.users.filter((user) => !user.isBlocked).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Administración global</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold sm:text-4xl">Usuarios globales</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Este tablero lee usuarios desde Clerk y administra el overlay local de <span className="font-medium text-white">admin_delivery</span>,
              el bloqueo global y el rol local. No escribe roles en Clerk; la base de permisos queda centralizada en la tabla local.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            <p className="font-medium text-white">Estado</p>
            <p>{data.globalAdminCount} con acceso global</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-sky-200">{data.totalUsers} usuarios cargados</p>
            <p className="mt-1 text-xs text-slate-300">{blockedUsers} bloqueados · {editableUsers} editables</p>
          </div>
        </div>
      </section>

      {data.clerkUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Clerk no respondió con el listado completo</p>
          <p className="text-sm">
            Mostramos lo que está disponible localmente. Reintentá cuando la API de Clerk vuelva a estar accesible.
          </p>
        </div>
      ) : null}

      <AdminDeliveryUsersClient users={data.users} />
    </div>
  );
}