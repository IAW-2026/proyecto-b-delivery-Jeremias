'use client';

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function UserMenu() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/signin");
    }
  }, [isLoaded, isSignedIn, router]);

  function triggerUserButtonClick() {
    const el = containerRef.current;
    const btn = el?.querySelector("button");
    if (btn && typeof (btn as HTMLButtonElement).click === "function") {
      (btn as HTMLButtonElement).click();
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 p-1 rounded-md hover:bg-gray-100 cursor-pointer"
      onClick={(e) => {
        // If the user clicked directly on the internal button, avoid double-trigger
        if ((e.target as HTMLElement).closest("button")) return;
        triggerUserButtonClick();
      }}
    >
      <UserButton appearance={{ elements: { avatarBox: "w-12 h-12 rounded-full" } }} />
      <div className="select-none">
        <p className="font-semibold text-gray-900">{user?.firstName || "Usuario"}</p>
        <p className="text-sm text-gray-500">{String(user?.publicMetadata?.role ?? "Chofer")}</p>
      </div>
    </div>
  );
}
