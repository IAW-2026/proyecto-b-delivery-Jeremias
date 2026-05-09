import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <div className="flex h-screen bg-white text-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <nav className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-bold" style={{ color: "#00AEEF" }}>
            Delivery
          </h1>
          <ul className="space-y-2">
            <li>
              <a
                href="/dashboard"
                className="block rounded-lg px-4 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Inicio
              </a>
            </li>
            <li>
              <a
                href="/dashboard/choferes"
                className="block rounded-lg px-4 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Choferes
              </a>
            </li>
            <li>
              <a
                href="/dashboard/rutas"
                className="block rounded-lg px-4 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Rutas
              </a>
            </li>
            <li>
              <a
                href="/dashboard/perfil"
                className="block rounded-lg px-4 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Perfil
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
