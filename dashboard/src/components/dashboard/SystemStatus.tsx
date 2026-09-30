import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Database, Radio, Server } from 'lucide-react';
import { LoadingState } from '@/components/ui/Skeleton';

type Health = 'online' | 'offline' | 'degraded' | 'unknown';

interface SystemStatusProps {
  status: {
    bot: Health;
    database: Health;
    discord: Health;
    lastChecked?: string;
  };
  isLoading?: boolean;
}

/** Shows only the three health values provided by the caller; no sample latency or uptime. */
export function SystemStatusCard({ status, isLoading = false }: SystemStatusProps) {
  if (isLoading) return <Card><LoadingState label="Loading system health" /></Card>;
  const systems = [
    { name: 'Discord Bot', status: status.bot, icon: Server },
    { name: 'Database', status: status.database, icon: Database },
    { name: 'Discord API', status: status.discord, icon: Radio },
  ];
  const variant = (value: Health) => value === 'online' ? 'success' : value === 'degraded' ? 'warning' : value === 'offline' ? 'danger' : 'neutral';
  return <Card>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-base)] pb-4">
      <h2 className="text-base font-semibold">System health</h2>
      {status.lastChecked && <p className="text-xs text-[var(--text-secondary)]">Checked {new Date(status.lastChecked).toLocaleString()}</p>}
    </div>
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {systems.map(({ name, status: value, icon: Icon }) => <li key={name} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border-base)] bg-[var(--surface-2)] p-4">
        <span className="flex min-w-0 items-center gap-3 text-sm font-medium"><Icon size={16} className="shrink-0 text-[var(--text-secondary)]" />{name}</span>
        <Badge variant={variant(value)}>{value === 'online' ? 'Online' : value === 'offline' ? 'Offline' : value === 'degraded' ? 'Degraded' : 'Unknown'}</Badge>
      </li>)}
    </ul>
  </Card>;
}
