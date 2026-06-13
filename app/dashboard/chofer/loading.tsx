export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" role="status">
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}
