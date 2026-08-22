'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { SystemStatusCard } from '@/components/dashboard/SystemStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Ticket,
  CheckSquare,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  MessageSquare,
  Megaphone,
  Clock,
  Zap,
  BarChart3,
  Activity,
  Terminal,
  Server,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { ROLE_TIER_LABELS } from '@/lib/constants';

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>({
    bot: 'online',
    database: 'online',
    discord: 'online',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const operatorRole = session?.user?.roleTierName
    ? ROLE_TIER_LABELS[session.user.roleTierName] || session.user.roleTierName
    : 'Management Head';

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, statusRes] = await Promise.all([
        fetch('/api/server'),
        fetch('/api/status'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="COMMAND CENTER"
        subtitle="HQ Overview, Infrastructure Diagnostics & Subsystem Telemetry"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto">
        {/* Command Center Status Banner */}
        <div className="p-4 rounded-md bg-[#0A0F16] border border-[#16202E] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-subtle" />
              <h2 className="text-sm font-bold font-mono text-[#F1F5F9] uppercase tracking-wider">
                KRAXX HQ // PRIVATE OPERATIONS CONTROL
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans">
              Subsystem nodes synchronized. Role clearance enforced for internal operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <div className="px-2.5 py-1 rounded bg-[#070B10] border border-[#16202E] text-[#64748B]">
              STATUS: <span className="text-[#10B981] font-semibold">ALL OPERATIONAL</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#070B10] border border-[#16202E] text-[#64748B]">
              ENV: <span className="text-[#22D3EE] font-semibold">PRODUCTION</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#070B10] border border-[#16202E] text-[#64748B]">
              LAST SYNC: <span className="text-[#F1F5F9]">{lastSyncTime || '--:--:--'}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#070B10] border border-[#16202E] text-[#64748B]">
              OPERATOR: <span className="text-[#22D3EE]">{session?.user?.displayName || 'Operator'}</span>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            title="Active Guild Members"
            tag="NETWORK"
            value={stats?.server?.memberCount || stats?.registeredMembers || 0}
            subValue={`${stats?.server?.onlineCount || 0} operators active in Discord`}
            icon={Users}
            variant="brand"
            trend="TELEMETRY // SYNCED"
          />
          <StatCard
            title="Support Tickets"
            tag="DESK"
            value={stats?.tickets?.open || 0}
            subValue={`${stats?.tickets?.claimed || 0} claimed / ${stats?.tickets?.closed || 0} resolved`}
            icon={Ticket}
            variant="security"
            trend={`${stats?.tickets?.total || 0} LIFETIME`}
          />
          <StatCard
            title="Operational Tasks"
            tag="PIPELINE"
            value={stats?.tasks?.pending || 0}
            subValue={`${stats?.tasks?.inProgress || 0} in-flight / ${stats?.tasks?.completed || 0} completed`}
            icon={CheckSquare}
            variant="studio"
            trend={`${stats?.tasks?.total || 0} TOTAL`}
          />
          <StatCard
            title="Scheduled Meetings"
            tag="CADENCE"
            value={stats?.meetings?.upcoming || 0}
            subValue={`${stats?.announcements || 0} broadcasts scheduled`}
            icon={Calendar}
            variant="warning"
            trend="HQ SYNC"
          />
        </div>

        {/* System Telemetry & Operating Divisions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SystemStatusCard status={status} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full bg-[#0A0F16] flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>OPERATING DIVISIONS</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-2.5">
                {/* KRAXXSEC */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    <div>
                      <div className="text-xs font-mono font-bold text-[#F1F5F9]">KRAXXSEC</div>
                      <div className="text-[10px] text-[#64748B]">Security Engineering & Red Team</div>
                    </div>
                  </div>
                  <Badge variant="success">ACTIVE</Badge>
                </div>

                {/* KRAXX STUDIO */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#818CF8] shadow-[0_0_6px_rgba(129,140,248,0.6)]" />
                    <div>
                      <div className="text-xs font-mono font-bold text-[#F1F5F9]">KRAXX STUDIO</div>
                      <div className="text-[10px] text-[#64748B]">Digital Creative & Technology</div>
                    </div>
                  </div>
                  <Badge variant="studio">ACTIVE</Badge>
                </div>

                {/* KRAXX HQ */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                    <div>
                      <div className="text-xs font-mono font-bold text-[#F1F5F9]">KRAXX HQ</div>
                      <div className="text-[10px] text-[#64748B]">Operations, Automation & Control</div>
                    </div>
                  </div>
                  <Badge variant="brand">PRIVATE</Badge>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#16202E] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                <span>ARCHITECTURE</span>
                <span className="text-[#22D3EE]">Next.js 16 + Prisma + Discord v10</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Audit Activity Feed & Subsystem Fast Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <RecentActivity
              activities={stats?.recentActivity || []}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full bg-[#0A0F16] flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>OPERATIONS COMMAND JUMP</span>
                </CardTitle>
              </CardHeader>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/tickets"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#22D3EE]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span className="truncate">TICKETS</span>
                </Link>

                <Link
                  href="/dashboard/tasks"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#10B981]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="truncate">TASKS</span>
                </Link>

                <Link
                  href="/dashboard/members"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#818CF8]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <Users className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span className="truncate">MEMBERS</span>
                </Link>

                <Link
                  href="/dashboard/moderation"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#EF4444]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span className="truncate">MODERATION</span>
                </Link>

                <Link
                  href="/dashboard/messages/embed"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#22D3EE]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span className="truncate">EMBEDS</span>
                </Link>

                <Link
                  href="/dashboard/announcements"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#F59E0B]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="truncate">BROADCAST</span>
                </Link>

                <Link
                  href="/dashboard/meetings"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#38BDF8]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="truncate">MEETINGS</span>
                </Link>

                <Link
                  href="/dashboard/analytics"
                  className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#10B981]/40 transition-colors flex items-center gap-2 text-xs text-[#F1F5F9] font-mono group"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="truncate">ANALYTICS</span>
                </Link>
              </div>

              <div className="pt-3 mt-3 border-t border-[#16202E] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                <span>KEYBOARD SHORTCUT</span>
                <span className="text-[#F1F5F9] bg-[#070B10] px-1.5 py-0.5 rounded border border-[#16202E]">
                  CTRL + K
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
