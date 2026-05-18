"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function PerfilPage() {
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!isLoaded) return;
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhone((user as any)?.publicMetadata?.phone ?? "");
  }, [isLoaded, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");
      setStatus("saved");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Perfil</h2>
      <div className="max-w-md bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apellido</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md p-2"
            />
          </div>

          

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
              disabled={status === "saving"}
            >
              {status === "saving" ? "Guardando..." : "Guardar"}
            </button>
            {status === "saved" && <span className="text-green-600">Guardado.</span>}
            {status === "error" && <span className="text-red-600">Error al guardar.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
