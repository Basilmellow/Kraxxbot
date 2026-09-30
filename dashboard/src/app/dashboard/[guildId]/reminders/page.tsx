'use client';
import { Tabs } from '@/components/ui/Tabs';

import { PageContainer } from '@/components/ui/Page';
import { Table } from '@/components/ui/Table';
import { Input, Textarea, Select } from '@/components/ui/Form';
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
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { AlarmClock, Plus, CheckCircle2, AlertTriangle, Repeat, Trash2 } from 'lucide-react';

interface ReminderItem {
  id: string;
  title: string;
  message: string;
  targetType: 'USER' | 'CHANNEL';
  targetId: string;
  cronPattern: string | null;
  triggerAt: string | null;
  isRecurring: boolean;
  status: 'ACTIVE' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  createdBy: string;
  createdAt: string;
}

const STATUSES = ['ALL', 'ACTIVE', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'];

export default function RemindersPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'CHANNEL' | 'USER'>('CHANNEL');
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerTime, setTriggerTime] = useState('');
  const [recurrence, setRecurrence] = useState('NONE');
  const [isCreating, setIsCreating] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchReminders = async () => {
    if (!guildId) return;
    try {
      const url = statusFilter === 'ALL'
        ? `/api/reminders?guildId=${guildId}`
        : `/api/reminders?status=${statusFilter}&guildId=${guildId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch (e) {
      console.error('Failed to load reminders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchReminders);
  }, [statusFilter, guildId]);

  useEffect(() => {
    if (!guildId) return;
    async function loadMeta() {
      try {
        const [metaRes, memRes] = await Promise.all([
          fetch(`/api/discord/meta?guildId=${guildId}`),
          fetch(`/api/members?guildId=${guildId}&limit=200`),
        ]);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          setChannels(metaData.channels || []);
          if (metaData.channels?.length > 0) setSelectedChannel(metaData.channels[0]);
        }
        if (memRes.ok) {
          const memData = await memRes.json();
          setMembers(memData.members || []);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, [guildId]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !guildId) return;

    let targetId = '';
    if (targetType === 'CHANNEL') {
      if (!selectedChannel) return;
      targetId = selectedChannel.id;
    } else {
      if (!selectedUserId) return;
      targetId = selectedUserId;
    }

    let triggerAt: string | undefined = undefined;
    if (triggerDate && triggerTime) {
      triggerAt = new Date(`${triggerDate}T${triggerTime}`).toISOString();
    }

    let cronPattern: string | undefined = undefined;
    if (recurrence === 'DAILY') cronPattern = '0 9 * * *';
    else if (recurrence === 'WEEKLY') cronPattern = '0 9 * * 1';
    else if (recurrence === 'MONTHLY') cronPattern = '0 9 1 * *';

    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          title: title.trim(),
          message: message.trim(),
          targetType,
          targetId,
          triggerAt,
          cronPattern,
          isRecurring: recurrence !== 'NONE',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Operational reminder scheduled.' });
        setShowCreateModal(false);
        setTitle('');
        setMessage('');
        fetchReminders();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to schedule reminder' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Reminder creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelReminder = async (id: string) => {
    if (!await confirm('Cancel this active reminder?')) return;
    try {
      const res = await fetch(`/api/reminders/${id}?guildId=${guildId}`, { method: 'DELETE' });
      if (res.ok) {
        setReminders(reminders.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
        setFeedback({ type: 'success', message: 'Reminder cancelled.' });
      }
    } catch (err) {
      console.error('Failed to cancel reminder:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">ACTIVE</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">SENDING</Badge>;
      case 'COMPLETED':
        return <Badge variant="neutral">FIRED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      case 'FAILED':
        return <Badge variant="danger">FAILED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Reminders"
        subtitle="Schedule channel messages and personal reminders."
      />

      <PageContainer className="space-y-6">
        {/* Filter Controls & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs label="Filter by status" items={STATUSES.map(item => ({ value: item, label: item }))} value={statusFilter} onChange={setStatusFilter} />

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Reminder</span>
          </Button>
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

        {/* Reminders Table Card */}
        <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
          <div className="p-5 border-b border-[var(--border-base)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlarmClock className="w-4 h-4 text-[var(--accent)]" />
              <span>Reminder Chrono Queue ({reminders.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={4} />
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={AlarmClock}
                title="No reminders currently scheduled"
                description="Create a one-off or recurring chron alert to notify channels or members automatically."
                actionLabel="Create Reminder"
                onAction={() => setShowCreateModal(true)}
              />
            </div>
          ) : (
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
              <Table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Reminder Title</th>
                    <th>Target Destination</th>
                    <th>Trigger Schedule</th>
                    <th>Cadence</th>
                    <th>Created By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((r) => (
                    <tr key={r.id}>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>
                        <div className="font-semibold text-[var(--text-primary)] text-[13px]">
                          {r.title}
                        </div>
                        <div className="text-[13px] text-[var(--text-secondary)] truncate max-w-xs mt-0.5">
                          {r.message}
                        </div>
                      </td>
                      <td>
                        <span className="text-[13px] font-mono text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-base)]">
                          {r.targetType === 'CHANNEL' ? `#${r.targetId}` : `@${r.targetId}`}
                        </span>
                      </td>
                      <td className="text-[13px] text-[var(--text-secondary)]">
                        {r.triggerAt ? new Date(r.triggerAt).toLocaleString() : r.cronPattern || 'Manual Trigger'}
                      </td>
                      <td>
                        {r.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-[13px] text-[var(--accent)] font-semibold">
                            <Repeat className="w-3 h-3" />
                            <span>Recurring</span>
                          </span>
                        ) : (
                          <span className="text-[13px] text-[var(--text-secondary)]">One-Time</span>
                        )}
                      </td>
                      <td className="text-[13px] text-[var(--text-secondary)]">
                        @{r.createdBy}
                      </td>
                      <td className="text-right">
                        {r.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelReminder(r.id)}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                            title="Cancel Reminder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Schedule Automated Reminder"
          subtitle="Configure one-off alert or recurring cron notice"
        >
          <form onSubmit={handleCreateReminder} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Reminder Subject
              </label>
              <Input aria-label="Reminder Subject"
                type="text"
                required
                placeholder="e.g. Weekly Security Sync Alert"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Notification Message
              </label>
              <Textarea aria-label="Notification Message"
                rows={3}
                required
                placeholder="Message to post when triggered..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-y"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-2">
                Target Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('CHANNEL')}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                    targetType === 'CHANNEL'
                      ? 'border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'border-[var(--border-base)] bg-[var(--surface-1)] text-[var(--text-secondary)]'
                  }`}
                >
                  Discord Channel
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('USER')}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                    targetType === 'USER'
                      ? 'border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'border-[var(--border-base)] bg-[var(--surface-1)] text-[var(--text-secondary)]'
                  }`}
                >
                  Direct Member DM
                </button>
              </div>
            </div>

            {targetType === 'CHANNEL' ? (
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={setSelectedChannel}
              />
            ) : (
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Target Member
                </label>
                <Select aria-label="Target Member"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full"
                  required
                >
                  <option value="">Select operator...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      @{m.displayName}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Trigger Date
                </label>
                <Input aria-label="Trigger Date"
                  type="date"
                  value={triggerDate}
                  onChange={(e) => setTriggerDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Trigger Time
                </label>
                <Input aria-label="Trigger Time"
                  type="time"
                  value={triggerTime}
                  onChange={(e) => setTriggerTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Recurrence Cadence
              </label>
              <Select aria-label="Recurrence Cadence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full"
              >
                <option value="NONE">One-Time Only</option>
                <option value="DAILY">Daily at 09:00 AM</option>
                <option value="WEEKLY">Weekly on Mondays</option>
                <option value="MONTHLY">Monthly on 1st</option>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreating}
              >
                Schedule Alert
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
