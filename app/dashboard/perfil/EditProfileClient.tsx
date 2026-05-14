"use client";
import { useState} from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function EditProfileClient() {
  const { user} = useUser();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  function handleEdit() {setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phoneNumbers?.[0]?.phoneNumber || (user?.publicMetadata?.phone as string) || "");
    setEditing(true);
}

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!res.ok) throw new Error("Error");
      setEditing(false);
      router.refresh();
      alert("Perfil actualizado");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
        <button   
            className="rounded bg-blue-500 text-white px-3 py-1"
            onClick={editing ? () => setEditing(false) : handleEdit}
        >
            {editing ? "Cancelar" : "Editar perfil"}    
        </button>

      {editing && (
        <form onSubmit={onSave} className="mt-3 space-y-3">
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Apellido</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm">Teléfono</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              className="rounded bg-green-600 text-white px-3 py-1"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}