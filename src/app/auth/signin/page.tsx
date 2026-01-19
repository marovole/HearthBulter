"use client";

export const dynamic = "force-dynamic";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-foreground mb-6">
          登录账户
        </h1>
        <SignIn routing="path" path="/auth/signin" signUpUrl="/auth/signup" />
      </div>
    </div>
  );
}
