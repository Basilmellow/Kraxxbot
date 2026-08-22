import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollText, Clock, User, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  action: string;
  executorId: string;
  targetId?: string | null;
  details?: string | null;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const getActionBadgeVariant = (action: string) => {
    if (action.includes('ASSIGN') || action.includes('SUCCESS') || action.includes('VERIFIED')) return 'success';
    if (action.includes('REMOVE') || action.includes('DELETE') || action.includes('KICK') || action.includes('BAN')) return 'danger';
    if (action.includes('CONFIG') || action.includes('UPDATE')) return 'warning';
    return 'brand';
  };

  return (
    <Card className="h-full bg-[#0A0F16]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>REAL-TIME AUDIT TELEMETRY</span>
          </span>
          <Link
            href="/dashboard/audit"
            className="text-[11px] font-mono text-[#22D3EE] hover:underline flex items-center gap-1 font-medium"
          >
            <span>VIEW FULL AUDIT</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </CardTitle>
      </CardHeader>

      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-[#64748B]">
            SYNCHRONIZING AUDIT TELEMETRY...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#64748B]">
            NO RECENT AUDIT EVENTS RECORDED IN CURRENT SESSION.
          </div>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#1E2C3F] transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#475569]" />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>

                  <Badge variant={getActionBadgeVariant(item.action)}>
                    {item.action}
                  </Badge>

                  <span className="text-[#94A3B8] text-[11px] font-mono flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-[#64748B]" />
                    <span>@{item.executorId}</span>
                  </span>
                </div>

                {item.details && (
                  <p className="text-[#94A3B8] text-xs font-sans truncate pl-1 border-l border-[#16202E] ml-0.5">
                    {item.details}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
