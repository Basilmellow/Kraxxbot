import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollText, Clock, User, ArrowRight } from 'lucide-react';
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <ScrollText className="w-4 h-4 text-[#00f0ff]" />
          <span>Real-time Operational Audit</span>
        </CardTitle>
        <Link
          href="/dashboard/audit"
          className="text-xs text-[#00f0ff] hover:underline flex items-center gap-1 font-medium"
        >
          <span>Full Log</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>

      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#64748b]">Loading audit telemetry...</div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748b]">No recent audit activity recorded.</div>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#1e2a38]/80 transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={getActionBadgeVariant(item.action)}>
                    {item.action}
                  </Badge>
                  <span className="text-[#64748b] text-[11px] font-mono flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {item.executorId}
                  </span>
                </div>
                {item.details && (
                  <p className="text-[#94a3b8] truncate font-sans text-xs">{item.details}</p>
                )}
              </div>
              <div className="text-[10px] text-[#64748b] whitespace-nowrap font-mono flex items-center gap-1 pt-0.5">
                <Clock className="w-3 h-3" />
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
