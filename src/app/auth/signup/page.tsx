"use client";

export const dynamic = "force-dynamic";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">创建账户</h1>
        <SignUp routing="path" path="/auth/signup" signInUrl="/auth/signin" />
      </div>
    </div>
  );
}
