import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldCheck, Ticket, Megaphone, UserPlus, CheckCircle2, ScrollText } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  action: string;
  executorId: string;
  targetId?: string | null;
  details?: string | null;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  guildId?: string;
  isLoading?: boolean;
}

export function RecentActivity({ activities, guildId, isLoading = false }: RecentActivityProps) {
  const getActionDetails = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('ROLE') || act.includes('CLEARANCE')) return { variant: 'brand' as const, icon: ShieldCheck };
    if (act.includes('TICKET')) return { variant: 'neutral' as const, icon: Ticket };
    if (act.includes('ANNOUNC') || act.includes('MESSAGE')) return { variant: 'warning' as const, icon: Megaphone };
    if (act.includes('JOIN') || act.includes('MEMBER')) return { variant: 'success' as const, icon: UserPlus };
    if (act.includes('TASK')) return { variant: 'brand' as const, icon: CheckCircle2 };
    return { variant: 'neutral' as const, icon: ScrollText };
  };
  const auditHref = guildId ? `/dashboard/${guildId}/audit` : '/dashboard/select-server';

  return <Card className="flex h-full min-w-0 flex-col">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-base)] pb-4">
      <h2 className="text-base font-semibold">Recent activity</h2>
      <Link href={auditHref} className="text-[13px] font-medium text-[var(--accent)] hover:underline">View audit logs</Link>
    </div>
    {isLoading ? <div role="status" aria-label="Loading recent activity" className="space-y-3 py-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
      : activities.length === 0 ? <EmptyState icon={ScrollText} title="No recent activity" description="Activity will appear here when the server records an event." className="border-0 bg-transparent" />
      : <ul className="divide-y divide-[var(--border-base)]">{activities.slice(0, 5).map(item => {
        const details = getActionDetails(item.action);
        const Icon = details.icon;
        const timestamp = new Date(item.timestamp);
        return <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon size={16} className="shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            <time dateTime={item.timestamp} className="shrink-0 font-mono text-xs text-[var(--text-secondary)]">{Number.isNaN(timestamp.valueOf()) ? 'Time unavailable' : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            <Badge variant={details.variant}>{item.action}</Badge>
            <span className="truncate text-[13px] text-[var(--text-primary)]">{item.details || item.targetId || `@${item.executorId}`}</span>
          </div>
          <span className="hidden shrink-0 text-xs text-[var(--text-secondary)] sm:inline">@{item.executorId}</span>
        </li>;
      })}</ul>}
  </Card>;
}
