import { handler } from '@/lib/auth';

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export { handler as GET, handler as POST };
