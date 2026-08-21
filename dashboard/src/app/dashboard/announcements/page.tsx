'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { DiscordEmbedPreview, DiscordEmbedData } from '@/components/discord/DiscordEmbedPreview';
import {
  Megaphone,
  Send,
  Clock,
  Shield,
  Palette,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Preset {
  id: string;
  name: string;
  department: 'GENERAL' | 'KRAXXSEC' | 'KRAXX_STUDIO';
  type: string;
  badge: string;
  color: string;
  defaultTitle: string;
  defaultDesc: string;
}

const PRESETS: Preset[] = [
  {
    id: 'hq',
    name: 'KRAXX HQ',
    department: 'GENERAL',
    type: 'IMPORTANT',
    badge: 'HQ Direct',
    color: '#00f0ff',
    defaultTitle: 'OFFICIAL HQ BROADCAST',
    defaultDesc: 'Official administrative communication for all KRAXX operations personnel.',
  },
  {
    id: 'sec',
    name: 'KRAXXSEC',
    department: 'KRAXXSEC',
    type: 'SECURITY_ADVISORY',
    badge: 'KRAXXSEC',
    color: '#10b981',
    defaultTitle: 'SECURITY BULLETIN & THREAT ADVISORY',
    defaultDesc: 'Critical security intelligence update from KRAXXSEC Cyber Division.',
  },
  {
    id: 'studio',
    name: 'KRAXX STUDIO',
    department: 'KRAXX_STUDIO',
    type: 'RELEASE',
    badge: 'STUDIO',
    color: '#6366f1',
    defaultTitle: 'KRAXX STUDIO PROJECT DISPATCH',
    defaultDesc: 'Creative technologies, deployment releases, and project milestone updates.',
  },
  {
    id: 'recruitment',
    name: 'RECRUITMENT',
    department: 'GENERAL',
    type: 'RECRUITMENT',
    badge: 'Talent Acquisition',
    color: '#3b82f6',
    defaultTitle: 'OPERATIONAL RECRUITMENT OPEN',
    defaultDesc: 'Applications are now open for division member positions and technical specialists.',
  },
  {
    id: 'event',
    name: 'EVENT',
    department: 'GENERAL',
    type: 'EVENT',
    badge: 'Event',
    color: '#00f0ff',
    defaultTitle: 'COMMUNITY EVENT & WORKSHOP',
    defaultDesc: 'Join us for our scheduled operational workshop and technical session.',
  },
  {
    id: 'meeting',
    name: 'MEETING',
    department: 'GENERAL',
    type: 'MEETING',
    badge: 'Operations Cadence',
    color: '#f59e0b',
    defaultTitle: 'MANDATORY STAFF BRIEFING',
    defaultDesc: 'Briefing scheduled for all leads and division personnel.',
  },
  {
    id: 'maintenance',
    name: 'MAINTENANCE',
    department: 'GENERAL',
    type: 'MAINTENANCE',
    badge: 'Infrastructure',
    color: '#ef4444',
    defaultTitle: 'SCHEDULED INFRASTRUCTURE MAINTENANCE',
    defaultDesc: 'Services and bot nodes will undergo scheduled maintenance window.',
  },
];

export default function AnnouncementCenterPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Active preset
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);

  // Form Fields
  const [title, setTitle] = useState(PRESETS[0].defaultTitle);
  const [message, setMessage] = useState(PRESETS[0].defaultDesc);
  const [imageUrl, setImageUrl] = useState('');
  const [useEmbed, setUseEmbed] = useState(true);
  const [mentionType, setMentionType] = useState<'NONE' | 'EVERYONE' | 'HERE' | 'ROLE'>('NONE');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Scheduling State
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Status & Feedback
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; scheduled?: boolean } | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch('/api/discord/meta');
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setRoles(data.roles || []);
          // Prefer announcement channels if available
          const annChannel = data.channels?.find((c: any) => c.type === 'announcement' || c.name.includes('announcement'));
          setSelectedChannel(annChannel || data.channels?.[0] || null);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  const handleApplyPreset = (p: Preset) => {
    setActivePreset(p);
    setTitle(p.defaultTitle);
    setMessage(p.defaultDesc);
  };

  const buildEmbedPayload = (): DiscordEmbedData | null => {
    if (!useEmbed) return null;
    return {
      title,
      description: message,
      color: activePreset.color,
      author: {
        name: `KRAXX HQ • ${activePreset.name}`,
      },
      image: imageUrl.trim() ? { url: imageUrl.trim() } : undefined,
      footer: {
        text: `Official KRAXX Operations • Division: ${activePreset.department}`,
      },
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) {
      setFeedback({ type: 'error', message: 'Please select a target Discord channel.' });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    let scheduledForIso: string | undefined = undefined;
    if (isScheduledMode) {
      if (!scheduleDate || !scheduleTime) {
        setFeedback({ type: 'error', message: 'Please select both date and time for scheduling.' });
        setIsSubmitting(false);
        return;
      }
      const combinedDate = new Date(`${scheduleDate}T${scheduleTime}`);
      if (isNaN(combinedDate.getTime()) || combinedDate <= new Date()) {
        setFeedback({ type: 'error', message: 'Scheduled time must be in the future.' });
        setIsSubmitting(false);
        return;
      }
      scheduledForIso = combinedDate.toISOString();
    }

    try {
      const embedPayload = buildEmbedPayload();

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: !useEmbed ? message : undefined,
          channelId: selectedChannel.id,
          department: activePreset.department,
          type: activePreset.type,
          mentionType,
          mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          embeds: embedPayload ? [embedPayload] : undefined,
          scheduledFor: scheduledForIso,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (isScheduledMode) {
          setFeedback({
            type: 'success',
            message: `Announcement successfully scheduled for ${new Date(scheduledForIso!).toLocaleString()}! Track it in the Scheduled Queue.`,
            scheduled: true,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `Announcement successfully published to #${selectedChannel.name}! (Message ID: ${data.messageId})`,
            scheduled: false,
          });
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch announcement' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error processing announcement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Announcement Center"
        subtitle="Corporate Broadcasts, Division Bulletins & Schedule Manager"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Preset Selector Banner */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  activePreset.id === p.id
                    ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          <Link href="/dashboard/announcements/scheduled">
            <Button variant="outline" size="sm">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-[#00f0ff]" />
              <span>Scheduled Queue</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-5">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Target Channel */}
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                  isLoading={isLoadingMeta}
                />

                {/* Announcement Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                    Announcement Headline / Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter broadcast headline..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs font-bold text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                    Announcement Body (Markdown Supported)
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Type the full announcement content..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 leading-relaxed font-sans"
                    required
                  />
                </div>

                {/* Banner Image URL */}
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                    Optional Banner Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://cdn.discordapp.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  />
                </div>

                {/* Mentions & Embed Toggle */}
                <div className="pt-2 border-t border-[#1e2a38] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                      Broadcast Mentions
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-[#94a3b8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useEmbed}
                        onChange={(e) => setUseEmbed(e.target.checked)}
                        className="rounded border-[#1e2a38] text-[#00f0ff]"
                      />
                      <span>Format as Rich Embed</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['NONE', 'EVERYONE', 'HERE', 'ROLE'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMentionType(m)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          mentionType === m
                            ? m === 'EVERYONE'
                              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                              : m === 'HERE'
                              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                              : 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                        }`}
                      >
                        {m === 'NONE' ? 'None' : m === 'ROLE' ? '@Role...' : `@${m.toLowerCase()}`}
                      </button>
                    ))}
                  </div>

                  {mentionType === 'ROLE' && (
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    >
                      <option value="">Select target role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Mode: Send Now vs Schedule */}
                <div className="pt-3 border-t border-[#1e2a38] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                      Execution Cadence
                    </span>
                    <div className="flex items-center gap-2 p-0.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                      <button
                        type="button"
                        onClick={() => setIsScheduledMode(false)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          !isScheduledMode
                            ? 'bg-[#00f0ff] text-[#0a0e15]'
                            : 'text-[#64748b] hover:text-[#e2e8f0]'
                        }`}
                      >
                        Send Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScheduledMode(true)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          isScheduledMode
                            ? 'bg-[#00f0ff] text-[#0a0e15]'
                            : 'text-[#64748b] hover:text-[#e2e8f0]'
                        }`}
                      >
                        Schedule
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Date/Time Picker */}
                  {isScheduledMode && (
                    <div className="p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38] grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">Target Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                          required={isScheduledMode}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">Target Time (Local)</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                          required={isScheduledMode}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-3 border-t border-[#1e2a38] flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                  >
                    {isScheduledMode ? (
                      <>
                        <Clock className="w-4 h-4 mr-1.5" />
                        <span>Schedule Broadcast</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5" />
                        <span>Publish Announcement Now</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Broadcast Telemetry Preview
              </span>
              <Badge variant="brand">{activePreset.badge}</Badge>
            </div>

            {/* Preview Embed */}
            {useEmbed && buildEmbedPayload() ? (
              <DiscordEmbedPreview embed={buildEmbedPayload()!} />
            ) : (
              <div className="bg-[#313338] rounded-xl p-4 border border-[#232428] text-xs text-[#dbdee1]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00f0ff] p-0.5 flex items-center justify-center font-bold text-[#0a0e15] text-sm flex-shrink-0">
                    K
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-white text-sm">KRAXX Bot</span>
                      <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">APP</span>
                    </div>
                    <div className="font-bold text-[#e2e8f0] text-sm">{title}</div>
                    <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{message}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
