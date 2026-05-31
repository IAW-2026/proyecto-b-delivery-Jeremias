import { currentUser } from "@clerk/nextjs/server";
import AdminDeliveryPerfilUi from "./ui";

export default async function AdminDeliveryPerfilPage() {
	const clerkUser = await currentUser();
	const derivedFallbackName = clerkUser?.fullName?.trim() ?? `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim();
	const fallbackName = derivedFallbackName || null;

	return <AdminDeliveryPerfilUi fallbackName={fallbackName} />;
}
