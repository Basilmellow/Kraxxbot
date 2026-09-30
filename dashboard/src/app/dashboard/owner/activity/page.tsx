import { getOwnerActivity } from '@/lib/owner-data';
import { OwnerPage, OwnerPanel } from '@/components/owner/OwnerUI';
import { requireOwnerPage } from '@/lib/owner-page';

export const dynamic = 'force-dynamic';
export default async function OwnerActivityPage() {
  await requireOwnerPage(); const events = await getOwnerActivity();
  return <OwnerPage title="Activity" description="Recent guild and audit events, with message details omitted.">
    <OwnerPanel title="Recent activity">{events.length ? <ol className="divide-y divide-[var(--border)]">{events.map((event, index) => <li key={`${event.type}-${event.occurredAt}-${index}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><strong>{event.type.replaceAll('_', ' ')}</strong> {event.guildName ? `· ${event.guildName}` : ''}{event.actorId ? ` · actor ${event.actorId}` : ''}</span><time className="text-[var(--text-secondary)]">{new Date(event.occurredAt).toLocaleString()}</time></li>)}</ol> : <p className="text-sm text-[var(--text-secondary)]">No activity is recorded yet.</p>}</OwnerPanel>
  </OwnerPage>;
}
