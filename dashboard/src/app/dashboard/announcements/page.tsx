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
  Radio,
  Calendar,
  Image as ImageIcon,
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
    badge: 'HQ DIRECT',
    color: '#4F46E5',
    defaultTitle: 'OFFICIAL HQ BROADCAST',
    defaultDesc: 'Official administrative communication for all KRAXX operations personnel.',
  },
  {
    id: 'sec',
    name: 'KRAXXSEC',
    department: 'KRAXXSEC',
    type: 'SECURITY_ADVISORY',
    badge: 'KRAXXSEC',
    color: '#10B981',
    defaultTitle: 'SECURITY BULLETIN & THREAT ADVISORY',
    defaultDesc: 'Critical security intelligence update from KRAXXSEC Cyber Division.',
  },
  {
    id: 'studio',
    name: 'KRAXX STUDIO',
    department: 'KRAXX_STUDIO',
    type: 'RELEASE',
    badge: 'STUDIO',
    color: '#8B5CF6',
    defaultTitle: 'KRAXX STUDIO PROJECT DISPATCH',
    defaultDesc: 'Creative technologies, deployment releases, and project milestone updates.',
  },
  {
    id: 'emergency',
    name: 'EMERGENCY',
    department: 'GENERAL',
    type: 'EMERGENCY',
    badge: 'ALERT',
    color: '#EF4444',
    defaultTitle: 'CRITICAL OPERATIONAL INCIDENT NOTICE',
    defaultDesc: 'Urgent system notice requiring immediate attention from all available operators.',
  },
  {
    id: 'maintenance',
    name: 'MAINTENANCE',
    department: 'GENERAL',
    type: 'MAINTENANCE',
    badge: 'OPS CADENCE',
    color: '#F59E0B',
    defaultTitle: 'SCHEDULED INFRASTRUCTURE MAINTENANCE',
    defaultDesc: 'Infrastructure maintenance window scheduled. Minor service degradation possible.',
  },
];

export default function AnnouncementsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Form State
  const [title, setTitle] = useState(PRESETS[0].defaultTitle);
  const [content, setContent] = useState(PRESETS[0].defaultDesc);
  const [department, setDepartment] = useState<'GENERAL' | 'KRAXXSEC' | 'KRAXX_STUDIO'>('GENERAL');
  const [announcementType, setAnnouncementType] = useState('IMPORTANT');
  const [color, setColor] = useState(PRESETS[0].color);
  const [mentionType, setMentionType] = useState<'NONE' | 'EVERYONE' | 'HERE' | 'ROLE'>('NONE');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // Status & Feedback
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch('/api/discord/meta');
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setRoles(data.roles || []);
          if (data.channels && data.channels.length > 0) {
            const annChannel = data.channels.find((c: any) => c.type === 'announcement' || c.name.includes('announc'));
            setSelectedChannel(annChannel || data.channels[0]);
          }
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
    setTitle(p.defaultTitle);
    setContent(p.defaultDesc);
    setDepartment(p.department);
    setAnnouncementType(p.type);
    setColor(p.color);
  };

  const currentEmbed: DiscordEmbedData = {
    title,
    description: content,
    color,
    author: {
      name: department === 'KRAXXSEC' ? 'KRAXXSEC // Security Bulletin' : department === 'KRAXX_STUDIO' ? 'KRAXX STUDIO // Project Dispatch' : 'KRAXX HQ // Official Announcement',
    },
    image: bannerUrl.trim() ? { url: bannerUrl.trim() } : undefined,
    footer: {
      text: `Broadcast Dispatch • Type: ${announcementType}`,
    },
    timestamp: new Date().toISOString(),
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          title: title.trim(),
          content: content.trim(),
          department,
          type: announcementType,
          mentionType: mentionType !== 'NONE' ? mentionType : undefined,
          mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          scheduledAt: isScheduled && scheduledAt ? scheduledAt : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch announcement.');

      setFeedback({
        type: 'success',
        message: isScheduled
          ? `Announcement queued for automated dispatch on ${new Date(scheduledAt).toLocaleString()}.`
          : `Announcement successfully broadcasted to #${selectedChannel.name}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Broadcast error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Announcements Broadcaster"
        subtitle="Ecosystem Broadcast Dispatch, Scheduling & Channel Matrix"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Preset Selector Banner */}
        <div>
          <div className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-2.5">
            Official Ecosystem Preset Templates
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-3.5 rounded-2xl bg-white border text-left transition-all shadow-xs ${
                  title === p.defaultTitle
                    ? 'border-indigo-600 ring-2 ring-indigo-500/10'
                    : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[10px] font-semibold text-[#667085] uppercase">{p.badge}</span>
                </div>
                <div className="text-xs font-bold text-[#101828] truncate">{p.name}</div>
              </button>
            ))}
          </div>
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

        {/* Form and Preview Layout */}
        <form onSubmit={handleBroadcast} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                  <span>Broadcast Composer</span>
                </h3>
                <Link
                  href="/dashboard/announcements/scheduled"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                >
                  <span>View Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-4 text-xs">
                {/* Target Channel */}
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                  isLoading={isLoadingMeta}
                />

                {/* Division & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Organizational Division
                    </label>
                    <select
                      value={department}
                      onChange={(e: any) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    >
                      <option value="GENERAL">KRAXX HQ (General)</option>
                      <option value="KRAXXSEC">KRAXXSEC (Security)</option>
                      <option value="KRAXX_STUDIO">KRAXX STUDIO (Creative)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Broadcast Classification
                    </label>
                    <select
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    >
                      <option value="IMPORTANT">Important Notice</option>
                      <option value="SECURITY_ADVISORY">Security Advisory</option>
                      <option value="RELEASE">Product Release</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="EMERGENCY">Emergency Notice</option>
                    </select>
                  </div>
                </div>

                {/* Title & Banner */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Title of broadcast..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Broadcast Body Content (Markdown Supported)
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Detailed announcement content..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed shadow-2xs resize-y"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Header Banner Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Ping Controls */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5">
                  <label className="font-semibold text-[#344054] block">
                    Ping & Audience Mention
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['NONE', 'EVERYONE', 'HERE', 'ROLE'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMentionType(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          mentionType === m
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'bg-white border border-[#E5E7EB] text-[#475467] hover:bg-[#F3F5FA]'
                        }`}
                      >
                        {m === 'NONE' && 'None'}
                        {m === 'EVERYONE' && '@everyone'}
                        {m === 'HERE' && '@here'}
                        {m === 'ROLE' && 'Target Role'}
                      </button>
                    ))}
                  </div>

                  {mentionType === 'ROLE' && (
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select target Discord role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Scheduling Controls */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#344054] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="accent-indigo-600 rounded"
                      />
                      <span>Schedule for Future Automated Dispatch</span>
                    </label>
                    <Clock className="w-4 h-4 text-[#667085]" />
                  </div>

                  {isScheduled && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                        Dispatch Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required={isScheduled}
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!selectedChannel || !title.trim() || !content.trim()}
                    className="w-full font-semibold text-xs py-2.5"
                  >
                    {isScheduled ? 'Queue Scheduled Announcement' : 'Broadcast Announcement Immediately'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs sticky top-20">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Discord Broadcast Preview</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-[#667085]">
                  Target: <span className="font-semibold text-[#101828]">{selectedChannel ? `#${selectedChannel.name}` : 'None'}</span>
                </div>

                {mentionType !== 'NONE' && (
                  <div className="text-xs font-semibold text-indigo-600">
                    {mentionType === 'EVERYONE' && '@everyone'}
                    {mentionType === 'HERE' && '@here'}
                    {mentionType === 'ROLE' && selectedRoleId && `@${roles.find(r => r.id === selectedRoleId)?.name || 'Role'}`}
                  </div>
                )}

                <DiscordEmbedPreview embed={currentEmbed} />
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
