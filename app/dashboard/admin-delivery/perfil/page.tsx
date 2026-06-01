import { currentUser } from "@clerk/nextjs/server";
import AdminDeliveryPerfilUi from "./ui";

async function safeCurrentUser() {
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

export default async function AdminDeliveryPerfilPage() {
	const clerkUser = await safeCurrentUser();
	const derivedFallbackName = clerkUser?.fullName?.trim() ?? `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();
	const fallbackName = derivedFallbackName || null;

	return <AdminDeliveryPerfilUi fallbackName={fallbackName} />;
}
