import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OwnerPage, OwnerPanel, OwnerStatus } from '@/components/owner/OwnerUI';
import { getOwnerServer } from '@/lib/owner-data';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerServerDetailPage({ params }: { params: Promise<{ guildId: string }> }) {
  await requireOwnerPage();
  const { guildId } = await params;
  if (!/^\d{17,20}$/.test(guildId)) notFound();
  const server = await getOwnerServer(guildId);
  if (!server) notFound();
  return <OwnerPage title={server.name} description="Installation and tenant status; audit message details are excluded.">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-sm text-[var(--text-secondary)]">Guild ID: {server.id} · Tenant ID: {server.tenantId}</p><Link href="/dashboard/owner/servers" className="text-sm text-[var(--accent)] hover:underline">← All servers</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">Bot status<br /><OwnerStatus value={server.status} /></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">Members<br />{server.memberCount ?? 'Unknown'}</div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">First seen<br />{new Date(server.firstSeenAt).toLocaleString()}</div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">Last seen<br />{server.lastSeenAt ? new Date(server.lastSeenAt).toLocaleString() : 'Unknown'}</div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><OwnerPanel title="Modules"><div className="space-y-2">{server.modules.map(module => <p key={module.module} className="flex justify-between text-sm"><span>{module.module}</span><OwnerStatus value={module.enabled ? 'ENABLED' : 'DISABLED'} /></p>)}</div></OwnerPanel>
      <OwnerPanel title="Kraxx AI configuration"><p className="text-sm">Module: <OwnerStatus value={server.ai.enabled ? 'ENABLED' : 'DISABLED'} /></p><p className="mt-2 text-sm">Allowed channels: {server.ai.allowedChannelCount}</p><p className="mt-2 text-sm">User cooldown: {server.ai.userCooldownSeconds ?? 'default'} seconds</p><p className="mt-2 text-sm">Guild limit: {server.ai.guildRequestsPerMinute ?? 'default'} requests/minute</p></OwnerPanel></div>
    <OwnerPanel title="Installation history"><p className="text-sm">First seen: {new Date(server.firstSeenAt).toLocaleString()}</p><p className="mt-2 text-sm">Last Gateway observation: {server.lastSeenAt ? new Date(server.lastSeenAt).toLocaleString() : 'Not recorded'}</p><p className="mt-2 text-sm">Left at: {server.leftAt ? new Date(server.leftAt).toLocaleString() : 'Not recorded'}</p><p className="mt-2 text-sm">Scheduler: <OwnerStatus value={server.scheduler} /></p></OwnerPanel>
    <OwnerPanel title="Recent relevant audit events">{server.recentEvents.length ? <div className="space-y-2">{server.recentEvents.map((event, index) => <p key={`${event.action}-${event.timestamp}-${index}`} className="text-sm">{event.action} · {new Date(event.timestamp).toLocaleString()}</p>)}</div> : <p className="text-sm text-[var(--text-secondary)]">No audit events found.</p>}</OwnerPanel>
  </OwnerPage>;
}
