'use client';

import React, { useEffect, useState } from 'react';
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
  Megaphone,
  Activity,
  Shield,
  Layers,
  ExternalLink,
  MessageSquare,
  AlarmClock,
  DoorOpen,
  Zap,
  BarChart3,
  Search,
  Boxes,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>({
    bot: 'online',
    database: 'online',
    discord: 'online',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <div>
      <Topbar
        title="Command Center"
        subtitle="HQ Overview, Operational Diagnostics & Subsystem Telemetry"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      <div className="p-6 space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Guild Members"
            value={stats?.server?.memberCount || stats?.registeredMembers || 0}
            subValue={`${stats?.server?.onlineCount || 0} active now`}
            icon={Users}
            variant="brand"
            trend="Active Network"
          />
          <StatCard
            title="Active Support Tickets"
            value={stats?.tickets?.open || 0}
            subValue={`${stats?.tickets?.claimed || 0} in progress / ${stats?.tickets?.closed || 0} closed`}
            icon={Ticket}
            variant="security"
            trend={`${stats?.tickets?.total || 0} Lifetime`}
          />
          <StatCard
            title="Operational Tasks"
            value={stats?.tasks?.pending || 0}
            subValue={`${stats?.tasks?.inProgress || 0} in flight / ${stats?.tasks?.completed || 0} done`}
            icon={CheckSquare}
            variant="studio"
            trend={`${stats?.tasks?.total || 0} Managed`}
          />
          <StatCard
            title="Scheduled Meetings"
            value={stats?.meetings?.upcoming || 0}
            subValue={`${stats?.announcements || 0} HQ announcements`}
            icon={Calendar}
            variant="warning"
            trend="Ops Cadence"
          />
        </div>

        {/* Mid-Row: System Health & Operational Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SystemStatusCard status={status} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col justify-between">
              <CardHeader>
                <CardTitle>
                  <Layers className="w-4 h-4 text-[#00f0ff]" />
                  <span>HQ Operating Divisions</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                    <div>
                      <div className="text-xs font-semibold text-[#e2e8f0]">KRAXXSEC</div>
                      <div className="text-[10px] text-[#64748b]">Cybersecurity & Red Team Engineering</div>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]" />
                    <div>
                      <div className="text-xs font-semibold text-[#e2e8f0]">KRAXX STUDIO</div>
                      <div className="text-[10px] text-[#64748b]">Digital Creative & Tech Innovation</div>
                    </div>
                  </div>
                  <Badge variant="brand">Active</Badge>
                </div>

                <div className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
                    <div>
                      <div className="text-xs font-semibold text-[#e2e8f0]">KRAXX OPERATIONS HQ</div>
                      <div className="text-[10px] text-[#64748b]">Enterprise Infrastructure & Discord Automation</div>
                    </div>
                  </div>
                  <Badge variant="neutral">Private</Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1e2a38] flex items-center justify-between text-[11px] text-[#64748b]">
                <span>Platform Architecture</span>
                <span className="font-mono text-[#00f0ff]">Next.js + Prisma + Discord v10 REST</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Row: Audit Activity Feed & Live Subsystem Jump Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity
              activities={stats?.recentActivity || []}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full space-y-4">
              <CardHeader>
                <CardTitle>
                  <Activity className="w-4 h-4 text-[#00f0ff]" />
                  <span>Subsystem Operations Center</span>
                </CardTitle>
              </CardHeader>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/tickets"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span className="truncate">Ticket Desk</span>
                </Link>

                <Link
                  href="/dashboard/tasks"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="truncate">Task Board</span>
                </Link>

                <Link
                  href="/dashboard/members"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <Users className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span className="truncate">Members</span>
                </Link>

                <Link
                  href="/dashboard/meetings"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span className="truncate">Meetings</span>
                </Link>

                <Link
                  href="/dashboard/reminders"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <AlarmClock className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span className="truncate">Reminders</span>
                </Link>

                <Link
                  href="/dashboard/moderation"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <Shield className="w-3.5 h-3.5 text-[#ef4444]" />
                  <span className="truncate">Moderation</span>
                </Link>

                <Link
                  href="/dashboard/automation"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span className="truncate">Automation</span>
                </Link>

                <Link
                  href="/dashboard/analytics"
                  className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 transition-all flex items-center gap-2 text-xs text-[#e2e8f0] group"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="truncate">Analytics</span>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
