'use client';

import React, { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Ticket,
  AlarmClock,
  Megaphone,
  Boxes,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ArrowRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

export default function GuildDashboardPage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGuildStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/guilds/${guildId}/status`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 403 || res.status === 404) {
        const errData = await res.json();
        setError(errData.error || errData.reason || 'Unauthorized access to this server');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('Failed to load server details');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGuildStatus();
    const timer = setInterval(fetchGuildStatus, 20000);
    return () => clearInterval(timer);
  }, [guildId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm text-[#475467] font-medium">Loading server command center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#101828] mb-1">Server Access Error</h2>
        <p className="text-sm text-[#667085] mb-6">{error}</p>
        <Link
          href="/dashboard/select-server"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <span>Return to Server Selection</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const { guild, bot, modules = [], stats } = data || {};
  const enabledModulesCount = modules.filter((m: any) => m.enabled).length;

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5]">
      <Topbar
        title={guild?.name || 'Server Overview'}
        subtitle="Multi-tenant server operations & bot diagnostics"
        onRefresh={fetchGuildStatus}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Server Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-[#EADFC7]/80 p-6 sm:p-8 shadow-xs">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/30 via-transparent to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {guild?.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                  alt={guild.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#E5E7EB] shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 text-white text-2xl font-bold flex items-center justify-center shadow-xs">
                  {guild?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight">
                    {guild?.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    KRAXXBot Installed
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-1 font-mono">
                  SERVER ID: {guild?.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/${guildId}/settings`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#344054] transition-colors shadow-2xs"
              >
                <Settings className="w-4 h-4 text-[#667085]" />
                <span>Configure Server</span>
              </Link>
              <Link
                href={`/dashboard/${guildId}/modules`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Boxes className="w-4 h-4" />
                <span>Manage Modules</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border border-[#EADFC7]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                Active Tickets
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#101828]">
                {stats?.activeTickets ?? 0}
              </span>
              <span className="text-xs text-[#667085]">open</span>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9]">
              <Link
                href={`/dashboard/${guildId}/tickets`}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center justify-between group"
              >
                <span>View Tickets</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-[#EADFC7]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                Pending Reminders
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <AlarmClock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#101828]">
                {stats?.pendingReminders ?? 0}
              </span>
              <span className="text-xs text-[#667085]">scheduled</span>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9]">
              <Link
                href={`/dashboard/${guildId}/reminders`}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center justify-between group"
              >
                <span>View Reminders</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-[#EADFC7]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                Announcements
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#101828]">
                {stats?.pendingAnnouncements ?? 0}
              </span>
              <span className="text-xs text-[#667085]">in queue</span>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9]">
              <Link
                href={`/dashboard/${guildId}/announcements`}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center justify-between group"
              >
                <span>Broadcast Hub</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-[#EADFC7]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                Enabled Modules
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#101828]">
                {enabledModulesCount}
              </span>
              <span className="text-xs text-[#667085]">of {modules.length}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F3F9]">
              <Link
                href={`/dashboard/${guildId}/modules`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-between group"
              >
                <span>Configure Modules</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Live Bot Telemetry Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-[#EADFC7]/60 lg:col-span-1">
            <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Bot Telemetry</span>
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#EADFC7]/40">
                <span className="text-xs text-[#667085]">Engine Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    bot?.status === 'online'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      bot?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                    }`}
                  />
                  {bot?.status === 'online' ? 'Active & Live' : 'Disconnected'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#EADFC7]/40">
                <span className="text-xs text-[#667085]">Gateway Latency</span>
                <span className="text-xs font-mono font-semibold text-[#101828]">
                  {bot?.ping ? `${bot.ping}ms` : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#EADFC7]/40">
                <span className="text-xs text-[#667085]">Engine Uptime</span>
                <span className="text-xs font-mono font-semibold text-[#101828]">
                  {bot?.uptime
                    ? `${Math.floor(bot.uptime / 3600)}h ${Math.floor((bot.uptime % 3600) / 60)}m`
                    : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#EADFC7]/40">
                <span className="text-xs text-[#667085]">Members</span>
                <span className="text-xs font-mono font-semibold text-[#101828]">
                  {guild?.memberCount ? guild.memberCount.toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Active Modules Overview */}
          <Card className="p-6 bg-white border border-[#EADFC7]/60 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>Installed Modules Status</span>
              </h2>
              <Link
                href={`/dashboard/${guildId}/modules`}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                Configure All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {modules.map((m: any) => (
                <div
                  key={m.module}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    m.enabled
                      ? 'bg-amber-50/40 border-amber-200/80 text-[#101828]'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#98A2B3]'
                  }`}
                >
                  <span className="text-xs font-medium capitalize">
                    {m.module.toLowerCase()}
                  </span>
                  {m.enabled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#98A2B3] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
