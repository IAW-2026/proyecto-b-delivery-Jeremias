export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" role="status">
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}
