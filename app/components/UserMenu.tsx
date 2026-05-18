'use client';

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserMenu() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/signin");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex justify-center">
      <UserButton 
        signOutUrl="/signin"
        appearance={{
          elements: {
            avatarBox: "w-10 h-10"
          }
        }}
      />
    </div>
  );
}
