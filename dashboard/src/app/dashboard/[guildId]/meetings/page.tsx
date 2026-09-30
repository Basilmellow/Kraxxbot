'use client';
import { Tabs } from '@/components/ui/Tabs';

import { PageContainer } from '@/components/ui/Page';
import { Input, Textarea, Select } from '@/components/ui/Form';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect, useRef } from 'react';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { CalendarClock, Plus, Clock, MapPin, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

interface MeetingItem {
  id: string;
  title: string;
  agenda: string;
  department: string;
  startTime: string;
  endTime: string | null;
  locationChannelId: string | null;
  organizerId: string;
  attendees: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

const STATUSES = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function MeetingsPage() {
  const confirm = useConfirm();
  const guildId = useGuildId();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Countdown timer state
  const [now, setNow] = useState(new Date());

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [department, setDepartment] = useState('GENERAL');
  const [startDate, setStartDate] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createRequestId = useRef<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMeetings = async () => {
    try {
      const url = statusFilter === 'ALL' ? `/api/meetings?guildId=${guildId}` : `/api/meetings?status=${statusFilter}&guildId=${guildId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (e) {
      console.error('Failed to load meetings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchMeetings);
  }, [statusFilter, guildId]);

  // Live timer tick every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch(`/api/discord/meta?guildId=${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          if (data.channels?.length > 0) setSelectedChannel(data.channels[0]);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, [guildId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTimeStr) return;

    setIsCreating(true);
    setFeedback(null);

    const startDateTime = new Date(`${startDate}T${startTimeStr}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    createRequestId.current ||= crypto.randomUUID();

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          agenda: agenda.trim(),
          department,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          locationChannelId: selectedChannel?.id || undefined,
          requestId: createRequestId.current,
          guildId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const message = data.announcementState === 'SENT'
          ? 'Meeting saved. Its announcement was already sent to the selected Discord channel.'
          : data.announcementQueued
            ? 'Meeting saved. Its announcement is queued for the selected Discord channel.'
            : `Meeting already exists. Announcement status: ${data.announcementState || 'unknown'}.`;
        setFeedback({ type: 'success', message });
        createRequestId.current = null;
        setShowCreateModal(false);
        setTitle('');
        setAgenda('');
        fetchMeetings();
      } else {
        if (res.status === 409) createRequestId.current = null;
        setFeedback({ type: 'error', message: data.error || 'Failed to schedule meeting' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Meeting creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: MeetingItem['status']) => {
    try {
      const res = await fetch(`/api/meetings/${id}?guildId=${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMeetings(meetings.map((m) => (m.id === id ? { ...m, status: newStatus } : m)));
        const data = await res.json();
        if (data.announcementQueued) {
          setFeedback({ type: 'success', message: newStatus === 'IN_PROGRESS'
            ? 'Meeting started. Its channel announcement is queued.'
            : 'Meeting concluded. Its channel announcement is queued.' });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', message: data.error || 'Could not update the meeting.' });
      }
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!await confirm('Confirm deletion of this meeting schedule?')) return;
    try {
      const res = await fetch(`/api/meetings/${id}?guildId=${guildId}`, { method: 'DELETE' });
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== id));
        setFeedback({ type: 'success', message: 'Meeting deleted.' });
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="warning">SCHEDULED</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="brand">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">CONCLUDED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Meetings"
        subtitle="Schedule meetings and manage their Discord delivery."
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
            <span>Schedule Meeting</span>
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

        {/* Meetings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No scheduled meetings found"
            description="Schedule a team briefing, review session, or voice channel sync."
            actionLabel="Schedule Meeting"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {meetings.map((m) => {
              const start = new Date(m.startTime);
              const diffMs = start.getTime() - now.getTime();
              const isPast = diffMs < 0;

              return (
                <Card
                  key={m.id}
                  className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5  flex flex-col justify-between hover:border-[var(--accent-border)] transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {m.title}
                      </h4>
                      {getStatusBadge(m.status)}
                    </div>

                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] mb-3">
                      <span className="font-medium text-[var(--text-primary)]">{m.department}</span>
                      <span>•</span>
                      <span>{start.toLocaleDateString()}</span>
                    </div>

                    {m.agenda && (
                      <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {m.agenda}
                      </p>
                    )}

                    <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-2 text-[13px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--accent)]" />
                        <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {m.locationChannelId && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[var(--success)]" />
                          <span className="font-mono text-[13px]">Channel: #{m.locationChannelId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[var(--border-base)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.status === 'SCHEDULED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(m.id, 'IN_PROGRESS')}
                          className="text-[13px] py-1"
                        >
                          Start Meeting
                        </Button>
                      )}
                      {m.status === 'IN_PROGRESS' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}
                          className="text-[13px] py-1 bg-[var(--success)] hover:bg-[var(--success)]"
                        >
                          Conclude
                        </Button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                      title="Delete Meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Meeting Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Schedule Meeting"
          subtitle="Set the agenda, time, department, and Discord channel for meeting announcements"
        >
          <form onSubmit={handleCreateMeeting} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Meeting Title / Subject
              </label>
              <Input aria-label="Meeting Title / Subject"
                type="text"
                required
                placeholder="e.g. KRAXX Weekly Operations Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Agenda & Briefing Notes
              </label>
              <Textarea aria-label="Agenda & Briefing Notes"
                rows={3}
                placeholder="Topics, agenda items, objectives..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Department
                </label>
                <Select aria-label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full"
                >
                  <option value="GENERAL">KRAXX HQ</option>
                  <option value="KRAXXSEC">KRAXXSEC</option>
                  <option value="STUDIO">KRAXX STUDIO</option>
                </Select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Duration
                </label>
                <Select aria-label="Duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                >
                  <option value={15}>15 Minutes (Standup)</option>
                  <option value={30}>30 Minutes (Briefing)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={90}>90 Minutes (Deep Dive)</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Date
                </label>
                <Input aria-label="Date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Start Time
                </label>
                <Input aria-label="Start Time"
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Discord Announcement Channel (Required)
              </label>
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={setSelectedChannel}
              />
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
                Schedule Meeting
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
