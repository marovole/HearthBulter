import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HealthDataDashboard } from '@/components/health-data/HealthDataDashboard';

export default async function HealthDataPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <HealthDataDashboard 
      userId={session.user.id}
    />
  );
}
