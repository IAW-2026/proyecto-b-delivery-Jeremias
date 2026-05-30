import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { AdminDeliveryUserRow } from "@/lib/adminDeliveryUsers";

const ADMIN_DELIVERY_ROLE = "admin_delivery";

export async function getAdminUsersData(): Promise<{ users: AdminDeliveryUserRow[] }> {
  // 1. Verificamos la sesión activa
  const { userId } = await auth();
  if (!userId) {
    redirect("/signin");
  }

  // 2. Seguridad extrema: Solo un admin global (AdminDelivery) puede ver esta página
  const currentAdminProfile = await prisma.adminDelivery.findUnique({
    where: { clerkUserId: userId },
  });

  if (!currentAdminProfile) {
    redirect("/dashboard"); // Lo pateamos si no tiene permiso global
  }

  // 3. Obtenemos TODOS los usuarios registrados en tu aplicación desde Clerk
  // Limitamos a 500 por si crece mucho, pero Clerk trae todos los datos reales (nombre, email).
  const clerkResponse = await clerkClient.users.getUserList({ limit: 500 });
  const clerkUsers = clerkResponse.data;

  // 4. Obtenemos TODOS los roles locales de la base de datos (Prisma)
  const dbUserRoles = await prisma.userRole.findMany();
  
  // 5. Obtenemos TODOS los administradores globales de la base de datos (Prisma)
  const dbAdminDeliveries = await prisma.adminDelivery.findMany();

  // 6. Cruzamos la información: Para cada usuario de Clerk, buscamos sus permisos en la BD local
  const users: AdminDeliveryUserRow[] = clerkUsers.map((clerkUser) => {
    // Buscamos si tiene un rol local asignado
    const localRoleRecord = dbUserRoles.find((r) => r.clerkUserId === clerkUser.id);
    // Buscamos si tiene un perfil de administrador global
    const globalAdminRecord = dbAdminDeliveries.find((a) => a.clerkUserId === clerkUser.id);

    const isGlobalAdmin = Boolean(globalAdminRecord);
    const localRole = localRoleRecord?.role || "Sin rol";
    
    // El rol efectivo: Si es admin global, pesa más. Si no, su rol local.
    const effectiveRole = isGlobalAdmin ? ADMIN_DELIVERY_ROLE : localRole;

    // Extraemos el email principal de Clerk de forma segura
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress || "Sin correo institucional";

    // Extraemos nombre y apellido real de Clerk
    const firstName = clerkUser.firstName || "";
    const lastName = clerkUser.lastName || "";
    let fullName = `${firstName} ${lastName}`.trim();

    // Si el usuario no completó su nombre, Clerk no nos da nada, así que dejamos la lógica 
    // preparada para que tu UI detecte el "Usuario No Registrado"
    if (!fullName) {
      fullName = clerkUser.id; // Pasamos el ID provisorio como nombre
    }

    return {
      clerkUserId: clerkUser.id,
      fullName: fullName,
      email: primaryEmail,
      effectiveRole: effectiveRole,
      isGlobalAdmin: isGlobalAdmin,
      localRole: localRole,
      // Si tuvieras teléfono en clerkUser, se saca así, pero lo dejamos como opcional según tu tipo:
      adminPhone: null, 
    };
  });

  return {
    users,
  };
}