'use client';

import { PageContainer } from '@/components/ui/Page';
import { Select, Input, Textarea, Checkbox } from '@/components/ui/Form';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { DiscordEmbedPreview, DiscordEmbedData } from '@/components/discord/DiscordEmbedPreview';
import { Megaphone, Clock, CheckCircle2, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
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
  const router = useRouter();
  const guildId = useGuildId();

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
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch(`/api/discord/meta?guildId=${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setRoles(data.roles || []);
          if (data.channels && data.channels.length > 0) {
            const annChannel = data.channels.find((channel: ChannelItem) => channel.type === 'announcement' || channel.name.includes('announc'));
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
  }, [guildId]);

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
      name: department === 'KRAXXSEC' ? 'KRAXXSEC // Security Bulletin' : department === 'KRAXX_STUDIO' ? 'KRAXX STUDIO // Project Dispatch' : 'KRAXXBot // Official Announcement',
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

    if (!guildId) {
      setFeedback({ type: 'error', message: 'No server selected.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        guildId,
        channelId: selectedChannel.id,
        title: title.trim(),
        content: content.trim(),
        department,
        type: announcementType,
        mentionType: mentionType !== 'NONE' ? mentionType : undefined,
        mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        scheduledFor: isScheduled && scheduledAt ? scheduledAt : undefined,
      };
      const fingerprint = JSON.stringify(payload);
      if (requestKey.current?.fingerprint !== fingerprint) {
        requestKey.current = { fingerprint, key: crypto.randomUUID() };
      }
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current.key },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch announcement.');

      setFeedback({
        type: 'success',
        message: isScheduled
          ? `Announcement queued for automated dispatch on ${new Date(scheduledAt).toLocaleString()}.`
          : `Announcement durably queued for #${selectedChannel.name}; delivery will be confirmed by the scheduler.`,
      });
      requestKey.current = null;
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Broadcast error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Announcements"
        subtitle="Compose, preview, and schedule messages for your server."
      />

      <PageContainer className="space-y-6">
        {/* Preset Selector Banner */}
        <div>
          <div className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Official Ecosystem Preset Templates
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-4 rounded-xl bg-[var(--surface-1)] border text-left transition-colors  ${
                  title === p.defaultTitle
                    ? 'border-[var(--accent-border)] ring-2 ring-[var(--accent-border)]'
                    : 'border-[var(--border-base)] hover:border-[var(--border-base)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase">{p.badge}</span>
                </div>
                <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{p.name}</div>
              </button>
            ))}
          </div>
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

        {/* Form and Preview Layout */}
        <form onSubmit={handleBroadcast} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6 ">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[var(--accent)]" />
                  <span>Broadcast Composer</span>
                </h3>
                <Link
                  href={`/dashboard/${guildId}/announcements/scheduled`}
                  className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-1 hover:underline"
                >
                  <span>View Queue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4 text-[13px]">
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
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Organizational Division
                    </label>
                    <Select aria-label="Organizational Division"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as 'GENERAL' | 'KRAXXSEC' | 'KRAXX_STUDIO')}
                      className="w-full"
                    >
                      <option value="GENERAL">KRAXX HQ (General)</option>
                      <option value="KRAXXSEC">KRAXXSEC (Security)</option>
                      <option value="KRAXX_STUDIO">KRAXX STUDIO (Creative)</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Broadcast Classification
                    </label>
                    <Select aria-label="Broadcast Classification"
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="w-full"
                    >
                      <option value="IMPORTANT">Important Notice</option>
                      <option value="SECURITY_ADVISORY">Security Advisory</option>
                      <option value="RELEASE">Product Release</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="EMERGENCY">Emergency Notice</option>
                    </Select>
                  </div>
                </div>

                {/* Title & Banner */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Announcement Title
                    </label>
                    <Input aria-label="Announcement Title"
                      type="text"
                      required
                      placeholder="Title of broadcast..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Broadcast Body Content (Markdown Supported)
                    </label>
                    <Textarea aria-label="Broadcast Body Content (Markdown Supported)"
                      rows={5}
                      required
                      placeholder="Detailed announcement content..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full resize-y"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Header Banner Image URL (Optional)
                    </label>
                    <Input aria-label="Header Banner Image URL (Optional)"
                      type="url"
                      placeholder="https://..."
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Ping Controls */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3">
                  <label className="font-semibold text-[var(--text-secondary)] block">
                    Ping & Audience Mention
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['NONE', 'EVERYONE', 'HERE', 'ROLE'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMentionType(m)}
                        className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          mentionType === m
                            ? 'bg-[var(--accent)] text-[var(--text-inverse)] font-semibold '
                            : 'bg-[var(--surface-1)] border border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
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
                    <Select aria-label="selected Role Id"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full mt-2"
                    >
                      <option value="">Select target Discord role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                {/* Scheduling Controls */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[var(--text-secondary)] flex items-center gap-2 cursor-pointer">
                      <Checkbox

                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className=""
                      />
                      <span>Schedule for Future Automated Dispatch</span>
                    </label>
                    <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>

                  {isScheduled && (
                    <div className="pt-2">
                      <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                        Dispatch Date & Time
                      </label>
                      <Input aria-label="Dispatch Date & Time"
                        type="datetime-local"
                        required={isScheduled}
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full"
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
                    className="w-full font-semibold text-[13px] py-3"
                  >
                    {isScheduled ? 'Queue Scheduled Announcement' : 'Broadcast Announcement Immediately'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6  sticky top-20">
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent)]" />
                  <span>Discord Broadcast Preview</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="text-[13px] text-[var(--text-secondary)]">
                  Target: <span className="font-semibold text-[var(--text-primary)]">{selectedChannel ? `#${selectedChannel.name}` : 'None'}</span>
                </div>

                {mentionType !== 'NONE' && (
                  <div className="text-[13px] font-semibold text-[var(--accent)]">
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
      </PageContainer>
    </div>
  );
}
