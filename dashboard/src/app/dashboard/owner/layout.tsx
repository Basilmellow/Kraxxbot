import { notFound, redirect } from 'next/navigation';
import { requireKraxxBotOwner } from '@/lib/owner-auth';
import { OwnerPage } from '@/components/owner/OwnerUI';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const access = await requireKraxxBotOwner();
  if (!access.authorized) {
    if (access.status === 401) redirect('/login');
    if (access.status === 403) notFound();
    return <OwnerPage title="Owner access unavailable" description="Owner-only access is fail-closed until the server owner identity is configured.">
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-secondary)]">Configure KRAXXBOT_OWNER_DISCORD_ID in the dashboard server environment to enable this area.</p>
    </OwnerPage>;
  }
  return <div className="space-y-6">{children}</div>;
}
