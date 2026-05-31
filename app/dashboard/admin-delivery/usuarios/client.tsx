"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adminButtonClass, adminCardClass, adminStatCardClass } from "../../logistic-admin/styles";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";

const searchOptions = [
  { value: "nombre", label: "Nombre", placeholder: "Buscar por nombre" },
  { value: "email", label: "Correo", placeholder: "Buscar por correo" },
  { value: "clerkUserId", label: "ID de Clerk", placeholder: "Buscar por ID de Clerk" },
] as const;

type UserSearchBy = (typeof searchOptions)[number]["value"];
type UserFilter = "all" | "active" | "blocked" | "delivery" | "logistic_admin";

function isSearchBy(value: string | null): value is UserSearchBy {
  return typeof value === "string" && searchOptions.some((option) => option.value === value);
}

function isUserFilter(value: string | null): value is UserFilter {
  return value === "all" || value === "active" || value === "blocked" || value === "delivery" || value === "logistic_admin";
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildQueryHref(pathname: string, values: { query: string; searchBy: UserSearchBy; filter: UserFilter }) {
  const params = new URLSearchParams();
  const trimmedQuery = values.query.trim();

  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  }

  if (values.searchBy !== "nombre") {
    params.set("searchBy", values.searchBy);
  }

  if (values.filter !== "all") {
    params.set("filter", values.filter);
  }

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function roleLabel(role: string) {
  if (role === "blocked") return "Bloqueado";
  if (role === "admin_delivery") return "Admin delivery";
  if (role === "logistic_admin") return "Logistic admin";
  if (role === "delivery") return "Delivery";
  return role;
}

const editableRoles = ["delivery", "logistic_admin"] as const;

function normalizeStoredRole(role: string) {
  return role === "seller" ? "logistic_admin" : role;
}

function getDisplayRole(user: AdminDeliveryUserRow) {
  if (user.localRole && user.localRole !== "Sin rol") {
    return normalizeStoredRole(user.localRole);
  }

  return normalizeStoredRole(user.effectiveRole);
}

export default function AdminDeliveryUsersClient({ users }: { users: AdminDeliveryUserRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appliedQuery = searchParams.get("query") ?? "";
  const appliedSearchBy: UserSearchBy = isSearchBy(searchParams.get("searchBy")) ? (searchParams.get("searchBy") as UserSearchBy) : "nombre";
  const appliedFilter: UserFilter = isUserFilter(searchParams.get("filter")) ? (searchParams.get("filter") as UserFilter) : "all";

  const [queryInput, setQueryInput] = useState(appliedQuery);
  const [selectedSearchBy, setSelectedSearchBy] = useState<UserSearchBy>(appliedSearchBy);
  const [selectedFilter, setSelectedFilter] = useState<UserFilter>(appliedFilter);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>(() => {
    const initialDrafts: Record<string, string> = {};
    for (const user of users) {
      const normalizedRole = normalizeStoredRole(user.localRole);
      initialDrafts[user.clerkUserId] = editableRoles.includes(normalizedRole as (typeof editableRoles)[number]) ? normalizedRole : "delivery";
    }
    return initialDrafts;
  });

  const [blockReasons] = useState<Record<string, string>>(() => {
    const initialReasons: Record<string, string> = {};
    for (const user of users) {
      initialReasons[user.clerkUserId] = user.blockedReason ?? "";
    }
    return initialReasons;
  });

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(appliedQuery.trim());

    return users.filter((user) => {
      const searchCandidate =
        appliedSearchBy === "email"
          ? user.email
          : appliedSearchBy === "clerkUserId"
            ? user.clerkUserId
            : user.fullName;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        normalizeSearchValue(searchCandidate).includes(normalizedQuery);

      const matchesFilter =
        appliedFilter === "all" ||
        (appliedFilter === "active" && !user.isBlocked) ||
        (appliedFilter === "blocked" && user.isBlocked) ||
        (appliedFilter === "delivery" && normalizeStoredRole(user.localRole) === "delivery") ||
        (appliedFilter === "logistic_admin" && normalizeStoredRole(user.localRole) === "logistic_admin");

      return matchesQuery && matchesFilter;
    });
  }, [appliedFilter, appliedQuery, appliedSearchBy, users]);

  function updateUser(payload: Record<string, unknown>, successMessage: string, onSuccess?: () => void) {
    void (async () => {
      setPendingUserId(typeof payload.clerkUserId === "string" ? payload.clerkUserId : null);
      setMessage(null);

      try {
        const response = await fetch("/api/admin-delivery/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          setMessage(responsePayload?.error ?? "No se pudo actualizar el usuario.");
          return;
        }

        setMessage(successMessage);
        onSuccess?.();
        router.refresh();
      } catch {
        setMessage("No se pudo actualizar el usuario.");
      } finally {
        setPendingUserId(null);
      }
    })();
  }

  function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildQueryHref(pathname, { query: queryInput, searchBy: selectedSearchBy, filter: selectedFilter }));
  }

  function clearSearch() {
    setQueryInput("");
    router.push(buildQueryHref(pathname, { query: "", searchBy: selectedSearchBy, filter: selectedFilter }));
  }

  function updateQuickFilter(nextFilter: UserFilter) {
    setSelectedFilter(nextFilter);
    router.push(buildQueryHref(pathname, { query: appliedQuery, searchBy: appliedSearchBy, filter: nextFilter }));
  }

  function startRoleEdit(user: AdminDeliveryUserRow) {
    setEditingUserId(user.clerkUserId);
    if (!roleDrafts[user.clerkUserId]) {
      setRoleDrafts((current) => ({
        ...current,
        [user.clerkUserId]: editableRoles.includes(user.localRole as (typeof editableRoles)[number]) ? user.localRole : "delivery",
      }));
    }
  }

  function cancelRoleEdit(user: AdminDeliveryUserRow) {
    setRoleDrafts((current) => ({
      ...current,
      [user.clerkUserId]: editableRoles.includes(user.localRole as (typeof editableRoles)[number]) ? user.localRole : "delivery",
    }));
    setEditingUserId((current) => (current === user.clerkUserId ? null : current));
  }

  function saveRole(user: AdminDeliveryUserRow) {
    if (user.idVendedor === null) {
      setMessage("No se puede cambiar el rol local de este usuario porque no tiene idVendedor asociado.");
      return;
    }

    const nextRole = roleDrafts[user.clerkUserId] ?? "delivery";
    updateUser(
      {
        clerkUserId: user.clerkUserId,
        action: "set_local_role",
        role: nextRole,
        idVendedor: user.idVendedor,
      },
      `Rol local actualizado a ${roleLabel(nextRole)}.`,
      () => setEditingUserId(null)
    );
  }

  function toggleBlock(user: AdminDeliveryUserRow) {
    updateUser(
      {
        clerkUserId: user.clerkUserId,
        action: user.isBlocked ? "unblock_user" : "block_user",
        blockedReason: blockReasons[user.clerkUserId] ?? "",
      },
      user.isBlocked ? "Usuario desbloqueado." : "Usuario bloqueado."
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios cargados</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600">{users.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios bloqueados</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {users.filter((user) => user.isBlocked).length}
          </p>
        </div>
      </section>

      <section className={`${adminCardClass} p-5`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={runSearch} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Buscar por</span>
                <select
                  value={selectedSearchBy}
                  onChange={(event) => setSelectedSearchBy(event.currentTarget.value as UserSearchBy)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  {searchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  key={`admin-users-search-${selectedSearchBy}`}
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder={searchOptions.find((option) => option.value === selectedSearchBy)?.placeholder ?? "Buscar usuarios"}
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.currentTarget.value)}
                />
                <button type="submit" className={adminButtonClass("edit", "sm")}>Buscar</button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Filtrar por</span>
                <select
                  value={selectedFilter}
                  onChange={(event) => updateQuickFilter(event.currentTarget.value as UserFilter)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="blocked">Bloqueados</option>
                  <option value="delivery">Deliverys</option>
                  <option value="logistic_admin">Logistic admins</option>
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">Separá rápido por activos, bloqueados, deliverys o logistic admins.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {appliedQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpiar búsqueda
            </button>
          ) : null}
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</p> : null}
      </section>

      <section className={`${adminCardClass} overflow-hidden p-0`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Usuario</th>
                <th className="px-5 py-4 font-medium">Rol</th>
                <th className="px-5 py-4 font-medium">Estado</th>
                <th className="px-5 py-4 font-medium">Acciones</th>
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
                  const isEditingRole = editingUserId === user.clerkUserId;
                  const isNameAnId = user.fullName.toLowerCase().startsWith("user_");
                  const displayName = isNameAnId || !user.fullName.trim() ? (
                    <span className="font-normal italic text-slate-400">Usuario sin registrar</span>
                  ) : (
                    user.fullName
                  );

                  return (
                    <tr key={user.clerkUserId} className="align-top hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Renderiza el nombre real o el aviso de "Usuario sin registrar" */}
                          <p className="font-semibold text-slate-900">{displayName}</p>
                          <p className="text-xs text-slate-500">
                            {user.email && !user.email.toLowerCase().includes("sin correo") ? user.email : <span className="text-slate-400 italic">Sin correo</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isEditingRole ? (
                          <select
                            value={normalizeStoredRole(roleDrafts[user.clerkUserId] ?? "delivery")}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [user.clerkUserId]: normalizeStoredRole(event.target.value),
                              }))
                            }
                            disabled={isBusy}
                            className="w-full min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none disabled:opacity-60"
                          >
                            {editableRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                            {roleLabel(getDisplayRole(user))}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                              user.isBlocked
                                ? "bg-red-100 text-red-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {user.isBlocked ? "Bloqueado" : "Activo"}
                          </span>
                          {user.isBlocked && user.blockedReason ? (
                            <span className="text-xs text-red-600">Motivo: {user.blockedReason}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          {isEditingRole ? (
                            <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => saveRole(user)}
                                disabled={isBusy || user.idVendedor === null}
                                className={adminButtonClass("save", "sm")}
                              >
                                {isBusy ? "Guardando..." : "Guardar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelRoleEdit(user)}
                                disabled={isBusy}
                                className={adminButtonClass("cancel", "sm")}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => startRoleEdit(user)}
                                disabled={isBusy || user.idVendedor === null}
                                className={adminButtonClass("edit", "sm")}
                              >
                                Editar rol
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBlock(user)}
                                disabled={isBusy}
                                className={adminButtonClass(user.isBlocked ? "success" : "danger", "sm")}
                              >
                                {isBusy ? "Actualizando..." : user.isBlocked ? "Desbloquear" : "Bloquear"}
                              </button>
                            </div>
                          )}
                        </div>
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