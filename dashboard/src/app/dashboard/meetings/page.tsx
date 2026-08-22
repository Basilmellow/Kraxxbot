'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
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
  XCircle,
  Hash,
  X,
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
        console.error('Failed to load channels:', err);
      }
    }
    loadMeta();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTimeStr) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const combinedDate = new Date(`${startDate}T${startTimeStr}`);
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          agenda: agenda.trim(),
          department,
          startTime: combinedDate.toISOString(),
          durationMinutes: duration,
          locationChannelId: selectedChannel?.id || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Operations meeting scheduled.' });
        setShowCreateModal(false);
        setTitle('');
        setAgenda('');
        fetchMeetings();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to schedule meeting' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error scheduling meeting' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (meetingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setMeetings(meetings.map((m) => (m.id === meetingId ? { ...m, status: newStatus as any } : m)));
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Confirm deletion of meeting schedule?')) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== meetingId));
        setFeedback({ type: 'success', message: 'Meeting purged.' });
      }
    } catch (err) {
      console.error('Delete meeting failed:', err);
    }
  };

  const getCountdown = (startStr: string) => {
    const start = new Date(startStr).getTime();
    const diff = start - now.getTime();
    if (diff <= 0) return 'CONVENING NOW';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `T-${hours}H ${mins}M ${secs}S`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="warning">IN PROGRESS</Badge>;
      case 'SCHEDULED':
        return <Badge variant="brand">SCHEDULED</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="MEETINGS & OPERATIONS CADENCE"
        subtitle="Staff Briefings, Executive Cadences & Voice Channel Assemblies"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Filter Bar & Schedule Action */}
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
            <span>SCHEDULE MEETING</span>
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

        {/* Meetings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="NO MEETINGS SCHEDULED"
            description="No operations assemblies or briefings currently match your query."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="font-mono text-xs"
              >
                SCHEDULE BRIEFING
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((m) => (
              <Card
                key={m.id}
                className="bg-[#0A0F16] flex flex-col justify-between hover:border-[#22D3EE]/30 transition-all p-4 space-y-3"
              >
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(m.status)}
                    <span className="text-[11px] text-[#22D3EE] font-bold">
                      {m.status === 'SCHEDULED' ? getCountdown(m.startTime) : m.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#F1F5F9] text-sm truncate">{m.title}</h3>
                    {m.agenda && (
                      <p className="text-[11px] text-[#94A3B8] font-sans line-clamp-2 mt-0.5">
                        {m.agenda}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#16202E] text-[11px] text-[#64748B]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#22D3EE]" />
                      <span>{new Date(m.startTime).toLocaleString()}</span>
                    </div>
                    {m.locationChannelId && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-[#94A3B8]" />
                        <span>#{m.locationChannelId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#16202E] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteMeeting(m.id)}
                    className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                    title="Purge Meeting"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex gap-1.5">
                    {m.status === 'SCHEDULED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(m.id, 'IN_PROGRESS')}
                        className="font-mono text-[10px] py-1 text-[#22D3EE]"
                      >
                        CONVENE
                      </Button>
                    )}
                    {m.status === 'IN_PROGRESS' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}
                        className="font-mono text-[10px] py-1"
                      >
                        CONCLUDE
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Schedule Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#22D3EE]" />
                  <span>SCHEDULE OPERATIONS CADENCE</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    MEETING TITLE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KRAXX Weekly Operational Sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    AGENDA / BRIEFING OUTLINE
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Meeting agenda items, deliverables, updates..."
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      DATE
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
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
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </div>

                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                />

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
                    SCHEDULE MEETING
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
