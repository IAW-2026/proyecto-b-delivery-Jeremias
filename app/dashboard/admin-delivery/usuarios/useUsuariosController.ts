"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";
import { buildUsersQueryHref, editableRoles, filterUsers, getInitialRoleDraft, parseUsersFilters, roleLabel, type UserFilter } from "./utils";
import type { Vendor } from "@/lib/vendors";
import * as actions from "@/lib/actions/admin-delivery";

export function useUsuariosController(users: AdminDeliveryUserRow[], vendors: Vendor[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const appliedFilters = parseUsersFilters(searchParams);
  const { query: appliedQuery, filter: appliedFilter } = appliedFilters;

  const [queryInput, setQueryInput] = useState(appliedQuery);
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
  const [vendorDrafts, setVendorDrafts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const user of users) {
      initial[user.clerkUserId] = user.idVendedor ?? 0;
    }
    return initial;
  });

  const blockReasons = useMemo(() => {
    const initialReasons: Record<string, string> = {};
    for (const user of users) {
      initialReasons[user.clerkUserId] = user.blockedReason ?? "";
    }
    return initialReasons;
  }, [users]);

  const filteredUsers = useMemo(
    () => filterUsers(users, { query: appliedQuery, filter: appliedFilter }),
    [users, appliedQuery, appliedFilter]
  );

  const blockedUsersCount = useMemo(() => users.filter((user) => user.isBlocked).length, [users]);

  async function updateUser(clerkUserId: string, action: () => Promise<void>, successMessage: string, onSuccess?: () => void) {
    setPendingUserId(clerkUserId);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      onSuccess?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo actualizar el usuario.");
    } finally {
      setPendingUserId(null);
    }
  }

  function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildUsersQueryHref(pathname, {
        query: queryInput,
        filter: selectedFilter,
      })
    );
  }

  function clearSearch() {
    setQueryInput("");
    router.push(
      buildUsersQueryHref(pathname, {
        query: "",
        filter: selectedFilter,
      })
    );
  }

  function updateQuickFilter(nextFilter: UserFilter) {
    setSelectedFilter(nextFilter);
    router.push(
      buildUsersQueryHref(pathname, {
        query: appliedQuery,
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

    setVendorDrafts((current) => ({
      ...current,
      [user.clerkUserId]: user.idVendedor ?? 0,
    }));
  }

  function cancelRoleEdit(user: AdminDeliveryUserRow) {
    setRoleDrafts((current) => ({
      ...current,
      [user.clerkUserId]: getInitialRoleDraft(user),
    }));

    setVendorDrafts((current) => ({
      ...current,
      [user.clerkUserId]: user.idVendedor ?? 0,
    }));

    setEditingUserId((current) => (current === user.clerkUserId ? null : current));
  }

  function updateRoleDraft(clerkUserId: string, role: string) {
    setRoleDrafts((current) => ({
      ...current,
      [clerkUserId]: editableRoles.includes(role as (typeof editableRoles)[number]) ? role : "delivery",
    }));
  }

  function updateVendorDraft(clerkUserId: string, vendorId: number) {
    setVendorDrafts((current) => ({
      ...current,
      [clerkUserId]: vendorId,
    }));
  }

  function saveRole(user: AdminDeliveryUserRow) {
    const nextRole = roleDrafts[user.clerkUserId] ?? "delivery";
    const selectedVendorId = vendorDrafts[user.clerkUserId] ?? 0;

    const selectedVendor = selectedVendorId > 0
      ? vendors.find((v) => v.id === selectedVendorId)
      : undefined;
    const nombreEmpresa = selectedVendor?.nombre ?? null;

    void updateUser(
      user.clerkUserId,
      () => actions.setLocalRole(user.clerkUserId, nextRole, selectedVendorId, nombreEmpresa),
      `Rol local actualizado a ${roleLabel(nextRole)}.${nombreEmpresa ? ` Empresa: ${nombreEmpresa}` : ""}`,
      () => setEditingUserId(null)
    );
  }

  function toggleBlock(user: AdminDeliveryUserRow) {
    if (user.isBlocked) {
      void updateUser(
        user.clerkUserId,
        () => actions.unblockUser(user.clerkUserId),
        "Usuario desbloqueado."
      );
    } else {
      void updateUser(
        user.clerkUserId,
        () => actions.blockUser(user.clerkUserId, blockReasons[user.clerkUserId] ?? ""),
        "Usuario bloqueado."
      );
    }
  }

  return {
    users,
    filteredUsers,
    blockedUsersCount,
    appliedQuery,
    appliedFilter,
    queryInput,
    selectedFilter,
    pendingUserId,
    editingUserId,
    message,
    roleDrafts,
    vendorDrafts,
    setQueryInput,
    handlers: {
      runSearch,
      clearSearch,
      updateQuickFilter,
      startRoleEdit,
      cancelRoleEdit,
      updateRoleDraft,
      updateVendorDraft,
      saveRole,
      toggleBlock,
    },
  };
}
