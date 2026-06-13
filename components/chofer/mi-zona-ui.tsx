"use client";

type Props = {
  chofer: {
    idZona: number | null;
    zona: string;
    estado: string;
  };
  cantidadPedidos: number;
};

export default function MiZonaUI({ chofer, cantidadPedidos }: Props) {
  const fechaFormato = new Date().toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm text-gray-500">{fechaFormato}</p>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Zona de Entrega</h2>

        {!chofer.idZona ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800">
              No tenés una zona asignada. Contactá al logistic_admin de tu empresa para que te asigne una.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-gray-500">Zona actual</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{chofer.zona}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-gray-500">Pedidos asignados</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{cantidadPedidos}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
