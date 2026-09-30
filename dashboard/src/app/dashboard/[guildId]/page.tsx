'use client';

import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageContainer } from '@/components/ui/Page';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { AlarmClock, ArrowRight, Boxes, Settings, Shield, ShieldAlert, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { use, useCallback, useEffect, useState } from 'react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

interface GuildDashboardStatus {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    botInstalled: boolean;
    memberCount: number | null;
    presenceCount: number | null;
  };
  bot: { status: string; ping: number | null; uptime: number | null };
  modules: { module: string; enabled: boolean }[];
  stats: { activeTickets: number; pendingReminders: number; pendingAnnouncements: number };
}

export default function GuildDashboardPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<GuildDashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const requestStatus = useCallback(async (): Promise<GuildDashboardStatus> => {
    const res = await fetch(`/api/guilds/${guildId}/status`, { signal: AbortSignal.timeout(20000) });
    const payload = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push('/login');
      throw new Error('Your session has expired. Sign in again to continue.');
    }
    if (!res.ok) throw new Error(payload.error || 'Failed to load server details.');
    return payload as GuildDashboardStatus;
  }, [guildId, router]);

  const fetchData = useCallback(() => {
    setIsRefreshing(true);
    void requestStatus()
      .then((nextData) => { setData(nextData); setError(null); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Network error'); })
      .finally(() => { setLoading(false); setIsRefreshing(false); });
  }, [requestStatus]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void requestStatus()
        .then((nextData) => { if (active) { setData(nextData); setError(null); } })
        .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Network error'); })
        .finally(() => { if (active) setLoading(false); });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [requestStatus]);

  if (loading) return <div><Topbar title="Dashboard" subtitle="Server health, activity, and enabled modules." /><PageContainer><LoadingState label="Loading server dashboard" /></PageContainer></div>;
  if (error) return <div><Topbar title="Dashboard" subtitle="Server health, activity, and enabled modules." /><PageContainer><ErrorState title="Server dashboard unavailable" message={error} onRetry={fetchData} /><Link href="/dashboard/select-server" className="kraxx-btn kraxx-btn-secondary mt-4">Select a server</Link></PageContainer></div>;

  const { guild, modules = [], stats } = data || {};
  const enabledCount = modules.filter(module => module.enabled).length;
  const botStatus = data?.bot.status || 'UNKNOWN';
  const statusVariant = botStatus.toUpperCase() === 'ONLINE' ? 'success' : botStatus.toUpperCase() === 'OFFLINE' ? 'danger' : botStatus.toUpperCase() === 'DEGRADED' ? 'warning' : 'neutral';
  return <div>
    <Topbar title="Dashboard" subtitle="Server health, activity, and enabled modules." onRefresh={fetchData} isRefreshing={isRefreshing}
      actions={<><Link className="kraxx-btn kraxx-btn-secondary" href={`/dashboard/${guildId}/settings`}><Settings size={16} />Settings</Link><Link className="kraxx-btn kraxx-btn-primary" href={`/dashboard/${guildId}/modules`}><Boxes size={16} />Modules</Link></>} />
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {guild?.icon && <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`} alt="" width={40} height={40} className="rounded-lg" />}
        <h2 className="min-w-0 break-words text-base font-semibold">{guild?.name || 'Server'}</h2>
        <Badge variant={statusVariant}>Bot: {botStatus}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active tickets" value={stats?.activeTickets ?? '—'} icon={Ticket} href={`/dashboard/${guildId}/tickets`} linkLabel="View tickets" />
        <StatCard title="Total members" value={guild?.memberCount ?? '—'} icon={Users} href={`/dashboard/${guildId}/members`} linkLabel="View members" />
        <StatCard title="Pending reminders" value={stats?.pendingReminders ?? '—'} icon={AlarmClock} href={`/dashboard/${guildId}/reminders`} linkLabel="View reminders" />
        <StatCard title="Active modules" value={enabledCount} icon={Boxes} href={`/dashboard/${guildId}/modules`} linkLabel="Manage modules" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Module status</h2><Link href={`/dashboard/${guildId}/modules`} className="text-sm text-[var(--accent)] hover:underline">Manage modules</Link></div>
          {modules.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No module records were returned.</p> : <ul className="divide-y divide-[var(--border-base)]">{modules.slice(0, 8).map(mod => <li key={mod.module} className="flex items-center justify-between gap-3 py-3"><span className="break-words text-sm text-[var(--text-secondary)]">{mod.module}</span><Badge variant={mod.enabled ? 'success' : 'neutral'}>{mod.enabled ? 'Enabled' : 'Disabled'}</Badge></li>)}</ul>}
        </Card>
        <Card><h2 className="mb-4 text-base font-semibold">Quick actions</h2><div className="space-y-2">{[
          { label: 'Review moderation', path: 'moderation', icon: Shield },
          { label: 'Manage support tickets', path: 'tickets', icon: Ticket },
          { label: 'Configure welcome messages', path: 'welcome', icon: Users },
          { label: 'View audit logs', path: 'audit', icon: ShieldAlert },
          { label: 'Configure server settings', path: 'settings', icon: Settings },
        ].map(({ label, path, icon: Icon }) => <Link key={path} href={`/dashboard/${guildId}/${path}`} className="flex items-center gap-3 rounded-lg border border-[var(--border-base)] p-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"><Icon size={16} className="shrink-0 text-[var(--accent)]" /><span className="min-w-0 flex-1">{label}</span><ArrowRight size={14} /></Link>)}</div></Card>
      </div>
    </PageContainer>
  </div>;
}
