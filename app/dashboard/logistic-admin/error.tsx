"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">Algo salió mal</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
