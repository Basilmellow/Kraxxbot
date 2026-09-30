'use client';

import { PageContainer } from '@/components/ui/Page';
import { LoadingState } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { Ticket, CheckSquare, Clock, Activity, ShieldAlert } from 'lucide-react';

interface AnalyticsData {
  tickets: { total: number; open: number; claimed: number; closed: number };
  tasks: { total: number; completed: number; inProgress: number };
  meetings: { total: number };
  reminders: { active: number };
  audit: { total: number };
  moderation: Record<string, number>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  useEffect(() => {
    if (!guildId) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/analytics?guildId=${encodeURIComponent(guildId)}`);
        if (res.ok) {
          const json: AnalyticsData = await res.json();
          if (active) setData(json);
        }
      } catch {
        console.error('Failed to load analytics.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [guildId]);

  const totalMod = Object.values(data?.moderation || {}).reduce((total, count) => total + count, 0);

  if (isLoading) return <div><Topbar title="Analytics" subtitle="Review server activity and operational metrics." /><PageContainer><LoadingState label="Loading analytics" /></PageContainer></div>;
  if (!data) return <div><Topbar title="Analytics" subtitle="Review server activity and operational metrics." /><PageContainer><ErrorState title="Analytics unavailable" message="No analytics could be loaded for this server. Please try again." onRetry={() => window.location.reload()} /></PageContainer></div>;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Analytics"
        subtitle="Review server activity and operational metrics."
      />

      <PageContainer className="space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="ACTIVE DISPATCH TICKETS"
            value={data?.tickets?.open ?? 0}
            subValue={`${data?.tickets?.total ?? 0} TOTAL TICKETS`}
            icon={Ticket}
            variant="brand"
            trend={`${data?.tickets?.claimed ?? 0} CLAIMED`}
          />

          <StatCard
            title="TASK VELOCITY"
            value={`${data?.tasks?.completed ?? 0}/${data?.tasks?.total ?? 0}`}
            subValue={`${data?.tasks?.inProgress ?? 0} IN PROGRESS`}
            icon={CheckSquare}
            variant="security"
          />

          <StatCard
            title="SCHEDULED REMINDERS"
            value={data?.reminders?.active ?? 0}
            subValue="AUTOMATED QUEUE"
            icon={Clock}
            variant="studio"
          />

          <StatCard
            title="AUDIT LOG EVENTS"
            value={data?.audit?.total ?? 0}
            subValue="SECURITY TELEMETRY"
            icon={Activity}
            variant="brand"
          />
        </div>

        {/* Deep Dive Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-[13px]">
          {/* Ticket Resolution Pipeline */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Support Ticket Resolution Pipeline
                </h3>
              </div>
              <Badge variant="neutral">Snapshot</Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="text-[var(--text-secondary)]">Resolved Tickets</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {data?.tickets?.closed ?? 0} / {data?.tickets?.total ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--success)] rounded-full transition-colors duration-500"
                    style={{
                      width: `${
                        data?.tickets?.total
                          ? Math.round(((data?.tickets?.closed ?? 0) / data.tickets.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="text-[var(--text-secondary)]">Open / In Progress</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {data?.tickets?.open ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-colors duration-500"
                    style={{
                      width: `${
                        data?.tickets?.total
                          ? Math.round(((data?.tickets?.open ?? 0) / data.tickets.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Security & Moderation Sanctions */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Security Sanction Distribution
                </h3>
              </div>
              <Badge variant="danger">{totalMod} ACTIONS</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)]">
                <span className="text-[var(--text-secondary)] block text-[13px] font-medium">Bans Executed</span>
                <span className="text-lg font-bold text-[var(--danger)] mt-1 block">
                  {data?.moderation?.ban ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)]">
                <span className="text-[var(--text-secondary)] block text-[13px] font-medium">Timeouts Issued</span>
                <span className="text-lg font-bold text-[var(--accent)] mt-1 block">
                  {data?.moderation?.timeout ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)]">
                <span className="text-[var(--text-secondary)] block text-[13px] font-medium">Kicks Dispatched</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  {data?.moderation?.kick ?? 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)]">
                <span className="text-[var(--text-secondary)] block text-[13px] font-medium">Warnings Logged</span>
                <span className="text-lg font-bold text-[var(--accent)] mt-1 block">
                  {data?.moderation?.warn ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
