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
        title="OPERATIONAL TELEMETRY & ANALYTICS"
        subtitle="Real-Time System Throughput, Support Metrics & Security Analytics"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* Ticket Resolution Pipeline */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>SUPPORT TICKET RESOLUTION PIPELINE</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94A3B8]">OPEN TICKETS (AWAITING AGENT)</span>
                  <span className="font-bold text-[#F59E0B]">{data?.tickets?.open ?? 0}</span>
                </div>
                <div className="w-full bg-[#070B10] h-2 rounded overflow-hidden border border-[#16202E]">
                  <div
                    className="bg-[#F59E0B] h-full"
                    style={{
                      width: `${
                        data?.tickets?.total ? ((data.tickets.open || 0) / data.tickets.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94A3B8]">CLAIMED & UNDER INVESTIGATION</span>
                  <span className="font-bold text-[#22D3EE]">{data?.tickets?.claimed ?? 0}</span>
                </div>
                <div className="w-full bg-[#070B10] h-2 rounded overflow-hidden border border-[#16202E]">
                  <div
                    className="bg-[#22D3EE] h-full"
                    style={{
                      width: `${
                        data?.tickets?.total ? ((data.tickets.claimed || 0) / data.tickets.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94A3B8]">RESOLVED & CLOSED</span>
                  <span className="font-bold text-[#10B981]">{data?.tickets?.closed ?? 0}</span>
                </div>
                <div className="w-full bg-[#070B10] h-2 rounded overflow-hidden border border-[#16202E]">
                  <div
                    className="bg-[#10B981] h-full"
                    style={{
                      width: `${
                        data?.tickets?.total ? ((data.tickets.closed || 0) / data.tickets.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Security & Disciplinary Sanctions Breakdown */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>KRAXXSEC DISCIPLINARY SANCTION METRICS</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">WARNINGS</span>
                  <span className="text-lg font-bold text-[#F59E0B]">
                    {data?.moderation?.WARN ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">TIMEOUTS</span>
                  <span className="text-lg font-bold text-[#94A3B8]">
                    {data?.moderation?.TIMEOUT ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">KICKS</span>
                  <span className="text-lg font-bold text-[#EF4444]">
                    {data?.moderation?.KICK ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">BANS</span>
                  <span className="text-lg font-bold text-[#EF4444]">
                    {data?.moderation?.BAN ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">UNBANS</span>
                  <span className="text-lg font-bold text-[#10B981]">
                    {data?.moderation?.UNBAN ?? 0}
                  </span>
                </div>

                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase block">TOTAL SANCTIONS</span>
                  <span className="text-lg font-bold text-[#22D3EE]">{totalMod}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
