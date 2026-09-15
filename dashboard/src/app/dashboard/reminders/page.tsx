'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  AlarmClock,
  Plus,
  Calendar,
  User,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Trash2,
  XCircle,
  Clock,
} from 'lucide-react';

interface ReminderItem {
  id: string;
  title: string;
  message: string;
  targetType: 'USER' | 'CHANNEL';
  targetId: string;
  cronPattern: string | null;
  triggerAt: string | null;
  isRecurring: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
}

const STATUSES = ['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function RemindersPage() {
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

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter === 'ALL' ? '/api/reminders' : `/api/reminders?status=${statusFilter}`;
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
    fetchReminders();
  }, [statusFilter]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [metaRes, memRes] = await Promise.all([
          fetch('/api/discord/meta'),
          fetch('/api/members?limit=200'),
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
  }, []);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reminder creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelReminder = async (id: string) => {
    if (!confirm('Cancel this active reminder?')) return;
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
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
      case 'COMPLETED':
        return <Badge variant="neutral">FIRED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Automated Reminders & Chrono Alerts"
        subtitle="Time-Based Push Notifications, DM Alerts & Recurring Cron Triggers"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Filter Controls & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Reminder</span>
          </Button>
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

        {/* Reminders Table Card */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <AlarmClock className="w-4 h-4 text-indigo-600" />
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
            <div className="overflow-x-auto">
              <table className="kraxx-table">
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
                        <div className="font-semibold text-[#101828] text-xs">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-[#667085] truncate max-w-xs mt-0.5">
                          {r.message}
                        </div>
                      </td>
                      <td>
                        <span className="text-[11px] font-mono text-[#475467] bg-[#F3F5FA] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                          {r.targetType === 'CHANNEL' ? `#${r.targetId}` : `@${r.targetId}`}
                        </span>
                      </td>
                      <td className="text-xs text-[#475467]">
                        {r.triggerAt ? new Date(r.triggerAt).toLocaleString() : r.cronPattern || 'Manual Trigger'}
                      </td>
                      <td>
                        {r.isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                            <Repeat className="w-3 h-3" />
                            <span>Recurring</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#98A2B3]">One-Time</span>
                        )}
                      </td>
                      <td className="text-xs text-[#475467]">
                        @{r.createdBy}
                      </td>
                      <td className="text-right">
                        {r.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelReminder(r.id)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Cancel Reminder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Reminder Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Security Sync Alert"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Notification Message
              </label>
              <textarea
                rows={3}
                required
                placeholder="Message to post when triggered..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1.5">
                Target Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('CHANNEL')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    targetType === 'CHANNEL'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-[#E5E7EB] bg-white text-[#475467]'
                  }`}
                >
                  Discord Channel
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('USER')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    targetType === 'USER'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-[#E5E7EB] bg-white text-[#475467]'
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
                <label className="block font-semibold text-[#344054] mb-1">
                  Target Member
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">Select operator...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      @{m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Trigger Date
                </label>
                <input
                  type="date"
                  value={triggerDate}
                  onChange={(e) => setTriggerDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Trigger Time
                </label>
                <input
                  type="time"
                  value={triggerTime}
                  onChange={(e) => setTriggerTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Recurrence Cadence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="NONE">One-Time Only</option>
                <option value="DAILY">Daily at 09:00 AM</option>
                <option value="WEEKLY">Weekly on Mondays</option>
                <option value="MONTHLY">Monthly on 1st</option>
              </select>
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
      </div>
    </div>
  );
}
