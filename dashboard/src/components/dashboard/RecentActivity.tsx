import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  Ticket,
  Megaphone,
  UserPlus,
  CheckCircle2,
  Clock,
  ArrowRight,
  ScrollText,
} from 'lucide-react';
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

const DEFAULT_MOCK_ACTIVITIES = [
  {
    id: '1',
    time: '04:05:21',
    action: 'ROLE_ASSIGN',
    target: '@anaya.velvet',
    status: 'Management Head',
    variant: 'studio' as const,
    icon: ShieldCheck,
    iconColor: 'text-violet-600 bg-violet-50',
  },
  {
    id: '2',
    time: '04:04:03',
    action: 'TICKET_CLAIM',
    target: '#0091 Website Support',
    status: '@operator',
    variant: 'cyan' as const,
    icon: Ticket,
    iconColor: 'text-cyan-600 bg-cyan-50',
  },
  {
    id: '3',
    time: '04:01:11',
    action: 'ANNOUNCEMENT',
    target: '#general',
    status: 'Published',
    variant: 'warning' as const,
    icon: Megaphone,
    iconColor: 'text-amber-600 bg-amber-50',
  },
  {
    id: '4',
    time: '03:59:47',
    action: 'MEMBER_JOIN',
    target: '@new_user',
    status: 'Client',
    variant: 'warning' as const,
    icon: UserPlus,
    iconColor: 'text-orange-600 bg-orange-50',
  },
  {
    id: '5',
    time: '03:58:02',
    action: 'TASK_UPDATE',
    target: 'Design new dashboard',
    status: 'Completed',
    variant: 'brand' as const,
    icon: CheckCircle2,
    iconColor: 'text-indigo-600 bg-indigo-50',
  },
];

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const getActionDetails = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('ROLE') || act.includes('CLEARANCE')) {
      return { variant: 'studio' as const, icon: ShieldCheck, iconColor: 'text-violet-600 bg-violet-50' };
    }
    if (act.includes('TICKET')) {
      return { variant: 'cyan' as const, icon: Ticket, iconColor: 'text-cyan-600 bg-cyan-50' };
    }
    if (act.includes('ANNOUNC') || act.includes('MESSAGE')) {
      return { variant: 'warning' as const, icon: Megaphone, iconColor: 'text-amber-600 bg-amber-50' };
    }
    if (act.includes('JOIN') || act.includes('MEMBER')) {
      return { variant: 'warning' as const, icon: UserPlus, iconColor: 'text-orange-600 bg-orange-50' };
    }
    if (act.includes('TASK')) {
      return { variant: 'brand' as const, icon: CheckCircle2, iconColor: 'text-indigo-600 bg-indigo-50' };
    }
    return { variant: 'neutral' as const, icon: ScrollText, iconColor: 'text-slate-600 bg-slate-50' };
  };

  const displayList = activities && activities.length > 0 ? activities : null;

  return (
    <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
        <h3 className="text-sm font-semibold text-[#101828]">
          Recent Activity
        </h3>
        <Link
          href="/dashboard/audit"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
        >
          <span>View Full Audit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#F1F3F9]">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#667085]">
            Synchronizing activity telemetry...
          </div>
        ) : displayList ? (
          displayList.slice(0, 5).map((item) => {
            const details = getActionDetails(item.action);
            const Icon = details.icon;
            const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg ${details.iconColor} flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-mono text-[#667085] flex-shrink-0">
                    {timeFormatted}
                  </span>
                  <Badge variant={details.variant}>
                    {item.action}
                  </Badge>
                  <span className="text-xs font-medium text-[#101828] truncate">
                    {item.details || item.targetId || `@${item.executorId}`}
                  </span>
                </div>

                <div className="text-[11px] text-[#667085] flex-shrink-0 text-right">
                  @{item.executorId}
                </div>
              </div>
            );
          })
        ) : (
          DEFAULT_MOCK_ACTIVITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg ${item.iconColor} flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-mono text-[#667085] flex-shrink-0">
                    {item.time}
                  </span>
                  <Badge variant={item.variant}>
                    {item.action}
                  </Badge>
                  <span className="text-xs font-medium text-[#101828] truncate">
                    {item.target}
                  </span>
                </div>

                <div className="text-[11px] text-[#667085] flex-shrink-0 text-right">
                  {item.status}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
