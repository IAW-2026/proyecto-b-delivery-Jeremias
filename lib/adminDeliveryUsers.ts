import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_DELIVERY_ROLE = "admin_delivery";

export async function getAdminDeliveryUsersData() {
  let clerkUsers: any[] = [];
  let clerkUnavailable = false;

  // 1. Intentamos traer los usuarios de Clerk
  try {
    const client = await clerkClient();
    const clerkResponse = await client.users.getUserList({ limit: 500 });
    clerkUsers = clerkResponse.data;
  } catch (error) {
    console.error("Error al conectar con Clerk:", error);
    clerkUnavailable = true;
  }

  // 2. Traemos la data local de Prisma (Añadimos Choferes para rescatar nombres)
  const dbUserRoles = await prisma.userRole.findMany();
  const dbAdminDeliveries = await prisma.adminDelivery.findMany();
  const dbChoferes = await prisma.chofer.findMany({
    select: { clerkUserId: true, nombre: true } // Solo traemos lo que necesitamos para no saturar
  });

  // 3. Mapeamos y cruzamos los datos
  const allMappedUsers: AdminDeliveryUserRow[] = clerkUsers.map((clerkUser) => {
    // Buscamos a este usuario en nuestras 3 tablas locales
    const localRoleRecord = dbUserRoles.find((r) => r.clerkUserId === clerkUser.id);
    const globalAdminRecord = dbAdminDeliveries.find((a) => a.clerkUserId === clerkUser.id);
    const choferRecord = dbChoferes.find((c) => c.clerkUserId === clerkUser.id);

    const isGlobalAdmin = Boolean(globalAdminRecord);
    const localRole = localRoleRecord?.role || "Sin rol";
    const effectiveRole = isGlobalAdmin ? ADMIN_DELIVERY_ROLE : localRole;

    const primaryEmail = clerkUser.emailAddresses.find(
      (email: any) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress || "Sin correo";

    // --- LÓGICA INTELIGENTE DE NOMBRES ---
    let fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
    
    // Si Clerk no nos dio un nombre, miramos en la Base de Datos
    if (!fullName) {
      if (choferRecord?.nombre && choferRecord.nombre !== "Chofer") {
        fullName = choferRecord.nombre; // Lo rescatamos de la tabla Chofer
      } else if (globalAdminRecord?.nombre) {
        fullName = globalAdminRecord.nombre; // Lo rescatamos de la tabla AdminDelivery
      } else {
        fullName = clerkUser.id; // Último recurso: mostramos el ID para que la UI ponga "Usuario sin registrar"
      }
    }

    return {
      clerkUserId: clerkUser.id,
      fullName,
      email: primaryEmail,
      effectiveRole,
      isGlobalAdmin,
      localRole,
      adminPhone: null,
    };
  });

  // 4. FILTRO ESTRICTO: Solo delivery y/o logistic_admin que NO sean admin_delivery
  const users = allMappedUsers.filter((user) => {
    const hasTargetRole = user.localRole === "logistic_admin" || user.localRole === "delivery";
    const isNotAdmin = !user.isGlobalAdmin && user.localRole !== "admin_delivery";
    
    return hasTargetRole && isNotAdmin;
  });

  return {
    users,
    totalUsers: users.length,
    globalAdminCount: allMappedUsers.filter((u) => u.isGlobalAdmin).length,
    clerkUnavailable,
  };
}