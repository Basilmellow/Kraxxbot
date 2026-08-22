'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { DiscordEmbedPreview } from '@/components/discord/DiscordEmbedPreview';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Hash,
  User,
  ArrowLeft,
  Filter,
  X,
  Radio,
} from 'lucide-react';
import Link from 'next/link';

interface ScheduledItem {
  id: string;
  guildId: string;
  channelId: string;
  title: string | null;
  content: string | null;
  embedPayload: any[] | null;
  mentionType: string | null;
  department: string;
  scheduledFor: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  createdBy: string;
  sentAt: string | null;
  error: string | null;
  messageId: string | null;
  createdAt: string;
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'SENT', 'CANCELLED', 'FAILED'];

export default function ScheduledAnnouncementsPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<ScheduledItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchScheduled = async () => {
    try {
      setIsLoading(true);
      const url = selectedStatus === 'ALL' ? '/api/announcements/scheduled' : `/api/announcements/scheduled?status=${selectedStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.scheduled || []);
      }
    } catch (e) {
      console.error('Failed to load scheduled announcements:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, [selectedStatus]);

  const handleCancel = async (id: string, title?: string | null) => {
    if (!confirm(`Cancel scheduled broadcast "${title || 'Untitled'}"?`)) return;

    try {
      const res = await fetch(`/api/announcements/scheduled/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, status: 'CANCELLED' } : i)));
        setFeedback({ type: 'success', message: 'Broadcast cancelled.' });
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to cancel broadcast' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Cancellation error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'SENT':
        return <Badge variant="success">DISPATCHED</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">CANCELLED</Badge>;
      case 'FAILED':
        return <Badge variant="danger">FAILED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="SCHEDULED BROADCAST QUEUE"
        subtitle="Automated Announcement Dispatch Schedule & Execution Telemetry"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/announcements">
              <Button variant="ghost" size="sm" className="font-mono text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>COMPOSER</span>
              </Button>
            </Link>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded bg-[#0A0F16] border border-[#16202E] font-mono text-xs">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedStatus === s
                      ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded bg-[#0A0F16] border flex items-start gap-3 font-mono text-xs ${
              feedback.type === 'success'
                ? 'border-[#10B981]/40 text-[#10B981]'
                : 'border-[#EF4444]/40 text-[#EF4444]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Scheduled List Table */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>SCHEDULED TELEMETRY QUEUE ({items.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Clock}
                title="NO SCHEDULED BROADCASTS"
                description="There are currently no announcements queued for automated dispatch."
                action={
                  <Link href="/dashboard/announcements">
                    <Button variant="outline" size="sm" className="font-mono text-xs">
                      SCHEDULE AN ANNOUNCEMENT
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">STATUS</th>
                    <th className="py-2.5 px-4 font-semibold">SCHEDULED DISPATCH</th>
                    <th className="py-2.5 px-4 font-semibold">DIVISION</th>
                    <th className="py-2.5 px-4 font-semibold">HEADLINE</th>
                    <th className="py-2.5 px-4 font-semibold">TARGET CHANNEL</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3 px-4 text-[#F1F5F9]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#22D3EE]" />
                          <span>{new Date(item.scheduledFor).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.department === 'KRAXXSEC'
                              ? 'success'
                              : item.department === 'KRAXX_STUDIO'
                              ? 'studio'
                              : 'brand'
                          }
                        >
                          {item.department}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9] font-bold max-w-xs truncate">
                        {item.title || 'Untitled Broadcast'}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        <span className="bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E]">
                          #{item.channelId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#94A3B8] hover:text-[#22D3EE] hover:border-[#22D3EE]/30 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id, item.title)}
                              className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                              title="Cancel Broadcast"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Detail Inspector Modal */}
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
                    {detailItem.title || 'SCHEDULED BROADCAST INSPECTOR'}
                  </h3>
                  {getStatusBadge(detailItem.status)}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">SCHEDULED FOR</span>
                    <span className="text-[#F1F5F9]">{new Date(detailItem.scheduledFor).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">TARGET CHANNEL</span>
                    <span className="text-[#F1F5F9]">#{detailItem.channelId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">OPERATOR ID</span>
                    <span className="text-[#F1F5F9]">{detailItem.createdBy}</span>
                  </div>
                </div>

                {detailItem.content && (
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block mb-1">CONTENT BODY</span>
                    <div className="p-3 rounded bg-[#070B10] border border-[#16202E] text-[#F1F5F9] whitespace-pre-wrap">
                      {detailItem.content}
                    </div>
                  </div>
                )}

                {detailItem.embedPayload && detailItem.embedPayload.length > 0 && (
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block mb-1">EMBED PREVIEW</span>
                    <DiscordEmbedPreview embed={detailItem.embedPayload[0]} />
                  </div>
                )}

                {detailItem.error && (
                  <div className="p-3 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">
                    <span className="font-bold">EXECUTION ERROR:</span> {detailItem.error}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#16202E]">
                <Button variant="ghost" size="sm" onClick={() => setDetailItem(null)}>
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
