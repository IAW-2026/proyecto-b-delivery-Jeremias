import { currentUser } from "@clerk/nextjs/server";
import PerfilPage from "./ui";

export default async function LogisticAdminPerfilPage() {
  const clerkUser = await currentUser();
  const derivedFallbackName = clerkUser?.fullName?.trim() ?? `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();
  const fallbackName = derivedFallbackName || null;

  return <PerfilPage fallbackName={fallbackName} />;
}