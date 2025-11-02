import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HealthDataHistoryPage } from '@/components/health-data/HealthDataHistoryPage';

export default async function HealthDataHistoryPage() {
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
