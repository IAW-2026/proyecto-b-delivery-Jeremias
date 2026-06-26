"use client";

type VehiculoData = {
  patente: string;
  tipo: string;
  capacidadBidones: number;
} | null;

type Props = {
  vehiculo: VehiculoData;
  totalBidones: number;
  bidonesDisponibles: number;
  porcentajeUsado: number;
  capacidad: number;
};

function getTipoLabel(tipo: string) {
  const map: Record<string, string> = {
    auto: "Auto",
    camioneta: "Camioneta",
    camion: "Camión",
    moto: "Moto",
    bicicleta: "Bicicleta",
    otro: "Otro",
  };
  return map[tipo.toLowerCase()] ?? tipo;
}

export default function MiVehiculoUI({ vehiculo, totalBidones, bidonesDisponibles, porcentajeUsado, capacidad }: Props) {
  return (
    <div>
      {!vehiculo ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Mi Vehículo</h2>
          <p className="text-gray-500">Aún no tenés un vehículo asignado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Mi Vehículo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Patente</p>
                <p className="font-medium text-gray-900">{vehiculo.patente}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium text-gray-900">{getTipoLabel(vehiculo.tipo)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Capacidad</p>
                <p className="font-medium text-gray-900">{vehiculo.capacidadBidones} bidones</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Estado de Carga</h2>
            <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${porcentajeUsado}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalBidones}</p>
                <p className="text-sm text-gray-500">En ruta</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{bidonesDisponibles}</p>
                <p className="text-sm text-gray-500">Disponibles</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{capacidad}</p>
                <p className="text-sm text-gray-500">Capacidad</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
