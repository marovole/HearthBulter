'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useOnboarding } from '@/lib/context/OnboardingContext';

// 禁用静态生成，因为这个页面需要运行时的 Context
export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboardingCompleted, loading } = useOnboarding();

  useEffect(() => {
    if (!loading && isOnboardingCompleted) {
      router.push('/dashboard');
    }
  }, [isOnboardingCompleted, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
