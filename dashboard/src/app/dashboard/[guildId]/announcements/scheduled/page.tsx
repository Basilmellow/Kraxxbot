'use client';

import { PageContainer } from '@/components/ui/Page';
import { Table } from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { DiscordEmbedPreview } from '@/components/discord/DiscordEmbedPreview';
import type { DiscordEmbedData } from '@/components/discord/DiscordEmbedPreview';
import { Clock, Calendar, CheckCircle2, AlertTriangle, Eye, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ScheduledItem {
  id: string;
  guildId: string;
  channelId: string;
  title: string | null;
  content: string | null;
  embedPayload: DiscordEmbedData[] | null;
  mentionType: string | null;
  department: string;
  scheduledFor: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'CANCELLED' | 'FAILED';
  createdBy: string;
  sentAt: string | null;
  error: string | null;
  messageId: string | null;
  createdAt: string;
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED'];

export default function ScheduledAnnouncementsPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();

  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [detailItem, setDetailItem] = useState<ScheduledItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchScheduled = async () => {
    if (!guildId) return;
    try {
      const url = selectedStatus === 'ALL'
        ? `/api/announcements/scheduled?guildId=${guildId}`
        : `/api/announcements/scheduled?status=${selectedStatus}&guildId=${guildId}`;
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
    void Promise.resolve().then(fetchScheduled);
  }, [selectedStatus, guildId]);

  const handleCancel = async (id: string, title?: string | null) => {
    if (!await confirm(`Cancel scheduled broadcast "${title || 'Untitled'}"?`)) return;

    try {
      const res = await fetch(`/api/announcements/scheduled/${id}?guildId=${encodeURIComponent(guildId)}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, status: 'CANCELLED' } : i)));
        setFeedback({ type: 'success', message: 'Broadcast cancelled.' });
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to cancel broadcast' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Cancellation error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'SENT':
        return <Badge variant="success">DISPATCHED</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">SENDING</Badge>;
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
        title="Scheduled announcements"
        subtitle="Review upcoming broadcasts and delivery history."
      />

      <PageContainer className="space-y-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-[var(--surface-1)] border border-[var(--border-base)] ">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  selectedStatus === s
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <Link href={`/dashboard/${guildId}/announcements`} className="kraxx-btn kraxx-btn-secondary kraxx-btn-sm flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Composer</span>
            </Link>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-[13px] ${
              feedback.type === 'success'
                ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]'
                : 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--success)]" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--danger)]" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Scheduled List Card */}
        <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
          <div className="p-5 border-b border-[var(--border-base)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
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
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
              <Table className="kraxx-table">
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
                        <span className="text-[13px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-base)]">
                          {item.department}
                        </span>
                      </td>
                      <td className="max-w-xs truncate font-medium text-[var(--text-primary)]">
                        {item.title || item.content || 'Rich Embed Message'}
                      </td>
                      <td className="text-[var(--text-secondary)] font-mono text-[13px]">
                        #{item.channelId}
                      </td>
                      <td className="text-[var(--text-secondary)] text-[13px]">
                        {new Date(item.scheduledFor).toLocaleString()}
                      </td>
                      <td className="text-[var(--text-secondary)] text-[13px]">
                        @{item.createdBy}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(item.id, item.title)}
                              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
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
              </Table>
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
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px]">
                <div>
                  <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Status</span>
                  <div className="mt-1">{getStatusBadge(detailItem.status)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Department</span>
                  <span className="text-[var(--text-primary)] font-medium mt-1 block">{detailItem.department}</span>
                </div>
              </div>

              {detailItem.content && (
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px] text-[var(--text-primary)] whitespace-pre-wrap">
                  {detailItem.content}
                </div>
              )}

              {detailItem.embedPayload && detailItem.embedPayload[0] && (
                <DiscordEmbedPreview embed={detailItem.embedPayload[0]} />
              )}
            </div>
          </Modal>
        )}
      </PageContainer>
    </div>
  );
}
