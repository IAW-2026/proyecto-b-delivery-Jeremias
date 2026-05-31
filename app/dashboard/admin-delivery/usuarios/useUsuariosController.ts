"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";
import { buildUsersQueryHref, editableRoles, filterUsers, getInitialRoleDraft, parseUsersFilters, roleLabel, type UserFilter, type UserSearchBy } from "./utils";

type UpdatePayload = Record<string, unknown>;

export function useUsuariosController(users: AdminDeliveryUserRow[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const appliedFilters = parseUsersFilters(searchParams);
  const { query: appliedQuery, searchBy: appliedSearchBy, filter: appliedFilter } = appliedFilters;

  const [queryInput, setQueryInput] = useState(appliedQuery);
  const [selectedSearchBy, setSelectedSearchBy] = useState<UserSearchBy>(appliedSearchBy);
  const [selectedFilter, setSelectedFilter] = useState<UserFilter>(appliedFilter);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>(() => {
    const initialDrafts: Record<string, string> = {};
    for (const user of users) {
      initialDrafts[user.clerkUserId] = getInitialRoleDraft(user);
    }
    return initialDrafts;
  });

  const blockReasons = useMemo(() => {
    const initialReasons: Record<string, string> = {};
    for (const user of users) {
      initialReasons[user.clerkUserId] = user.blockedReason ?? "";
    }
    return initialReasons;
  }, [users]);

  const filteredUsers = useMemo(
    () => filterUsers(users, { query: appliedQuery, searchBy: appliedSearchBy, filter: appliedFilter }),
    [users, appliedQuery, appliedSearchBy, appliedFilter]
  );

  const blockedUsersCount = useMemo(() => users.filter((user) => user.isBlocked).length, [users]);

  async function updateUser(payload: UpdatePayload, successMessage: string, onSuccess?: () => void) {
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
  }

  function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildUsersQueryHref(pathname, {
        query: queryInput,
        searchBy: selectedSearchBy,
        filter: selectedFilter,
      })
    );
  }

  function clearSearch() {
    setQueryInput("");
    router.push(
      buildUsersQueryHref(pathname, {
        query: "",
        searchBy: selectedSearchBy,
        filter: selectedFilter,
      })
    );
  }

  function updateQuickFilter(nextFilter: UserFilter) {
    setSelectedFilter(nextFilter);
    router.push(
      buildUsersQueryHref(pathname, {
        query: appliedQuery,
        searchBy: appliedSearchBy,
        filter: nextFilter,
      })
    );
  }

  function startRoleEdit(user: AdminDeliveryUserRow) {
    setEditingUserId(user.clerkUserId);

    if (!roleDrafts[user.clerkUserId]) {
      setRoleDrafts((current) => ({
        ...current,
        [user.clerkUserId]: getInitialRoleDraft(user),
      }));
    }
  }

  function cancelRoleEdit(user: AdminDeliveryUserRow) {
    setRoleDrafts((current) => ({
      ...current,
      [user.clerkUserId]: getInitialRoleDraft(user),
    }));

    setEditingUserId((current) => (current === user.clerkUserId ? null : current));
  }

  function updateRoleDraft(clerkUserId: string, role: string) {
    setRoleDrafts((current) => ({
      ...current,
      [clerkUserId]: editableRoles.includes(role as (typeof editableRoles)[number]) ? role : "delivery",
    }));
  }

  function saveRole(user: AdminDeliveryUserRow) {
    if (user.idVendedor === null) {
      setMessage("No se puede cambiar el rol local de este usuario porque no tiene idVendedor asociado.");
      return;
    }

    const nextRole = roleDrafts[user.clerkUserId] ?? "delivery";

    void updateUser(
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
    void updateUser(
      {
        clerkUserId: user.clerkUserId,
        action: user.isBlocked ? "unblock_user" : "block_user",
        blockedReason: blockReasons[user.clerkUserId] ?? "",
      },
      user.isBlocked ? "Usuario desbloqueado." : "Usuario bloqueado."
    );
  }

  return {
    users,
    filteredUsers,
    blockedUsersCount,
    appliedQuery,
    appliedSearchBy,
    appliedFilter,
    queryInput,
    selectedSearchBy,
    selectedFilter,
    pendingUserId,
    editingUserId,
    message,
    roleDrafts,
    setQueryInput,
    setSelectedSearchBy,
    handlers: {
      runSearch,
      clearSearch,
      updateQuickFilter,
      startRoleEdit,
      cancelRoleEdit,
      updateRoleDraft,
      saveRole,
      toggleBlock,
    },
  };
}
