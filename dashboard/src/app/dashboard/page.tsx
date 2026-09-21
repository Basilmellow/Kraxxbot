import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * /dashboard — Root dashboard route.
 * Redirects authenticated users to the server selector.
 * The actual per-guild dashboard lives at /dashboard/[guildId].
 */
export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Always direct users to server selection first
  redirect('/dashboard/select-server');
}
