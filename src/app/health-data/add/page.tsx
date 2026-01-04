'use client';

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AddHealthDataPage } from '@/components/health-data/AddHealthDataPage';

/**
 * Add Health Data Page Component
 *
 * Page for adding new health data records.
 * Requires authentication.
 *
 * IMPORTANT: Client component for Cloudflare Pages static export compatibility.
 */
export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
      </div>
    );
  }

  return <AddHealthDataPage userId={session.user.id} />;
}
