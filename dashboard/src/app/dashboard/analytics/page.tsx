'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  Ticket,
  CheckSquare,
  Shield,
  Clock,
  Activity,
  Layers,
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

  return (
    <div>
      <Topbar
        title="Operations Analytics"
        subtitle="Real-Time Telemetry, Support Throughput & Security Metrics"
        onRefresh={fetchAnalytics}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>Active Tickets</span>
              <Ticket className="w-4 h-4 text-[#00f0ff]" />
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0] font-mono">
              {data?.tickets?.open ?? 0}
            </div>
            <div className="text-[11px] text-[#64748b]">
              {data?.tickets?.total ?? 0} lifetime tickets
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>Tasks Velocity</span>
              <CheckSquare className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0] font-mono">
              {data?.tasks?.completed ?? 0} / {data?.tasks?.total ?? 0}
            </div>
            <div className="text-[11px] text-[#10b981]">
              {data?.tasks?.inProgress ?? 0} in active execution
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>Active Reminders</span>
              <Clock className="w-4 h-4 text-[#6366f1]" />
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0] font-mono">
              {data?.reminders?.active ?? 0}
            </div>
            <div className="text-[11px] text-[#64748b]">
              Automated scheduler active
            </div>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>Platform Audit Events</span>
              <Activity className="w-4 h-4 text-[#00f0ff]" />
            </div>
            <div className="text-2xl font-bold text-[#e2e8f0] font-mono">
              {data?.audit?.total ?? 0}
            </div>
            <div className="text-[11px] text-[#64748b]">
              Cryptographically logged
            </div>
          </Card>
        </div>

        {/* Breakdown Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Moderation Sanction Distribution */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Shield className="w-4 h-4 text-[#ef4444]" />
                <span>Moderation Sanctions Distribution</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3">
              {['WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'].map((act) => {
                const count = data?.moderation?.[act] ?? 0;
                return (
                  <div key={act} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#94a3b8]">{act}</span>
                      <span className="font-mono font-bold text-[#e2e8f0]">{count}</span>
                    </div>
                    <div className="w-full bg-[#1e2a38] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00f0ff]"
                        style={{ width: `${Math.min(100, count * 15)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Support Ticket Pipeline */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Ticket className="w-4 h-4 text-[#00f0ff]" />
                <span>Ticket Resolution Distribution</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94a3b8]">OPEN</span>
                  <span className="font-mono font-bold text-[#00f0ff]">{data?.tickets?.open ?? 0}</span>
                </div>
                <div className="w-full bg-[#1e2a38] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00f0ff]"
                    style={{ width: `${Math.min(100, (data?.tickets?.open ?? 0) * 20)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94a3b8]">CLAIMED</span>
                  <span className="font-mono font-bold text-[#6366f1]">{data?.tickets?.claimed ?? 0}</span>
                </div>
                <div className="w-full bg-[#1e2a38] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6366f1]"
                    style={{ width: `${Math.min(100, (data?.tickets?.claimed ?? 0) * 20)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94a3b8]">CLOSED</span>
                  <span className="font-mono font-bold text-[#10b981]">{data?.tickets?.closed ?? 0}</span>
                </div>
                <div className="w-full bg-[#1e2a38] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10b981]"
                    style={{ width: `${Math.min(100, (data?.tickets?.closed ?? 0) * 20)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
