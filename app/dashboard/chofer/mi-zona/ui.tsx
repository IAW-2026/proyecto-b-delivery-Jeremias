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
    month: "short",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: "#00AEEF" }}>
          <span aria-hidden="true">🗺️</span> Zona
        </h1>
        <p className="text-gray-600">Información de la zona asignada para hoy</p>
      </div>

      <div className="mb-6 rounded-lg border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 p-8">
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-gray-600">Zona Asignada</p>
          <h2 className="mb-2 text-5xl font-bold text-purple-600">
            {chofer.zona || "Sin zona asignada"}
          </h2>
          <p className="text-gray-600">Zona para entrega hoy</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">📦</span>
            <h3 className="font-semibold text-gray-900">Pedidos</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{cantidadPedidos}</p>
          <p className="mt-2 text-xs text-gray-600">Pedidos pendientes</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Estado</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="mb-2 text-sm text-gray-600">Estado</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <p className="text-lg font-semibold capitalize text-green-600">
                {chofer.estado || "sin estado"}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <p className="mb-2 text-sm text-gray-600">Fecha</p>
            <p className="text-lg font-semibold">
              <span suppressHydrationWarning>{fechaFormato}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
          <span>📍</span> Detalles de Localización
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-gray-600">Zona ID</p>
            <p className="text-lg font-semibold text-gray-900">
              {chofer.idZona || "-"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-600">Estado</p>
            <p className="text-lg font-semibold capitalize text-gray-900">
              {chofer.estado || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex h-64 items-center justify-center rounded-lg border border-gray-300 bg-gray-200">
        <div className="text-center">
          <p className="mb-2 text-2xl" aria-hidden="true">🗺️</p>
          <p className="font-medium text-gray-600">Mapa de la zona</p>
          <p className="mt-1 text-xs text-gray-500">
            Próxima actualización: integración con Google Maps
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm text-green-800">
          <span className="font-semibold">💡 Consejo:</span> Verifica los
          datos de tu zona antes de comenzar las entregas. Asegúrate de tener
          suficientes bidones en el vehículo.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">ℹ️ Nota:</span> Los datos mostrados
          ahora provienen del estado compartido de pedidos asignados.
        </p>
      </div>
    </div>
  );
}
