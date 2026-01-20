"use client";

export const dynamic = "force-dynamic";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">登录账户</h1>
        <SignIn routing="path" path="/auth/signin" signUpUrl="/auth/signup" />
      </div>
    </div>
  );
}
