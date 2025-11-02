import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AddHealthDataPage } from '@/components/health-data/AddHealthDataPage'

export default async function AddHealthDataPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <AddHealthDataPage 
      userId={session.user.id}
    />
  )
}
