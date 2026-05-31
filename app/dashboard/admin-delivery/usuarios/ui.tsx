"use client";

import { adminButtonClass, adminCardClass, adminStatCardClass } from "../../logistic-admin/styles";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";
import { editableRoles, getDisplayRole, normalizeStoredRole, roleLabel, searchOptions, type UserFilter, type UserSearchBy } from "./utils";
import { useUsuariosController } from "./useUsuariosController";

type Props = {
  users: AdminDeliveryUserRow[];
};

export default function AdminDeliveryUsersUi({ users }: Props) {
  const controller = useUsuariosController(users);
  const {
    filteredUsers,
    blockedUsersCount,
    appliedQuery,
    queryInput,
    selectedSearchBy,
    selectedFilter,
    pendingUserId,
    editingUserId,
    message,
    roleDrafts,
    setQueryInput,
    setSelectedSearchBy,
    handlers,
  } = controller;

  const { runSearch, clearSearch, updateQuickFilter, startRoleEdit, cancelRoleEdit, updateRoleDraft, saveRole, toggleBlock } = handlers;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios cargados</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600">{users.length}</p>
        </div>
        <div className={adminStatCardClass}>
          <p className="text-sm text-slate-600">Usuarios bloqueados</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{blockedUsersCount}</p>
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
              <p className="text-xs leading-5 text-slate-500">Separa rapido por activos, bloqueados, deliverys o logistic admins.</p>
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
              Limpiar busqueda
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
                  const showRegisteredName = !isNameAnId && user.fullName.trim().length > 0;

                  return (
                    <tr key={user.clerkUserId} className="align-top transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-slate-900">
                            {showRegisteredName ? user.fullName : <span className="font-normal italic text-slate-400">Usuario sin registrar</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.email && !user.email.toLowerCase().includes("sin correo") ? user.email : <span className="italic text-slate-400">Sin correo</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isEditingRole ? (
                          <select
                            value={normalizeStoredRole(roleDrafts[user.clerkUserId] ?? "delivery")}
                            onChange={(event) => updateRoleDraft(user.clerkUserId, normalizeStoredRole(event.currentTarget.value))}
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
                              user.isBlocked ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {user.isBlocked ? "Bloqueado" : "Activo"}
                          </span>
                          {user.isBlocked && user.blockedReason ? <span className="text-xs text-red-600">Motivo: {user.blockedReason}</span> : null}
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
