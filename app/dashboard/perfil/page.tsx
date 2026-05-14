import { currentUser } from "@clerk/nextjs/server";
import EditProfileClient from "./EditProfileClient";

export default async function PerfilPage() {
	const user = await currentUser();

	const fullName =
		user?.fullName ??
		[user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
		"Usuario";

	const phoneFromMetadata =
		typeof user?.publicMetadata?.phone === "string"
    	? user.publicMetadata.phone
    	: undefined;

	return (
		<div className="p-8">
			<div className="rounded-lg bg-white p-6 shadow-sm" style={{ backgroundColor: "#FFFFFF" }}>
				<h1 className="text-2xl font-bold" style={{ color: "#00AEEF" }}>
					Perfil
				</h1>
				<p className="mt-2 text-zinc-600" style={{ color: "#575757" }}>
					Nombre: {fullName}
				</p>
				<p className="mt-1 text-zinc-600" style={{ color: "#575757" }}>
					Email: {user?.emailAddresses[0]?.emailAddress ?? "No disponible"}
				</p>
				<p className="mt-1 text-zinc-600" style={{ color: "#575757" }}>
  					Teléfono: {user?.phoneNumbers?.[0]?.phoneNumber ?? phoneFromMetadata ?? "No disponible"}
				</p>
				{/* Componente cliente para editar perfil */}
				<EditProfileClient />
			</div>
		</div>
	);
}
