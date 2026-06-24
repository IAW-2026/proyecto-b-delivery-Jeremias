import Link from "next/link";

export default function VendorLinkPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-8 py-12 text-zinc-950">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold" style={{ color: "#00AEEF" }}>
          No vinculado
        </h1>

        <div className="mt-6 space-y-4 text-sm text-zinc-700">
          <p>
            Estás ingresando a la Delivery App con rol de administrador logístico,
            pero tu usuario no está vinculado a ninguna empresa registrada en la
            Seller App.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">¿Cómo solucionarlo?</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>
                Registrá tu empresa en la{" "}
                <a
                  href="https://proyecto-b-seller-agua-ya.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                  style={{ color: "#00AEEF" }}
                >
                  Seller App
                </a>{" "}
                como vendedor.
              </li>
              <li>Una vez registrada, volvé a iniciar sesión acá abajo.</li>
            </ol>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/signin"
            className="inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#00AEEF" }}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
