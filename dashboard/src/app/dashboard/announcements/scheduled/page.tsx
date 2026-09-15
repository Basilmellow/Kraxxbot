'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
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
        title="Scheduled Broadcast Queue"
        subtitle="Automated Future Dispatches & Dispatch History"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStatus === s
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <Link href="/dashboard/announcements">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Composer</span>
            </Button>
          </Link>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Scheduled List Card */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Broadcast Queue Items ({items.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Calendar}
                title="No scheduled announcements found"
                description="No upcoming broadcasts queued in the system for this filter."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Broadcast Title / Content</th>
                    <th>Target Channel</th>
                    <th>Scheduled For</th>
                    <th>Author</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <span className="text-[11px] font-semibold text-[#475467] bg-[#F3F5FA] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                          {item.department}
                        </span>
                      </td>
                      <td className="max-w-xs truncate font-medium text-[#101828]">
                        {item.title || item.content || 'Rich Embed Message'}
                      </td>
                      <td className="text-[#475467] font-mono text-[11px]">
                        #{item.channelId}
                      </td>
                      <td className="text-[#475467] text-xs">
                        {new Date(item.scheduledFor).toLocaleString()}
                      </td>
                      <td className="text-[#475467] text-xs">
                        @{item.createdBy}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id, item.title)}
                              className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Cancel Broadcast"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Detail Modal */}
        {detailItem && (
          <Modal
            isOpen={true}
            onClose={() => setDetailItem(null)}
            title={detailItem.title || 'Scheduled Broadcast Details'}
            subtitle={`Target: Channel #${detailItem.channelId} • Scheduled: ${new Date(detailItem.scheduledFor).toLocaleString()}`}
            maxWidth="2xl"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs">
                <div>
                  <span className="text-[#667085] block text-[10px] uppercase font-semibold">Status</span>
                  <div className="mt-1">{getStatusBadge(detailItem.status)}</div>
                </div>
                <div>
                  <span className="text-[#667085] block text-[10px] uppercase font-semibold">Department</span>
                  <span className="text-[#101828] font-medium mt-1 block">{detailItem.department}</span>
                </div>
              </div>

              {detailItem.content && (
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#101828] whitespace-pre-wrap">
                  {detailItem.content}
                </div>
              )}

              {detailItem.embedPayload && detailItem.embedPayload[0] && (
                <DiscordEmbedPreview embed={detailItem.embedPayload[0]} />
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
