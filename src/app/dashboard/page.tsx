import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <EnhancedDashboard 
      userId={session.user.id}
    />
  );
}
