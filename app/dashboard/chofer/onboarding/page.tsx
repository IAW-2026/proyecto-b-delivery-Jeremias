"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMockVendors, type Vendor as MockVendor } from "@/lib/mocks/ARCHIVED/vendors";

type State = "selection" | "waiting";

type ChoferRequest = {
  id: number;
  nombre: string;
  telefono: string;
  idVendedor: number;
  vendorName: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
};

type VendorOption = {
  id: number;
  nombre: string;
  descripcion?: string;
  direccion?: string;
};

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [state, setState] = useState<State>("selection");
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nombre: "", telefono: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorName, setVendorName] = useState<string>("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<ChoferRequest | null>(null);
  const [inactiveReason, setInactiveReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRequestStatus() {
      try {
        const response = await fetch("/api/chofer-requests", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { request?: ChoferRequest | null };
        if (cancelled || !payload.request) return;

        setExistingRequest(payload.request);
        setVendorName(payload.request.vendorName);

        if (payload.request.status === "pending") {
          setState("waiting");
        }

        if (payload.request.status === "approved") {
          router.replace("/dashboard/chofer");
        }

        if (payload.request.status === "rejected") {
          setErrorMessage(
            payload.request.reason
              ? `Tu solicitud fue rechazada: ${payload.request.reason}`
              : "Tu solicitud fue rechazada. Podés enviar una nueva solicitud."
          );
        }
      } catch {
        // If status lookup fails, keep the selection flow available.
      }
    }

    void loadRequestStatus();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function loadLocalProfile() {
      try {
        const resp = await fetch("/api/chofer/profile", { cache: "no-store" });
        if (resp.ok) {
          const payload = (await resp.json().catch(() => null)) as { chofer?: { nombre?: string | null; estado?: string; idVendedor?: number | null } } | null;
          const choferData = payload?.chofer;
          if (!cancelled && choferData) {
            if (choferData.estado && choferData.estado !== "activo") {
              if (choferData.estado === "inactivo") {
                setInactiveReason("Tu cuenta fue desactivada. Contactá al administrador.");
                return;
              }
              if (choferData.estado === "rechazado") {
                setErrorMessage("Tu solicitud fue rechazada.");
                return;
              }
            }
            const localName = choferData.nombre?.trim();
            if (localName) {
              setFormData((current) => (current.nombre ? current : { ...current, nombre: localName }));
              return;
            }
          }
        }
      } catch {
        // ignore and fallback to clerk
      }

      const fullName = user?.fullName?.trim() ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
      if (fullName && !cancelled) {
        setFormData((current) => (current.nombre ? current : { ...current, nombre: fullName }));
      }
    }

    void loadLocalProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.fullName, user?.firstName, user?.lastName]);

  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      try {
        const response = await fetch("/api/vendors", { cache: "no-store" });
        if (!response.ok) throw new Error("vendors response not ok");

        const payload = (await response.json()) as { vendors?: VendorOption[] };
        if (!cancelled && Array.isArray(payload.vendors) && payload.vendors.length > 0) {
          setVendors(payload.vendors);
        }
      } catch {
        if (!cancelled) {
          setVendors(getMockVendors().map((vendor: MockVendor) => ({
            id: vendor.id,
            nombre: vendor.nombre,
            descripcion: vendor.descripcion,
            direccion: vendor.direccion,
          })));
        }
      }
    }

    void loadVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendor || !formData.nombre || !formData.telefono) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const vendor = vendors.find((entry) => entry.id === selectedVendor);

      const response = await fetch("/api/chofer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          idVendedor: selectedVendor,
          vendorName: vendor?.nombre ?? "",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo enviar la solicitud");
      }

      const request = (await response.json()) as { request?: ChoferRequest };
      setExistingRequest(request.request ?? null);
      setVendorName(vendor?.nombre ?? request.request?.vendorName ?? "Empresa seleccionada");
      setState("waiting");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isWaiting = state === "waiting";

  if (inactiveReason) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-8 flex items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Cuenta desactivada</h1>
            <p className="text-gray-600">{inactiveReason}</p>
          </div>
        </div>
      </div>
    );
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Selecciona la empresa donde trabajarás
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVendor === vendor.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={() => setSelectedVendor(vendor.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="vendor"
                          checked={selectedVendor === vendor.id}
                          onChange={() => setSelectedVendor(vendor.id)}
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
                disabled={isSubmitting || !selectedVendor || !formData.nombre || !formData.telefono || isWaiting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isSubmitting ? "Creando perfil..." : "Crear perfil"}
              </button>

              {existingRequest?.status === "pending" ? (
                <p className="text-sm text-amber-700">Ya tenés una solicitud pendiente para {existingRequest.vendorName}.</p>
              ) : null}

              {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 flex items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Solicitud enviada</h1>
            <p className="text-xl text-gray-700 mb-2">Tu solicitud está siendo revisada por</p>
            <p className="text-2xl font-bold mb-6" style={{ color: "#00AEEF" }}>
              {vendorName}
            </p>
            <p className="text-gray-600 mb-2">
              Cuando el logistic_admin la apruebe, vas a quedar asociado a esa empresa y vas a ver tus datos operativos.
            </p>
            <p className="text-gray-500 text-sm">Por ahora solo queda esperar la aprobación.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}