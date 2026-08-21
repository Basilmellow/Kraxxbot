'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

    const combinedDate = new Date(`${triggerDate}T${triggerTime}`);
    if (isNaN(combinedDate.getTime()) || combinedDate <= new Date()) {
      alert('Trigger time must be in the future.');
      return;
    }

    const targetId = targetType === 'CHANNEL' ? selectedChannel?.id : selectedUserId;
    if (!targetId) {
      alert('Please select a target channel or user.');
      return;
    }

    setIsCreating(true);
    try {
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
        setFeedback({ type: 'success', message: `Reminder "${title}" scheduled successfully.` });
        setShowCreateModal(false);
        setTitle('');
        setMessage('');
        setTriggerDate('');
        setTriggerTime('');
        fetchReminders();
      } else {
        alert(data.error || 'Failed to create reminder');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating reminder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelReminder = async (id: string, reminderTitle: string) => {
    if (!confirm(`Cancel reminder "${reminderTitle}"?`)) return;

    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReminders(reminders.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
        setFeedback({ type: 'success', message: 'Reminder cancelled.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel reminder');
      }
    } catch (e: any) {
      alert(e.message || 'Error cancelling reminder');
    }
  };

  return (
    <div>
      <Topbar
        title="Reminders Engine"
        subtitle="Automated Reminders, Recurrent Cadences & Alerts"
        onRefresh={fetchReminders}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  statusFilter === st
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {st === 'ALL' ? 'All Reminders' : st}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>New Reminder</span>
          </Button>
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
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Reminders Table */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <AlarmClock className="w-4 h-4 text-[#00f0ff]" />
              <span>Reminders Pipeline ({reminders.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Managed by Railway Background Scheduler
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Target Type</th>
                  <th>Target Destination</th>
                  <th>Reminder Title & Message</th>
                  <th>Trigger Time</th>
                  <th>Recurrence</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-[#64748b]">
                      Loading reminders...
                    </td>
                  </tr>
                ) : reminders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-[#64748b]">
                      No reminders found.
                    </td>
                  </tr>
                ) : (
                  reminders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Badge variant={r.targetType === 'CHANNEL' ? 'brand' : 'neutral'}>
                          {r.targetType}
                        </Badge>
                      </td>

                      <td className="font-mono text-xs text-[#e2e8f0]">
                        <div className="flex items-center gap-1">
                          {r.targetType === 'CHANNEL' ? (
                            <Hash className="w-3.5 h-3.5 text-[#64748b]" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-[#64748b]" />
                          )}
                          <span>{r.targetId}</span>
                        </div>
                      </td>

                      <td className="max-w-sm">
                        <div className="font-semibold text-xs text-[#e2e8f0]">{r.title}</div>
                        <div className="text-[11px] text-[#64748b] line-clamp-1">{r.message}</div>
                      </td>

                      <td className="whitespace-nowrap font-mono text-xs text-[#00f0ff]">
                        {r.triggerAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(r.triggerAt).toLocaleString()}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        {r.isRecurring ? (
                          <span className="text-[11px] text-[#10b981] flex items-center gap-1 font-mono">
                            <Repeat className="w-3 h-3" />
                            <span>Recurring</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#64748b]">One-time</span>
                        )}
                      </td>

                      <td>
                        <Badge variant={r.status === 'ACTIVE' ? 'success' : r.status === 'COMPLETED' ? 'brand' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>

                      <td className="text-right">
                        {r.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelReminder(r.id, r.title)}
                            className="p-1.5 rounded hover:bg-[#141a22] text-[#64748b] hover:text-[#ef4444]"
                            title="Cancel Reminder"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <AlarmClock className="w-4 h-4 text-[#00f0ff]" />
                <span>Schedule New Reminder</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Reminder Subject / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Operations Standup Alert"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Reminder Body / Message</label>
                <textarea
                  rows={3}
                  placeholder="Details sent when the reminder triggers..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-[#94a3b8] uppercase">Target Destination</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('CHANNEL')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      targetType === 'CHANNEL'
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                        : 'bg-[#0a0e15] border-[#1e2a38] text-[#64748b]'
                    }`}
                  >
                    Discord Channel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('USER')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      targetType === 'USER'
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                        : 'bg-[#0a0e15] border-[#1e2a38] text-[#64748b]'
                    }`}
                  >
                    Direct Message User
                  </button>
                </div>

                {targetType === 'CHANNEL' ? (
                  <ChannelSelector
                    channels={channels}
                    selectedChannelId={selectedChannel?.id || ''}
                    onSelectChannel={(ch) => setSelectedChannel(ch)}
                  />
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  >
                    <option value="">Select target user...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} (@{m.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Date</label>
                  <input
                    type="date"
                    value={triggerDate}
                    onChange={(e) => setTriggerDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Time (Local)</label>
                  <input
                    type="time"
                    value={triggerTime}
                    onChange={(e) => setTriggerTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Recurrence</label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                >
                  <option value="NONE">One-Time Only</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Schedule Reminder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
