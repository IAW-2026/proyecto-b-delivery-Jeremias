"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminButtonClass, adminCardClass, adminStatCardClass } from "../../logistic-admin/styles";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";



function roleLabel(role: string) {
  if (role === "admin_delivery") return "Admin delivery";
  if (role === "logistic_admin") return "Logistic admin";
  if (role === "seller") return "Seller";
  if (role === "delivery") return "Delivery";
  return role;
}

export default function AdminDeliveryUsersClient({ users }: { users: AdminDeliveryUserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.clerkUserId.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        filter === "all" ||
        (filter === "global" && user.isGlobalAdmin) ||
        (filter === "local" && !user.isGlobalAdmin) ||
        (filter === "none" && user.effectiveRole === "delivery");

      return matchesQuery && matchesFilter;
    });
  }, [filter, query, users]);

  function toggleGlobalAccess(user: AdminDeliveryUserRow) {
    setPendingUserId(user.clerkUserId);
    setMessage(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin-delivery/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkUserId: user.clerkUserId,
            action: user.isGlobalAdmin ? "revoke_admin_delivery" : "promote_admin_delivery",
            nombre: user.fullName,
            telefono: user.adminPhone ?? null,
          }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          setMessage(payload?.error ?? "No se pudo actualizar el usuario.");
          return;
        }

        setMessage(user.isGlobalAdmin ? "Acceso global revocado." : "Acceso global otorgado.");
        router.refresh();
      } catch {
        setMessage("No se pudo actualizar el usuario.");
      } finally {
        setPendingUserId(null);
      }
    })();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios cargados</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600">{users.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Con acceso global</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            {users.filter((user) => user.isGlobalAdmin).length}
          </p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Sin overlay global</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">
            {users.filter((user) => !user.isGlobalAdmin).length}
          </p>
        </div>
      </section>

      <section className={`${adminCardClass} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtro de usuarios</h2>
            <p className="text-sm text-slate-500">Buscá por nombre, correo o id de Clerk.</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              className="min-w-[260px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="Buscar usuario"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="global">Con acceso global</option>
              <option value="local">Solo rol base</option>
              <option value="none">Sin rol explícito</option>
            </select>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</p> : null}
      </section>

      <section className={`${adminCardClass} overflow-hidden p-0`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Usuario</th>
                <th className="px-5 py-4 font-medium">Rol visible</th>
                <th className="px-5 py-4 font-medium">Estado local</th>
                <th className="px-5 py-4 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={4}>
                    No encontramos usuarios con ese filtro.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isBusy = pendingUserId === user.clerkUserId;
                  
                  // Validación: Si el nombre viene como "user_XXXX", mostramos que está sin registrar
                  const isNameAnId = user.fullName.toLowerCase().startsWith("user_");
                  const displayName = isNameAnId || !user.fullName.trim() 
                    ? <span className="text-slate-400 font-normal italic">Usuario sin registrar</span>
                    : user.fullName;

                  return (
                    <tr key={user.clerkUserId} className="align-top hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Renderiza el nombre real o el aviso de "Usuario sin registrar" */}
                          <p className="font-semibold text-slate-900">{displayName}</p>
                          <p className="text-xs text-slate-500">
                            {user.email && !user.email.toLowerCase().includes("sin correo") ? user.email : <span className="text-slate-400 italic">Sin correo</span>}
                          </p>
                          {/* SE ELIMINÓ LA LÍNEA QUE MOSTRABA EL ID (user.clerkUserId) */}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                          {roleLabel(user.effectiveRole)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                              user.isGlobalAdmin ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.isGlobalAdmin ? "Acceso global" : "Sin acceso global"}
                          </span>
                          <span className="text-xs text-slate-500">Rol base: {roleLabel(user.localRole)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleGlobalAccess(user)}
                          disabled={isBusy}
                          className={`${adminButtonClass(user.isGlobalAdmin ? "warning" : "save")} min-w-[180px] justify-center disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isBusy
                            ? "Actualizando..."
                            : user.isGlobalAdmin
                              ? "Quitar acceso global"
                              : "Otorgar acceso global"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}