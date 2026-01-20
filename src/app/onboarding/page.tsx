"use client";

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useOnboarding } from "@/lib/context/OnboardingContext";

/**
 * Onboarding Page Component
 *
 * Main onboarding wizard page that guides new users through initial setup.
 * Automatically redirects to dashboard if onboarding is already completed.
 *
 * IMPORTANT: Client component for Cloudflare Pages static export compatibility.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboardingCompleted, loading } = useOnboarding();

  useEffect(() => {
    if (!loading && isOnboardingCompleted) {
      router.push("/dashboard");
    }
  }, [isOnboardingCompleted, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
