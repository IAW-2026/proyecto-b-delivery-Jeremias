"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md dark:bg-zinc-900">
        <SignIn routing="path" />
      </div>
    </div>
  );
}
