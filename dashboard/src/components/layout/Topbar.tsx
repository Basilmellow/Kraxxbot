'use client';

import { Bell, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { ServerSelector } from './ServerSelector';
import { useGuildId } from '@/lib/useGuildId';
import { IconButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Page';
import { Tooltip } from '@/components/ui/Tooltip';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
}

/** Navigation chrome and a shared page heading; neither resolves tenant access. */
export function Topbar({ title = 'Dashboard', subtitle = 'Manage your server', onRefresh, isRefreshing = false, actions }: TopbarProps) {
  const guildId = useGuildId();
  return <>
    <div className="dashboard-topbar">
      <div className="flex min-w-0 items-center gap-4">
        <ServerSelector />
        <span className="hidden truncate border-l border-[var(--border-base)] pl-4 text-sm text-[var(--text-secondary)] lg:block">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip text="Search dashboard · Ctrl+K"><IconButton label="Search dashboard (Ctrl+K)" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}><Search size={16} /></IconButton></Tooltip>
        <Link href={guildId ? `/dashboard/${guildId}/audit` : '/dashboard/select-server'} className="kraxx-btn kraxx-btn-ghost kraxx-icon-button" aria-label={guildId ? 'Open audit activity' : 'Select a server'}><Bell size={16} /></Link>
        {onRefresh && <IconButton label="Refresh page data" onClick={onRefresh} disabled={isRefreshing} aria-busy={isRefreshing}><RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /></IconButton>}
      </div>
    </div>
    <div className="dashboard-heading"><PageHeader title={title} description={subtitle} actions={actions} /></div>
  </>;
}
