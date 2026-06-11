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

export default function MiVehiculoUI({ vehiculo, totalBidones, bidonesDisponibles, porcentajeUsado, capacidad }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: "#00AEEF" }}>
          <span aria-hidden="true">🚛</span> Vehículo
        </h1>
        <p className="text-gray-600">Detalles del vehículo asignado</p>
      </div>

      <div className="mb-6 rounded-lg border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Patente del Vehículo</p>
            <h2 className="text-5xl font-bold text-orange-600">
              {vehiculo?.patente ?? "Sin vehículo"}
            </h2>
          </div>
          <div className="text-7xl opacity-30" aria-hidden="true">🚛</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-gray-600">Tipo</p>
          <p className="text-2xl font-bold text-gray-900">
            {vehiculo?.tipo ?? "Sin tipo"}
          </p>
          <p className="mt-2 text-xs text-gray-600">Clasificación del vehículo</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-gray-600">Capacidad</p>
          <p className="text-2xl font-bold text-blue-600">
            {capacidad}
          </p>
          <p className="mt-2 text-xs text-gray-600">Bidones máximos</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-gray-600">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">
            {bidonesDisponibles}
          </p>
          <p className="mt-2 text-xs text-gray-600">Espacios libres</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">
          <span aria-hidden="true">📊</span> Capacidad de Carga
        </h3>

        <div className="mb-4">
          <div className="mb-2 flex justify-between">
            <p className="text-sm text-gray-700">
              Bidones utilizados: <span className="font-semibold">{totalBidones}</span>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{porcentajeUsado}%</span>
            </p>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                porcentajeUsado < 75
                  ? "bg-green-500"
                  : porcentajeUsado < 100
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${porcentajeUsado}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="mb-1 text-xs text-gray-600">En Uso</p>
            <p className="text-xl font-bold text-orange-600">{totalBidones}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-600">Disponibles</p>
            <p className="text-xl font-bold text-green-600">{bidonesDisponibles}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-600">Capacidad</p>
            <p className="text-xl font-bold text-blue-600">{capacidad}</p>
          </div>
        </div>
      </div>

      {porcentajeUsado >= 90 ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <span className="font-semibold">⚠️ Advertencia:</span> El vehículo
            está casi a capacidad máxima ({porcentajeUsado}%). Verifica que
            todos los bidones estén bien asegurados.
          </p>
        </div>
      ) : porcentajeUsado >= 75 ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">⚡ Información:</span> El vehículo
            está al {porcentajeUsado}% de capacidad. Considera revisar la carga.
          </p>
        </div>
      ) : null}
    </div>
  );
}
