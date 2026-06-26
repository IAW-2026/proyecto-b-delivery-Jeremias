"use client";

import { useClerk } from "@clerk/nextjs";

export default function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/signin" })}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      Cerrar sesión
    </button>
  );
}
