'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
    if (!title.trim() || !agenda.trim() || !startDate || !startTimeStr) return;

    const start = new Date(`${startDate}T${startTimeStr}`);
    if (isNaN(start.getTime())) {
      alert('Invalid date or time.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          agenda: agenda.trim(),
          department,
          startTime: start.toISOString(),
          durationMinutes: duration,
          locationChannelId: selectedChannel?.id || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Meeting "${title}" scheduled successfully.` });
        setShowCreateModal(false);
        setTitle('');
        setAgenda('');
        setStartDate('');
        setStartTimeStr('');
        fetchMeetings();
      } else {
        alert(data.error || 'Failed to create meeting');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setMeetings(meetings.map((m) => (m.id === id ? { ...m, status: newStatus as any } : m)));
        setFeedback({ type: 'success', message: `Meeting status updated to ${newStatus}.` });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating meeting');
    }
  };

  // Find next upcoming scheduled meeting
  const upcomingMeeting = meetings.find(
    (m) => m.status === 'SCHEDULED' && new Date(m.startTime).getTime() > now.getTime()
  );

  const getCountdownString = (targetDate: Date) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return 'MEETING LIVE NOW';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `STARTS IN ${hours}H ${mins}M ${secs}S`;
    }
    if (mins > 0) {
      return `STARTS IN ${mins} MINUTES ${secs} SECONDS`;
    }
    return `STARTS IN ${secs} SECONDS`;
  };

  return (
    <div>
      <Topbar
        title="Meeting Operations"
        subtitle="Operational Standups, Briefings & Live Countdown Cadence"
        onRefresh={fetchMeetings}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Next Meeting Live Countdown Banner */}
        {upcomingMeeting && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#00f0ff]/15 via-[#6366f1]/10 to-[#0f1318] border border-[#00f0ff]/40 shadow-[0_0_24px_rgba(0,240,255,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse" />
                <span className="text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider font-mono">
                  Next Scheduled Operational Briefing
                </span>
              </div>
              <h3 className="text-base font-bold text-[#e2e8f0]">{upcomingMeeting.title}</h3>
              <p className="text-xs text-[#94a3b8] line-clamp-1">{upcomingMeeting.agenda}</p>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-sm font-extrabold text-[#00f0ff] font-mono tracking-wide px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#00f0ff]/30">
                {getCountdownString(new Date(upcomingMeeting.startTime))}
              </div>
              <span className="text-[10px] text-[#64748b] font-mono block mt-1">
                {new Date(upcomingMeeting.startTime).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
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
                {st === 'ALL' ? 'All Meetings' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>Schedule Meeting</span>
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

        {/* Meetings Grid / Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-xs text-[#64748b]">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card className="text-center py-12 text-xs text-[#64748b]">
            No meetings found in &quot;{statusFilter}&quot;.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((m) => (
              <Card key={m.id} className="space-y-4 hover:border-[#00f0ff]/30 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#e2e8f0]">{m.title}</h4>
                      <span className="text-[10px] font-mono text-[#00f0ff] uppercase">{m.department}</span>
                    </div>
                    <Badge variant={m.status === 'IN_PROGRESS' ? 'danger' : m.status === 'SCHEDULED' ? 'brand' : m.status === 'COMPLETED' ? 'success' : 'neutral'}>
                      {m.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#94a3b8] leading-relaxed line-clamp-3">{m.agenda}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2a38] text-[11px] text-[#64748b]">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>{new Date(m.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>{new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {m.locationChannelId && (
                      <div className="flex items-center gap-1.5 font-mono col-span-2 text-[#94a3b8]">
                        <Hash className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>Channel: {m.locationChannelId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-[#1e2a38] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {m.status === 'SCHEDULED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(m.id, 'IN_PROGRESS')}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        <span>Start Meeting</span>
                      </Button>
                    )}
                    {m.status === 'IN_PROGRESS' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(m.id, 'COMPLETED')}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Conclude</span>
                      </Button>
                    )}
                  </div>

                  {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(m.id, 'CANCELLED')}
                      className="text-xs text-[#64748b] hover:text-[#ef4444] font-medium"
                    >
                      Cancel Meeting
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#00f0ff]" />
                <span>Schedule Operations Meeting</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Meeting Title</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Security Operations Standup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Agenda & Discussion Points</label>
                <textarea
                  rows={3}
                  placeholder="Key topics, review items, and briefing scope..."
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Division</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value="GENERAL">General HQ</option>
                    <option value="KRAXXSEC">KRAXXSEC</option>
                    <option value="KRAXX_STUDIO">KRAXX STUDIO</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    min={15}
                    max={360}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Voice / Meeting Channel</label>
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Schedule Meeting
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
