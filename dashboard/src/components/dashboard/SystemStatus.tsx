import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Server, Database, Radio, Cpu, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SystemStatusProps {
  status: {
    bot: 'online' | 'offline' | 'degraded';
    database: 'online' | 'offline' | 'degraded';
    discord: 'online' | 'offline' | 'degraded';
    lastChecked?: string;
  };
  isLoading?: boolean;
}

export function SystemStatusCard({ status, isLoading }: SystemStatusProps) {
  const now = new Date();
  const timeStr = status.lastChecked
    ? new Date(status.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const systems = [
    {
      name: 'Discord Bot',
      status: status.bot,
      statusLabel: 'OPERATIONAL',
      metric: '42ms',
      metricLabel: 'Latency',
      icon: Server,
      iconColor: 'text-violet-600 bg-violet-50 border-violet-100',
      sparkline: [20, 24, 22, 28, 25, 29, 26, 30],
      stroke: '#8B5CF6',
    },
    {
      name: 'PostgreSQL DB',
      status: status.database,
      statusLabel: 'OPERATIONAL',
      metric: '18ms',
      metricLabel: 'Latency',
      icon: Database,
      iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      sparkline: [12, 14, 13, 16, 15, 18, 17, 18],
      stroke: '#06B6D4',
    },
    {
      name: 'Discord API',
      status: status.discord,
      statusLabel: 'OPERATIONAL',
      metric: '38ms',
      metricLabel: 'Latency',
      icon: Radio,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      sparkline: [30, 32, 35, 34, 38, 36, 39, 38],
      stroke: '#4F46E5',
    },
    {
      name: 'Scheduler',
      status: status.bot === 'online' ? 'online' : ('offline' as const),
      statusLabel: 'OPERATIONAL',
      metric: '04:07 PM',
      metricLabel: 'Next Run',
      icon: Cpu,
      iconColor: 'text-sky-600 bg-sky-50 border-sky-100',
      sparkline: [10, 15, 12, 18, 16, 20, 19, 22],
      stroke: '#0284C7',
    },
    {
      name: 'Dashboard',
      status: 'online' as const,
      statusLabel: 'OPERATIONAL',
      metric: '99.9%',
      metricLabel: 'Uptime',
      icon: Globe,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      sparkline: [98, 99, 99, 99, 100, 99, 100, 100],
      stroke: '#10B981',
      version: 'v2.4.0',
    },
  ];

  return (
    <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F3F9]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[#101828]">
            Infrastructure & Subsystem Health
          </h3>
        </div>
        <Link
          href="/dashboard/tools"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
        >
          <span>View All Systems</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {systems.map((sys) => {
          const Icon = sys.icon;
          const isOperational = sys.status === 'online';

          // mini sparkline path
          const minVal = Math.min(...sys.sparkline);
          const maxVal = Math.max(...sys.sparkline);
          const range = maxVal - minVal || 1;
          const width = 100;
          const height = 22;
          const points = sys.sparkline
            .map((val, idx) => {
              const x = (idx / (sys.sparkline.length - 1)) * width;
              const y = height - ((val - minVal) / range) * (height - 4) - 2;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div
              key={sys.name}
              className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`p-1.5 rounded-lg border ${sys.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant={isOperational ? 'success' : 'danger'}>
                    {isOperational ? 'OPERATIONAL' : 'DEGRADED'}
                  </Badge>
                </div>

                <div className="text-xs font-semibold text-[#101828]">
                  {sys.name}
                </div>
                {sys.version && (
                  <div className="text-[10px] text-[#667085] mt-0.5">
                    {sys.version}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#E5E7EB]/60">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#101828]">
                    {sys.metric}
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    {sys.metricLabel}
                  </span>
                </div>

                <div className="w-full h-5">
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke={sys.stroke}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
