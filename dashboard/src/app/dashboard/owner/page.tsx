import Link from 'next/link';
import { getOwnerOverview } from '@/lib/owner-data';
import { OwnerPage, OwnerCard, OwnerPanel, OwnerStatus } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerOverviewPage() {
  await requireOwnerPage();
  const data = await getOwnerOverview();
  const cards = [
    ['Known servers', data.servers.known, `${data.servers.connected} currently connected`],
    ['Unavailable / unknown', data.servers.unavailable + data.servers.unknown, `${data.servers.recentlyLeft} recently left`],
    ['Commands', data.commands.count, 'Global scope; live deployment is not tracked here'],
    ['AI enabled servers', data.ai.enabledGuilds, `${data.ai.requestsToday} requests today`],
  ] as const;
  return <OwnerPage title="Overview" description="Read-only view of the bot worker, server registry, commands, and AI telemetry.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail]) => <OwnerCard key={label} label={label} value={value} detail={detail} />)}</div>
    <OwnerPanel title="System health"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <OwnerCard label="Worker" value={<OwnerStatus value={data.worker.status} />} detail={`${data.worker.guildCount} Gateway guilds`} />
      <OwnerCard label="Database" value={<OwnerStatus value={data.worker.database} />} detail="Dashboard query succeeded" />
      <OwnerCard label="Scheduler" value={<OwnerStatus value={data.worker.scheduler} />} />
      <OwnerCard label="Gateway heartbeat" value={data.worker.lastHeartbeat ? new Date(data.worker.lastHeartbeat).toLocaleString() : 'Unknown'} detail={data.worker.latencyMs === null ? 'Latency unavailable' : `${data.worker.latencyMs} ms`} />
    </div></OwnerPanel>
    <OwnerPanel title="Owner areas"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {['servers', 'ai', 'commands', 'health', 'activity', 'settings'].map(section => <Link key={section} href={`/dashboard/owner/${section}`} className="rounded-lg border border-[var(--border)] p-4 capitalize text-[var(--text-primary)] hover:border-[var(--accent)]">{section} <span aria-hidden="true">→</span></Link>)}
    </div></OwnerPanel>
  </OwnerPage>;
}
