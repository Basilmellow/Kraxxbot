'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  CalendarClock,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Trash2,
} from 'lucide-react';

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

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter === 'ALL' ? '/api/meetings' : `/api/meetings?status=${statusFilter}`;
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
    fetchMeetings();
  }, [statusFilter]);

  // Live timer tick every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/discord/meta');
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
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTimeStr) return;

    setIsCreating(true);
    setFeedback(null);

    const startDateTime = new Date(`${startDate}T${startTimeStr}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Meeting scheduled successfully.' });
        setShowCreateModal(false);
        setTitle('');
        setAgenda('');
        fetchMeetings();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to schedule meeting' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Meeting creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMeetings(meetings.map((m) => (m.id === id ? { ...m, status: newStatus as any } : m)));
      }
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Confirm deletion of this meeting schedule?')) return;
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
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
        title="Operations Cadence & Meetings"
        subtitle="HQ Voice Channels, Standups, Briefings & Calendar Sync"
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
            <span>Schedule Meeting</span>
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
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-[#101828] truncate">
                        {m.title}
                      </h4>
                      {getStatusBadge(m.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#667085] mb-3">
                      <span className="font-medium text-[#101828]">{m.department}</span>
                      <span>•</span>
                      <span>{start.toLocaleDateString()}</span>
                    </div>

                    {m.agenda && (
                      <p className="text-xs text-[#667085] line-clamp-2 mb-4 leading-relaxed">
                        {m.agenda}
                      </p>
                    )}

                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-1.5 text-xs text-[#475467]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {m.locationChannelId && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono text-[11px]">Channel: #{m.locationChannelId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#F1F3F9] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {m.status === 'SCHEDULED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(m.id, 'IN_PROGRESS')}
                          className="text-xs py-1"
                        >
                          Start Meeting
                        </Button>
                      )}
                      {m.status === 'IN_PROGRESS' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}
                          className="text-xs py-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          Conclude
                        </Button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
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
          title="Schedule Operations Meeting"
          subtitle="Set agenda, time, department, and link to Discord voice channel"
        >
          <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Meeting Title / Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KRAXX Weekly Operations Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Agenda & Briefing Notes
              </label>
              <textarea
                rows={3}
                placeholder="Topics, agenda items, objectives..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="GENERAL">KRAXX HQ</option>
                  <option value="KRAXXSEC">KRAXXSEC</option>
                  <option value="STUDIO">KRAXX STUDIO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={15}>15 Minutes (Standup)</option>
                  <option value={30}>30 Minutes (Briefing)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={90}>90 Minutes (Deep Dive)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Discord Voice Channel (Optional)
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
      </div>
    </div>
  );
}
