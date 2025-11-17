import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HealthDataHistoryPage } from '@/components/health-data/HealthDataHistoryPage';

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <HealthDataHistoryPage
      userId={session.user.id}
    />
  );
}
