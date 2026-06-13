export default function AdminDeliveryLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm text-slate-500">Cargando...</p>
      </div>
    </div>
  );
}
