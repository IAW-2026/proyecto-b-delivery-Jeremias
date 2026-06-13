"use client";

import { useClerk } from "@clerk/nextjs";

export default function BlockedClient() {
  const { signOut } = useClerk();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-red-300">Acceso bloqueado</p>
        <h1 className="mt-3 text-3xl font-semibold">Tu cuenta fue bloqueada</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          No podés entrar a la aplicación ni usar sus accesos hasta que un administrador te desbloquee.
          Si pensás que esto es un error, contactá al administrador del sistema.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void signOut({ redirectUrl: "/signin" })}
            className="rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-400"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
