import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireGuildPageAccess } from '@/lib/permissions';
import { Topbar } from '@/components/layout/Topbar';
import { ErrorState } from '@/components/ui/ErrorState';

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
  if (access.status === 503) {
    return (
      <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col">
        <Topbar title="Guild access check unavailable" subtitle="The dashboard could not verify this server right now." />
        <div className="mx-auto w-full max-w-2xl p-6 sm:p-8">
          <ErrorState title="Could not verify server access" message="Your server data has not been loaded. Retry in a moment; access checks remain required." />
          <Link className="mt-4 inline-flex rounded-lg border border-[#2A2925] px-4 py-2 text-sm text-[#F3F0E9] hover:border-[#C9A66B]" href={`/dashboard/${guildId}`}>
            Retry access check
          </Link>
        </div>
      </div>
    );
  }
  if (!access.authorized) notFound();

  // Force client child state to reset when the tenant segment changes so a
  // previous guild's cached form/member data is never briefly rendered.
  return <Fragment key={guildId}>{children}</Fragment>;
}
