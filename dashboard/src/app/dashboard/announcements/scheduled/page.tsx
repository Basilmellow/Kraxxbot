'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DiscordEmbedPreview } from '@/components/discord/DiscordEmbedPreview';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Edit3,
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
    if (!confirm(`Are you sure you want to cancel the scheduled announcement "${title || 'Untitled'}"?`)) return;

    try {
      const res = await fetch(`/api/announcements/scheduled/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, status: 'CANCELLED' } : i)));
        setFeedback({ type: 'success', message: 'Scheduled announcement cancelled successfully.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel announcement');
      }
    } catch (e: any) {
      alert(e.message || 'Error cancelling');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending Dispatch</Badge>;
      case 'SENT':
        return <Badge variant="success">Dispatched</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div>
      <Topbar
        title="Scheduled Announcements Queue"
        subtitle="Automated Dispatch Pipeline Powered by Bot Scheduler"
        onRefresh={fetchScheduled}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/announcements">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back to Composer</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {['ALL', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedStatus === st
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {st === 'ALL' ? 'All Records' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Scheduled Queue Table */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <Clock className="w-4 h-4 text-[#00f0ff]" />
              <span>Broadcast Pipeline ({items.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Polled by Railway Bot Engine every 60s
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Scheduled Target</th>
                  <th>Broadcast Title</th>
                  <th>Division</th>
                  <th>Target Channel</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-[#64748b]">
                      Loading scheduled queue...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-[#64748b]">
                      No scheduled announcements found in &quot;{selectedStatus}&quot;.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap font-mono text-xs text-[#e2e8f0]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#00f0ff]" />
                          <span>{new Date(item.scheduledFor).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="font-semibold text-xs text-[#e2e8f0] max-w-xs truncate">
                        {item.title || 'Untitled Broadcast'}
                      </td>

                      <td>
                        <span className="text-[11px] font-mono text-[#94a3b8]">{item.department}</span>
                      </td>

                      <td className="font-mono text-xs text-[#94a3b8]">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-[#64748b]" />
                          <span>{item.channelId}</span>
                        </div>
                      </td>

                      <td>{getStatusBadge(item.status)}</td>

                      <td className="font-mono text-xs text-[#64748b]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{item.createdBy}</span>
                        </div>
                      </td>

                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#00f0ff]"
                            title="Inspect Payload"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id, item.title)}
                              className="p-1.5 rounded hover:bg-[#141a22] text-[#64748b] hover:text-[#ef4444]"
                              title="Cancel Scheduled Broadcast"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail & Preview Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#e2e8f0]">Scheduled Announcement Detail</h3>
                <span className="text-[11px] font-mono text-[#64748b]">ID: {detailItem.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                <div>
                  <span className="text-[#64748b]">Target Channel ID:</span>
                  <p className="font-mono text-[#e2e8f0] font-semibold">{detailItem.channelId}</p>
                </div>
                <div>
                  <span className="text-[#64748b]">Scheduled Dispatch Time:</span>
                  <p className="font-mono text-[#00f0ff] font-semibold">{new Date(detailItem.scheduledFor).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[#64748b]">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(detailItem.status)}</div>
                </div>
                <div>
                  <span className="text-[#64748b]">Mention Level:</span>
                  <p className="font-mono text-[#e2e8f0]">{detailItem.mentionType || 'NONE'}</p>
                </div>
              </div>

              {detailItem.error && (
                <div className="p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]">
                  <strong>Execution Failure Log:</strong> {detailItem.error}
                </div>
              )}

              {/* Render Embed Payload if available */}
              {detailItem.embedPayload && detailItem.embedPayload.length > 0 ? (
                <div className="space-y-1.5 pt-2">
                  <span className="font-semibold text-[#94a3b8] uppercase">Dispatched Embed Preview:</span>
                  <DiscordEmbedPreview embed={detailItem.embedPayload[0]} />
                </div>
              ) : (
                detailItem.content && (
                  <div className="p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                    <span className="font-semibold text-[#94a3b8]">Text Content:</span>
                    <p className="whitespace-pre-wrap text-[#e2e8f0] mt-1">{detailItem.content}</p>
                  </div>
                )
              )}
            </div>

            <div className="pt-3 border-t border-[#1e2a38] flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailItem(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
