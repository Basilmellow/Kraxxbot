import { getOwnerHealth } from '@/lib/owner-data';
import { OwnerPage, OwnerPanel, OwnerCard, OwnerStatus } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerHealthPage() {
  await requireOwnerPage(); const data = await getOwnerHealth();
  const jobTotal = (groups: Record<string, number>) => Object.values(groups).reduce((sum, count) => sum + count, 0);
  return <OwnerPage title="Health" description="Read-only worker, database, scheduler, AI, and Discord state.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OwnerCard label="Worker" value={<OwnerStatus value={data.worker.status} />} detail={`${data.worker.guildCount} connected guilds`} />
      <OwnerCard label="Gateway" value={<OwnerStatus value={data.discord.gateway} />} detail={data.worker.gatewayLatencyMs === null ? 'Latency unknown' : `${data.worker.gatewayLatencyMs} ms`} />
      <OwnerCard label="Database" value={<OwnerStatus value={data.database.status} />} detail={typeof data.database.migration === 'string' ? 'Migration state unavailable' : `${data.database.migration.total} migrations · ${data.database.migration.failedCount} failed`} />
      <OwnerCard label="Scheduler" value={<OwnerStatus value={data.scheduler.status} />} detail={`${jobTotal(data.scheduler.executions)} automation executions`} />
    </div>
    <OwnerPanel title="Queue and retry state"><div className="grid gap-4 sm:grid-cols-3">
      {([['Automation executions', data.scheduler.executions, data.scheduler.executionAttempts], ['Reminders', data.scheduler.reminders, data.scheduler.reminderAttempts], ['Announcements', data.scheduler.announcements, data.scheduler.announcementAttempts]] as const).map(([label, values, attempts]) => <div key={label}><h3 className="mb-2 font-medium">{label}</h3><div className="space-y-1 text-sm text-[var(--text-secondary)]">{Object.entries(values).map(([status, count]) => <p key={status}>{status}: {count}</p>)}</div><p className="mt-2 text-xs text-[var(--text-muted)]">Recorded attempts: {attempts}</p></div>)}
    </div></OwnerPanel>
    <OwnerPanel title="AI and REST"><p className="text-sm">AI configuration: <OwnerStatus value={data.ai.provider} /> · {data.ai.model}</p><p className="mt-2 text-sm">Discord REST health: <OwnerStatus value={data.discord.rest} /></p>
      {data.ai.latestFailure && <p className="mt-2 text-sm text-[var(--text-secondary)]">Latest AI failure category: {data.ai.latestFailure.category || data.ai.latestFailure.status}.</p>}</OwnerPanel>
  </OwnerPage>;
}
