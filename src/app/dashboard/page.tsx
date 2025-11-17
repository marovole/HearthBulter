'use client';

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard';

/**
 * Dashboard Page Component
 *
 * Main dashboard page displaying user's health data overview, family information,
 * and key metrics. Requires authentication.
 *
 * IMPORTANT: Client component for Cloudflare Pages static export compatibility.
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect unauthenticated users to sign in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <EnhancedDashboard userId={session.user.id} />;
}
