'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
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
  X,
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
    if (!title.trim() || !message.trim() || !triggerDate || !triggerTime) return;

    const targetId = targetType === 'CHANNEL' ? selectedChannel?.id : selectedUserId;
    if (!targetId) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const combinedDate = new Date(`${triggerDate}T${triggerTime}`);
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetType,
          targetId,
          triggerAt: combinedDate.toISOString(),
          recurrence,
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
    if (!confirm('Confirm cancellation of reminder?')) return;
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReminders(reminders.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
        setFeedback({ type: 'success', message: 'Reminder cancelled.' });
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="brand">ACTIVE</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">DISPATCHED</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="AUTOMATED REMINDER DISPATCH"
        subtitle="Channel Reminders, Operator Notifications & Recurring Schedules"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Filter Bar & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded bg-[#0A0F16] border border-[#16202E]">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === s
                    ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
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
            className="font-mono text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE REMINDER</span>
          </Button>
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

        {/* Reminders Table */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>SCHEDULED REMINDERS ({reminders.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={AlarmClock}
                title="NO REMINDERS FOUND"
                description="No active automated reminders match your query."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    className="font-mono text-xs"
                  >
                    CREATE REMINDER
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">STATUS</th>
                    <th className="py-2.5 px-4 font-semibold">TITLE / REMINDER</th>
                    <th className="py-2.5 px-4 font-semibold">TARGET</th>
                    <th className="py-2.5 px-4 font-semibold">TRIGGER TIME</th>
                    <th className="py-2.5 px-4 font-semibold">RECURRENCE</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {reminders.map((r) => (
                    <tr key={r.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-[#F1F5F9] font-medium max-w-xs truncate">
                        <div>{r.title}</div>
                        <div className="text-[10px] text-[#64748B] truncate">{r.message}</div>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        <span className="bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E]">
                          {r.targetType === 'CHANNEL' ? `#${r.targetId}` : `@${r.targetId}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9]">
                        {r.triggerAt ? new Date(r.triggerAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {r.isRecurring ? (
                          <span className="flex items-center gap-1 text-[#22D3EE]">
                            <Repeat className="w-3 h-3" />
                            <span>RECURRING</span>
                          </span>
                        ) : (
                          <span className="text-[#64748B]">ONCE</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelReminder(r.id)}
                            className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                            title="Cancel Reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Create Reminder Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <AlarmClock className="w-4 h-4 text-[#22D3EE]" />
                  <span>SET OPERATIONAL REMINDER</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateReminder} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    REMINDER TITLE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly Status Report Submission"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    MESSAGE PAYLOAD
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Reminder message text dispatched to Discord..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      TARGET TYPE
                    </label>
                    <select
                      value={targetType}
                      onChange={(e: any) => setTargetType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="CHANNEL">Discord Channel</option>
                      <option value="USER">Direct User DM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      RECURRENCE
                    </label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="NONE">One-Time Only</option>
                      <option value="DAILY">Every Day</option>
                      <option value="WEEKLY">Every Week</option>
                      <option value="MONTHLY">Every Month</option>
                    </select>
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
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      SELECT OPERATOR
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="">Select target user...</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      DATE
                    </label>
                    <input
                      type="date"
                      required
                      value={triggerDate}
                      onChange={(e) => setTriggerDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      TIME
                    </label>
                    <input
                      type="time"
                      required
                      value={triggerTime}
                      onChange={(e) => setTriggerTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16202E]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isCreating}
                  >
                    SCHEDULE REMINDER
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
