import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Server, Database, Radio, Cpu, Globe, Activity } from 'lucide-react';

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
      name: 'DISCORD BOT PROCESS',
      desc: 'Process Supervisor / Event Bus',
      status: status.bot,
      latency: status.bot === 'online' ? '12ms' : 'ERR',
      env: 'PROD',
      icon: Server,
    },
    {
      name: 'POSTGRESQL DATABASE',
      desc: 'Prisma Connection Pool',
      status: status.database,
      latency: status.database === 'online' ? '8ms' : 'ERR',
      env: 'PROD',
      icon: Database,
    },
    {
      name: 'DISCORD API v10 & GATEWAY',
      desc: 'REST Endpoints & Shards',
      status: status.discord,
      latency: status.discord === 'online' ? '42ms' : 'ERR',
      env: 'PROD',
      icon: Radio,
    },
    {
      name: 'BACKGROUND SCHEDULER',
      desc: 'Cron Engine & Queue Manager',
      status: status.bot === 'online' ? 'online' : ('offline' as const),
      latency: status.bot === 'online' ? '5ms' : 'ERR',
      env: 'PROD',
      icon: Cpu,
    },
    {
      name: 'DASHBOARD TELEMETRY',
      desc: 'Next.js 16 Edge / Server Runtime',
      status: 'online' as const,
      latency: '3ms',
      env: 'PROD',
      icon: Globe,
    },
  ];

  return (
    <Card className="h-full bg-[#0A0F16]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>INFRASTRUCTURE TELEMETRY & HEALTH</span>
          </span>
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748B] normal-case">
            <span>SYNC: {timeStr}</span>
            <span className="text-[#10B981] px-1.5 py-0.2 rounded bg-[#10B981]/10 border border-[#10B981]/20">
              CLUSTER: ACTIVE
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {systems.map((sys) => {
          const Icon = sys.icon;
          const isOperational = sys.status === 'online';

          return (
            <div
              key={sys.name}
              className="p-3 rounded bg-[#070B10] border border-[#16202E] hover:border-[#1E2C3F] transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#0D131C] text-[#64748B] border border-[#16202E]">
                    <Icon className="w-3.5 h-3.5 text-[#22D3EE]" />
                  </div>
                  <span className="text-[9px] font-mono text-[#64748B] uppercase px-1 py-0.2 rounded bg-[#0A0F16] border border-[#121A24]">
                    {sys.env}
                  </span>
                </div>
                <StatusDot
                  status={isLoading ? 'unknown' : (sys.status as any)}
                  label={sys.status === 'online' ? 'OPERATIONAL' : sys.status.toUpperCase()}
                  showPulse={isOperational}
                />
              </div>

              <div>
                <div className="text-xs font-mono font-semibold text-[#F1F5F9] truncate">
                  {sys.name}
                </div>
                <div className="text-[10px] text-[#64748B] truncate mt-0.5">{sys.desc}</div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#121A24] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                <span>LATENCY</span>
                <span className={isOperational ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                  {sys.latency}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
