"use client";

import { useState } from "react";
import {
  choferActivoMock,
  choferPendienteMock,
  vendorsMockeados,
  type ChoferOnboardingProfile,
} from "@/lib/mocks/chofer";

type State = "selection" | "waiting" | "active";

export default function OnboardingPage() {
  const [state, setState] = useState<State>("selection");
  const [choferProfile, setChoferProfile] = useState<ChoferOnboardingProfile | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nombre: "", telefono: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorName, setVendorName] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendor || !formData.nombre || !formData.telefono) return;

    setIsSubmitting(true);
    try {
      const vendor = vendorsMockeados.find((entry) => entry.id_vendedor === selectedVendor);

      const mockProfile: ChoferOnboardingProfile = {
        ...choferPendienteMock,
        nombre: formData.nombre,
        telefono: formData.telefono,
        idVendedor: selectedVendor,
      };

      setChoferProfile(mockProfile);
      setVendorName(vendor?.nombre ?? "Empresa seleccionada");
      setState("waiting");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: "#00AEEF" }}>
              Bienvenido, chofer
            </h1>
            <p className="text-gray-600 text-lg">
              Completa tu perfil de chofer para comenzar a trabajar
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Selecciona la empresa donde trabajarás
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {vendorsMockeados.map((vendor) => (
                    <div
                      key={vendor.id_vendedor}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVendor === vendor.id_vendedor
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={() => setSelectedVendor(vendor.id_vendedor)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="vendor"
                          checked={selectedVendor === vendor.id_vendedor}
                          onChange={() => setSelectedVendor(vendor.id_vendedor)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{vendor.nombre}</h3>
                          <p className="text-sm text-gray-600 mt-1">{vendor.descripcion}</p>
                          <p className="text-xs text-gray-500 mt-2">{vendor.direccion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedVendor || !formData.nombre || !formData.telefono}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isSubmitting ? "Creando perfil..." : "Crear perfil"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (state === "waiting" && choferProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 flex items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Solicitud en proceso</h1>
            <p className="text-xl text-gray-700 mb-2">Tu solicitud está siendo procesada por</p>
            <p className="text-2xl font-bold mb-6" style={{ color: "#00AEEF" }}>
              {vendorName}
            </p>
            <p className="text-gray-600 mb-6">Pronto se te asignará un vehículo.</p>

            <button
              type="button"
              onClick={() => {
                setChoferProfile({ ...choferActivoMock, nombre: choferProfile.nombre, telefono: choferProfile.telefono, idVendedor: choferProfile.idVendedor });
                setState("active");
                setVendorName(vendorName || "Distribuciones Norte");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Simular asignación de vehículo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "active" && choferProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{choferProfile.nombre}</h1>
            <p className="text-gray-600 mb-6">Empresa: {vendorName}</p>

            {choferProfile.vehiculo && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 mb-6 border-l-4 border-orange-500">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  🚛 Tu Vehículo
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Patente</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {choferProfile.vehiculo.patente}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {choferProfile.vehiculo.tipo}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Información de Contacto
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Teléfono:</span>
                  <span className="font-medium">{choferProfile.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium text-green-600">
                    {choferProfile.estado}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                ¡Estás listo para empezar!{" "}
                <a href="/dashboard/chofer" className="text-blue-600 font-semibold">
                  Ir al dashboard
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}