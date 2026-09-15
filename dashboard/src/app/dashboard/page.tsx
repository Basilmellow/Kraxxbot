'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/dashboard/StatCard';
import { SystemStatusCard } from '@/components/dashboard/SystemStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { Card } from '@/components/ui/Card';
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
  Server,
  Plus,
  Bell,
  Sparkles,
  Search,
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

  const userName = session?.user?.displayName || session?.user?.name || 'anaya.velvet';

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
        title="Command Center"
        subtitle="Infrastructure diagnostics & subsystem telemetry"
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Welcome & Command Center Header Banner */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1.5">
              <span>Welcome back, {userName}</span>
              <span>👋</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight">
              KRAXX HQ Command Center
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Infrastructure diagnostics & subsystem telemetry
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>STATUS: ALL SYSTEMS OPERATIONAL</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#F3F5FA] border border-[#E5E7EB] text-[#475467] font-medium">
              ENV: <span className="text-indigo-600 font-semibold">PRODUCTION</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#F3F5FA] border border-[#E5E7EB] text-[#475467] font-mono text-[11px]">
              LAST SYNC: <span className="text-[#101828] font-semibold">{lastSyncTime || '04:06:49 PM'}</span>
            </div>
          </div>
        </div>

        {/* 5 Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Active Members"
            value={stats?.server?.memberCount || stats?.registeredMembers || '2,847'}
            subValue="+12 this week"
            icon={Users}
            variant="brand"
            trend="12 this week"
            sparklineData={[30, 35, 42, 48, 52, 60, 58, 68]}
          />
          <StatCard
            title="Support Tickets"
            value={stats?.tickets?.open ?? 18}
            subValue="3 open • 5 claimed"
            icon={Ticket}
            variant="cyan"
            trend="94% resolved"
            sparklineData={[22, 18, 25, 20, 24, 19, 17, 18]}
          />
          <StatCard
            title="Operational Tasks"
            value={stats?.tasks?.pending ?? 34}
            subValue="16 in progress"
            icon={CheckSquare}
            variant="security"
            trend="82% on-time"
            sparklineData={[15, 20, 25, 22, 28, 30, 32, 34]}
          />
          <StatCard
            title="Scheduled Meetings"
            value={stats?.meetings?.upcoming ?? 3}
            subValue="Next in 18m"
            icon={Calendar}
            variant="studio"
            trend="HQ Cadence"
            sparklineData={[2, 3, 2, 4, 3, 5, 4, 3]}
          />
          <StatCard
            title="HQ Announcements"
            value={stats?.announcements ?? 7}
            subValue="2 scheduled"
            icon={Megaphone}
            variant="warning"
            trend="Broadcasting"
            sparklineData={[4, 5, 3, 6, 5, 8, 6, 7]}
          />
        </div>

        {/* Infrastructure Health & Operating Divisions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SystemStatusCard status={status} isLoading={isLoading} />
          </div>

          <div className="xl:col-span-1">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
                  <h3 className="text-sm font-semibold text-[#101828]">
                    Operating Divisions
                  </h3>
                  <Link
                    href="/dashboard/roles"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                  >
                    <span>Manage Divisions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {/* KRAXXSEC */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#101828]">KRAXXSEC</div>
                        <div className="text-[11px] text-[#667085]">Security Engineering & Red Team</div>
                      </div>
                    </div>
                    <Badge variant="success">ACTIVE</Badge>
                  </div>

                  {/* KRAXX STUDIO */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#101828]">KRAXX STUDIO</div>
                        <div className="text-[11px] text-[#667085]">Digital Creative & Technology</div>
                      </div>
                    </div>
                    <Badge variant="studio">ACTIVE</Badge>
                  </div>

                  {/* KRAXX HQ */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        K
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#101828]">KRAXX HQ</div>
                        <div className="text-[11px] text-[#667085]">Operations, Automation & Control</div>
                      </div>
                    </div>
                    <Badge variant="brand">PRIVATE</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F1F3F9] flex items-center justify-between text-[11px] text-[#667085]">
                <span>Architecture</span>
                <span className="font-semibold text-indigo-600">Next.js 16 • PostgreSQL • Discord REST</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Activity, Quick Jump, & Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity
              activities={stats?.recentActivity || []}
              isLoading={isLoading}
            />
          </div>

          {/* Operations Command Jump */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
                  <h3 className="text-sm font-semibold text-[#101828]">
                    Operations Command Jump
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/dashboard/tickets"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Ticket className="w-4 h-4 text-orange-500" />
                    <span className="truncate">Tickets</span>
                  </Link>

                  <Link
                    href="/dashboard/members"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="truncate">Members</span>
                  </Link>

                  <Link
                    href="/dashboard/messages/embed"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span className="truncate">Embeds</span>
                  </Link>

                  <Link
                    href="/dashboard/meetings"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="truncate">Meetings</span>
                  </Link>

                  <Link
                    href="/dashboard/tasks"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <CheckSquare className="w-4 h-4 text-teal-500" />
                    <span className="truncate">Tasks</span>
                  </Link>

                  <Link
                    href="/dashboard/moderation"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="truncate">Moderation</span>
                  </Link>

                  <Link
                    href="/dashboard/announcements"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Megaphone className="w-4 h-4 text-purple-500" />
                    <span className="truncate">Announcements</span>
                  </Link>

                  <Link
                    href="/dashboard/audit"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="truncate">Audit Logs</span>
                  </Link>

                  <Link
                    href="/dashboard/automation"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <Zap className="w-4 h-4 text-violet-500" />
                    <span className="truncate">Automation</span>
                  </Link>

                  <Link
                    href="/dashboard/analytics"
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium group"
                  >
                    <BarChart3 className="w-4 h-4 text-cyan-500" />
                    <span className="truncate">Analytics</span>
                  </Link>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-[#F1F3F9] flex items-center justify-between text-xs text-[#667085]">
                <span>Command Palette</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F3F5FA] border border-[#E5E7EB] text-[11px] font-medium font-sans">
                  Ctrl + K
                </kbd>
              </div>
            </Card>
          </div>

          {/* Calendar Overview */}
          <div className="lg:col-span-1">
            <CalendarWidget />
          </div>
        </div>

        {/* Task Progress & System Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Progress Overview */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F1F3F9]">
              <h3 className="text-sm font-semibold text-[#101828]">
                Task Progress Overview
              </h3>
              <span className="text-xs text-[#667085]">This Week</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
              {/* Donut Chart Visual */}
              <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {/* Background Circle */}
                  <path
                    className="text-[#F3F5FA]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Completed Segment (70%) */}
                  <path
                    className="text-emerald-500"
                    strokeDasharray="70, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* In Progress Segment (20%) */}
                  <path
                    className="text-indigo-600"
                    strokeDasharray="20, 100"
                    strokeDashoffset="-70"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-bold text-[#101828]">70%</span>
                  <span className="text-[10px] text-[#667085]">Completed</span>
                </div>
              </div>

              {/* Breakdown Legend */}
              <div className="space-y-2.5 flex-1 w-full text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#475467]">Completed</span>
                  </div>
                  <span className="font-semibold text-[#101828]">70% (42)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-[#475467]">In Progress</span>
                  </div>
                  <span className="font-semibold text-[#101828]">20% (12)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[#475467]">Pending</span>
                  </div>
                  <span className="font-semibold text-[#101828]">10% (6)</span>
                </div>
              </div>

              {/* Weekly Activity Bars */}
              <div className="flex items-end gap-1.5 h-20 px-2 pt-2 border-l border-[#F1F3F9]">
                {[
                  { day: 'Mon', val: 40 },
                  { day: 'Tue', val: 65 },
                  { day: 'Wed', val: 85 },
                  { day: 'Thu', val: 70 },
                  { day: 'Fri', val: 90 },
                ].map((bar) => (
                  <div key={bar.day} className="flex flex-col items-center gap-1">
                    <div
                      className="w-3 rounded-t-sm bg-cyan-400"
                      style={{ height: `${bar.val}%` }}
                    />
                    <span className="text-[9px] text-[#98A2B3]">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* System Quick Actions */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F1F3F9]">
              <h3 className="text-sm font-semibold text-[#101828]">
                System Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/announcements"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span className="truncate">Send Announcement</span>
              </Link>

              <Link
                href="/dashboard/tickets"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Ticket className="w-4 h-4 text-emerald-600" />
                <span className="truncate">Create Ticket</span>
              </Link>

              <Link
                href="/dashboard/meetings"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="truncate">Schedule Meeting</span>
              </Link>

              <Link
                href="/dashboard/reminders"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="truncate">Add Reminder</span>
              </Link>

              <Link
                href="/dashboard/automation"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Zap className="w-4 h-4 text-cyan-600" />
                <span className="truncate">Run Automation</span>
              </Link>

              <Link
                href="/dashboard/tools"
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2.5 text-xs text-[#101828] font-medium"
              >
                <Server className="w-4 h-4 text-teal-600" />
                <span className="truncate">System Health</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
