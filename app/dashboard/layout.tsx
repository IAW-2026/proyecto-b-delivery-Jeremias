import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";





export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  /*Verifico que el usuario esté autenticado, si no lo está, 
  lo redirijo a la página de inicio de sesión.*/

  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  /*Una vez que el usuario está autenticado, obtengo su información
   y su rol para mostrar el menú correspondiente.*/

    const user = await currentUser();

    let userRole= null;;
    try{
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user-role`,
         {
          headers: {
            "X-User-ID": user?.id || "",
          },
         }
        );
        userRole= await response.json();
      }catch(error){
        console.error("Error fetching user role:", error);
      }
      const isLogistic_admin = userRole?.role === "logistic_admin";
      const isDelivery = userRole?.role === "delivery";

      const menuItems = isLogistic_admin
        ? [
            { href: "/dashboard", label: "Inicio" },
            { href: "/dashboard/choferes", label: "Choferes" },
            { href: "/dashboard/vehiculos", label: "Vehículos" },
            { href: "/dashboard/rutas", label: "Rutas" },
            { href: "/dashboard/perfil", label: "Perfil" },
          ]
        : isDelivery
        ? [
            { href: "/dashboard", label: "Inicio" },
            { href: "/dashboard/rutas", label: "Rutas" },
            { href: "/dashboard/perfil", label: "Perfil" },
          ]
        : [];
  return (
    <div className="flex h-screen bg-white text-zinc-950">
      <aside className="w-64 bg-white shadow-lg">
        <nav className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-bold" style={{color: "#00AEEF"}}>
            Delivery
          </h1>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-lg px-4 py-2 text-zinc-700 hover:bg-zinc-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
