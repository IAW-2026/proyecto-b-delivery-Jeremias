import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="rounded-lg bg-white p-8 shadow-md dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">Protected area</h1>
        <p className="mt-4">You are signed in as: {userId}</p>
      </div>
    </div>
  );
}
