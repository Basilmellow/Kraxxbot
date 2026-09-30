import { getOwnerAi } from '@/lib/owner-data';
import { OwnerPage, OwnerCard, OwnerPanel, OwnerStatus } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerAiPage() {
  await requireOwnerPage(); const data = await getOwnerAi();
  return <OwnerPage title="AI monitoring" description="Provider readiness and aggregate operational telemetry. Prompts and responses are never shown.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OwnerCard label="Provider / model" value={`${data.provider} · ${data.model}`} detail={<OwnerStatus value={data.configuration} />} />
      <OwnerCard label="AI-enabled servers" value={data.enabledGuilds} detail={<OwnerStatus value={data.readiness} />} />
      <OwnerCard label="Requests today" value={data.requestsToday} detail={`${data.successful} successful · ${data.failed} failed`} />
      <OwnerCard label="Rate limited / timeouts" value={`${data.rateLimited} / ${data.timeouts}`} detail={data.averageLatencyMs === null ? 'Average latency unavailable' : `Average latency ${Math.round(data.averageLatencyMs)} ms`} />
    </div>
    <OwnerPanel title="Recent provider state"><p className="text-sm text-[var(--text-secondary)]">Last successful request: {data.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleString() : 'No successful request recorded'}.</p>
      {data.latestFailure && <p className="mt-2 text-sm text-[var(--text-secondary)]">Latest failure: {data.latestFailure.category || data.latestFailure.status} at {new Date(data.latestFailure.at).toLocaleString()}.</p>}
      <p className="mt-3 text-xs text-[var(--text-muted)]">A configured key only confirms worker configuration; provider readiness is confirmed only by a successful live request.</p></OwnerPanel>
  </OwnerPage>;
}
