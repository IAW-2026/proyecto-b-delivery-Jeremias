"use client";

import { adminButtonClass, adminCardClass, adminHeaderClass, adminPageShell } from "@/lib/logistic-admin/styles";
import { usePerfilController } from "@/lib/logistic-admin/perfil-controller";

type Props = {
  fallbackName?: string | null;
};

export default function PerfilPage({ fallbackName }: Props) {
  const controller = usePerfilController({ fallbackName });
  const { profile, form, isEditing, status, isLoading, handlers } = controller;
  const { handleChange, handleEditClick, handleCancelClick, handleSubmit } = handlers;

  if (isLoading) {
    return (
      <div className={adminPageShell}>
        <div className={adminCardClass}>
          <p className="p-6 text-sm text-slate-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const fullName = `${profile.nombre} ${profile.apellido}`.trim();

  return (
    <div className={adminPageShell}>
      <header className={adminHeaderClass}>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Panel logístico</p>
        <h1 className="text-3xl font-semibold" style={{ color: "#00AEEF" }}>
          Perfil - Admin Logístico
        </h1>
        <p className="text-sm text-slate-600">Actualizá tu información local sin mezclarla con la lógica de navegación o fetch.</p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 text-black font-semibold">{fullName || "Sin nombre"}</h2>
          <p className="text-sm text-slate-600">{profile.nombreEmpresa || "Empresa no informada"}</p>
        </div>
        {!isEditing ? (
          <button type="button" onClick={handleEditClick} className={adminButtonClass("edit")}>
            Modificar datos
          </button>
        ) : null}
      </div>

      <div className={`${adminCardClass} max-w-2xl p-6`}>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={form.nombre}
              onChange={(event) => handleChange("nombre", event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-slate-900 bg-white"
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Apellido</label>
            <input
              value={form.apellido}
              onChange={(event) => handleChange("apellido", event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-slate-900 bg-white"
              disabled={!isEditing}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(event) => handleChange("telefono", event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-slate-900 bg-white"
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre empresa</label>
            <input
              value={form.nombreEmpresa}
              onChange={(event) => handleChange("nombreEmpresa", event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-slate-900 bg-white"
              disabled={!isEditing}
            />
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <button type="submit" className={adminButtonClass("save")} disabled={status === "saving"}>
                {status === "saving" ? "Guardando..." : "Guardar"}
              </button>
            ) : null}
            {isEditing ? (
              <button type="button" onClick={handleCancelClick} className={adminButtonClass("cancel")}>
                Cancelar
              </button>
            ) : null}
            {status === "saved" ? <span className="text-green-600">Guardado.</span> : null}
            {status === "error" ? <span className="text-red-600">Error al guardar.</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
