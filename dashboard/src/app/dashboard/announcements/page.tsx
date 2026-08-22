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
    color: '#22D3EE',
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
    color: '#818CF8',
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
            // Find default announcements channel if available
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
        title="ANNOUNCEMENTS BROADCASTER"
        subtitle="Ecosystem Broadcast Dispatch, Scheduling & Channel Matrix"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Preset Selector Banner */}
        <div>
          <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-2">
            OFFICIAL ECOSYSTEM PRESET TEMPLATES
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-2.5 rounded bg-[#0A0F16] border text-left transition-all font-mono ${
                  title === p.defaultTitle
                    ? 'border-[#22D3EE] bg-[#0D131C]'
                    : 'border-[#16202E] hover:border-[#1E2C3F]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[9px] text-[#64748B] uppercase">{p.badge}</span>
                </div>
                <div className="text-xs font-bold text-[#F1F5F9] truncate">{p.name}</div>
              </button>
            ))}
          </div>
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

        {/* Form and Preview Layout */}
        <form onSubmit={handleBroadcast} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>BROADCAST COMPOSER</span>
                  </span>
                  <Link
                    href="/dashboard/announcements/scheduled"
                    className="text-[11px] font-mono text-[#22D3EE] hover:underline flex items-center gap-1"
                  >
                    <span>VIEW QUEUE</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardTitle>
              </CardHeader>

              <div className="space-y-4 font-mono text-xs">
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
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      ORGANIZATIONAL DIVISION
                    </label>
                    <select
                      value={department}
                      onChange={(e: any) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="GENERAL">KRAXX HQ (General)</option>
                      <option value="KRAXXSEC">KRAXXSEC (Security)</option>
                      <option value="KRAXX_STUDIO">KRAXX STUDIO (Creative)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      DISPATCH TYPE
                    </label>
                    <select
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="IMPORTANT">IMPORTANT / DIRECT</option>
                      <option value="SECURITY_ADVISORY">SECURITY ADVISORY</option>
                      <option value="RELEASE">RELEASE / DEPLOYMENT</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="EMERGENCY">EMERGENCY ALERT</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                    ANNOUNCEMENT HEADLINE
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter broadcast headline..."
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 font-bold"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                    BROADCAST BODY (MARKDOWN)
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type official broadcast text..."
                    className="w-full p-3 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 resize-y leading-relaxed"
                  />
                </div>

                {/* Banner Image URL */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                    BANNER IMAGE URL (OPTIONAL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                {/* Mention Matrix */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">
                    TARGET AUDIENCE MENTION
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['NONE', 'HERE', 'EVERYONE', 'ROLE'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMentionType(m as any)}
                        className={`px-2 py-1.5 rounded border text-center transition-all ${
                          mentionType === m
                            ? 'bg-[#111823] border-[#22D3EE] text-[#22D3EE] font-bold'
                            : 'bg-[#0A0F16] border-[#16202E] text-[#94A3B8] hover:border-[#1E2C3F]'
                        }`}
                      >
                        {m === 'NONE' && 'NO MENTION'}
                        {m === 'HERE' && '@here'}
                        {m === 'EVERYONE' && '@everyone'}
                        {m === 'ROLE' && '@role'}
                      </button>
                    ))}
                  </div>

                  {mentionType === 'ROLE' && (
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full mt-2 p-2 rounded bg-[#0A0F16] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
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

                {/* Scheduler Toggle */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">
                      AUTOMATED DISPATCH SCHEDULER
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#94A3B8]">
                      <input
                        type="checkbox"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="accent-[#22D3EE]"
                      />
                      <span>Schedule for later</span>
                    </label>
                  </div>

                  {isScheduled && (
                    <input
                      type="datetime-local"
                      required={isScheduled}
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#0A0F16] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={!selectedChannel || !title.trim() || !content.trim()}
                    className="w-full font-mono font-bold tracking-wider uppercase text-xs py-2.5"
                  >
                    {isScheduled ? 'QUEUE SCHEDULED BROADCAST' : 'DISPATCH BROADCAST NOW'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[#0A0F16] sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>DISCORD BROADCAST PREVIEW</span>
                </CardTitle>
              </CardHeader>

              <div className="p-1 space-y-2">
                <div className="text-[10px] font-mono text-[#64748B] uppercase">
                  Target: {selectedChannel ? `#${selectedChannel.name}` : 'No Channel Selected'}
                </div>

                {mentionType === 'EVERYONE' && (
                  <div className="text-xs font-mono text-[#EF4444] bg-red-950/20 px-2 py-1 rounded border border-red-500/20">
                    @everyone
                  </div>
                )}
                {mentionType === 'HERE' && (
                  <div className="text-xs font-mono text-[#F59E0B] bg-amber-950/20 px-2 py-1 rounded border border-amber-500/20">
                    @here
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
