import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireGuildPageAccess } from '@/lib/permissions';

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  if (!/^\d{17,20}$/.test(guildId)) notFound();

  const access = await requireGuildPageAccess(guildId);
  if (access.status === 401) redirect('/login');
  if (access.status === 503) redirect('/dashboard/select-server?error=verification-unavailable');
  if (!access.authorized) notFound();

  return children;
}
