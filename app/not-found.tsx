import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-center">
      <h2 className="text-6xl font-bold text-slate-300">404</h2>
      <p className="mt-4 text-xl font-semibold text-slate-900">Página no encontrada</p>
      <p className="mt-2 text-sm text-slate-500">La página que buscas no existe o fue movida.</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
