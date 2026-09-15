'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  BarChart3,
  TrendingUp,
  Ticket,
  CheckSquare,
  Shield,
  Clock,
  Activity,
  Layers,
  Users,
  ShieldAlert,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalMod = Object.values(data?.moderation || {}).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Operational Telemetry & Analytics"
        subtitle="Real-Time System Throughput, Support Metrics & Security Analytics"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            trend="STEADY"
          />

          <StatCard
            title="SCHEDULED REMINDERS"
            value={data?.reminders?.active ?? 0}
            subValue="AUTOMATED QUEUE"
            icon={Clock}
            variant="studio"
            trend="ACTIVE"
          />

          <StatCard
            title="AUDIT LOG EVENTS"
            value={data?.audit?.total ?? 0}
            subValue="SECURITY TELEMETRY"
            icon={Activity}
            variant="brand"
            trend="RECORDING"
          />
        </div>

        {/* Deep Dive Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Ticket Resolution Pipeline */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Support Ticket Resolution Pipeline
                </h3>
              </div>
              <Badge variant="brand">LIVE</Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#667085]">Resolved Tickets</span>
                  <span className="font-semibold text-[#101828]">
                    {data?.tickets?.resolved ?? 0} / {data?.tickets?.total ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#F3F5FA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        data?.tickets?.total
                          ? Math.round(((data?.tickets?.resolved ?? 0) / data.tickets.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#667085]">Open / In Progress</span>
                  <span className="font-semibold text-[#101828]">
                    {data?.tickets?.open ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#F3F5FA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
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
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Security Sanction Distribution
                </h3>
              </div>
              <Badge variant="danger">{totalMod} ACTIONS</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <span className="text-[#667085] block text-[11px] font-medium">Bans Executed</span>
                <span className="text-lg font-bold text-red-600 mt-1 block">
                  {data?.moderation?.ban ?? 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <span className="text-[#667085] block text-[11px] font-medium">Timeouts Issued</span>
                <span className="text-lg font-bold text-amber-600 mt-1 block">
                  {data?.moderation?.timeout ?? 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <span className="text-[#667085] block text-[11px] font-medium">Kicks Dispatched</span>
                <span className="text-lg font-bold text-[#101828] mt-1 block">
                  {data?.moderation?.kick ?? 0}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <span className="text-[#667085] block text-[11px] font-medium">Warnings Logged</span>
                <span className="text-lg font-bold text-indigo-600 mt-1 block">
                  {data?.moderation?.warn ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
