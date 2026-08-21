import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Server, Database, Radio, Cpu } from 'lucide-react';

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
  const systems = [
    {
      name: 'Discord Bot Process',
      desc: 'Railway PM2 / Supervisor',
      status: status.bot,
      icon: Server,
    },
    {
      name: 'PostgreSQL Database',
      desc: 'Railway Managed Node',
      status: status.database,
      icon: Database,
    },
    {
      name: 'Discord Gateway & REST',
      desc: 'Discord API v10 Gateway',
      status: status.discord,
      icon: Radio,
    },
    {
      name: 'Background Scheduler',
      desc: 'Cron Engine Active',
      status: status.bot === 'online' ? 'online' : ('offline' as const),
      icon: Cpu,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Radio className="w-4 h-4 text-[#00f0ff]" />
          <span>System Infrastructure Status</span>
        </CardTitle>
        {status.lastChecked && (
          <span className="text-[10px] text-[#64748b] font-mono">
            {new Date(status.lastChecked).toLocaleTimeString()}
          </span>
        )}
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {systems.map((sys) => {
          const Icon = sys.icon;
          return (
            <div
              key={sys.name}
              className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-[#141a22] text-[#94a3b8]">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#e2e8f0]">{sys.name}</div>
                  <div className="text-[10px] text-[#64748b]">{sys.desc}</div>
                </div>
              </div>
              <StatusDot status={isLoading ? 'unknown' : (sys.status as 'online' | 'offline' | 'degraded' | 'unknown')} showPulse={sys.status === 'online'} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
