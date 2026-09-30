'use client';

import { PageContainer } from '@/components/ui/Page';
import { Checkbox, Select, Input, Textarea } from '@/components/ui/Form';

import React, { useCallback, useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { Save, CheckCircle2, AlertTriangle, Mail, UserPlus, Loader2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
}

interface WelcomeSnapshot {
  channels: ChannelItem[];
  roles: { id: string; name: string }[];
  config: {
    enabled: boolean;
    message: string | null;
    imageUrl: string | null;
    roleId: string | null;
    dmEnabled: boolean;
    dmMessage: string | null;
    leaveMessage: string | null;
    channelId: string | null;
    leaveChannelId: string | null;
  } | null;
}

export default function GuildWelcomePage({ params }: PageProps) {
  const { guildId } = use(params);
  const router = useRouter();

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [selectedLeaveChannel, setSelectedLeaveChannel] = useState<ChannelItem | null>(null);

  // Config State
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('Welcome {user} to **{server}**! We are now {memberCount} operators strong.');
  const [imageUrl, setImageUrl] = useState('');
  const [roleId, setRoleId] = useState('');
  const [dmEnabled, setDmEnabled] = useState(false);
  const [dmMessage, setDmMessage] = useState('Welcome to {server}! Please review {rules} to get started.');
  const [leaveMessage, setLeaveMessage] = useState('{username} has departed from {server}.');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestConfig = useCallback(async (): Promise<WelcomeSnapshot> => {
    const [metaRes, welcomeRes] = await Promise.all([
      fetch(`/api/discord/meta?guildId=${guildId}`, { signal: AbortSignal.timeout(20000) }),
      fetch(`/api/welcome?guildId=${guildId}`, { signal: AbortSignal.timeout(20000) }),
    ]);
    if (metaRes.status === 401 || welcomeRes.status === 401) router.push('/login');
    const [meta, welcome] = await Promise.all([
      metaRes.json().catch(() => ({})),
      welcomeRes.json().catch(() => ({})),
    ]);
    if (!metaRes.ok || !welcomeRes.ok) {
      throw new Error(meta.error || welcome.error || 'Unable to load welcome configuration.');
    }
    return {
      channels: meta.channels || [],
      roles: meta.roles || [],
      config: welcome.config || null,
    };
  }, [guildId, router]);

  const applyConfig = useCallback((snapshot: WelcomeSnapshot) => {
    setChannels(snapshot.channels);
    setRoles(snapshot.roles);
    const cfg = snapshot.config;
    if (cfg) {
      setEnabled(cfg.enabled);
      setMessage(cfg.message || 'Welcome {user} to **{server}**! We are now {memberCount} operators strong.');
      setImageUrl(cfg.imageUrl || '');
      setRoleId(cfg.roleId || '');
      setDmEnabled(cfg.dmEnabled);
      setDmMessage(cfg.dmMessage || 'Welcome to {server}! Please review {rules} to get started.');
      setLeaveMessage(cfg.leaveMessage || '{username} has departed from {server}.');
      setSelectedChannel(snapshot.channels.find((channel) => channel.id === cfg.channelId) || null);
      setSelectedLeaveChannel(snapshot.channels.find((channel) => channel.id === cfg.leaveChannelId) || null);
    }
    setLoadError(null);
  }, []);

  useEffect(() => {
    let active = true;
    void requestConfig()
      .then((snapshot) => { if (active) applyConfig(snapshot); })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load welcome configuration:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load welcome configuration.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyConfig, requestConfig]);

  const reloadConfig = () => {
    setIsLoading(true);
    void requestConfig()
      .then(applyConfig)
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Failed to load welcome configuration.'))
      .finally(() => setIsLoading(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          enabled,
          channelId: selectedChannel?.id || undefined,
          message,
          imageUrl: imageUrl.trim() || undefined,
          roleId: roleId || undefined,
          dmEnabled,
          dmMessage,
          leaveChannelId: selectedLeaveChannel?.id || undefined,
          leaveMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Welcome and departure configuration saved.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save configuration' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Save error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Welcome"
          subtitle="Configure welcome messages, direct messages, and initial roles."
        />
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)] mx-auto mb-3" />
            <p className="text-[13px] text-[#716D65]">Loading welcome configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Welcome" subtitle="Configure welcome messages, direct messages, and initial roles." />
        <PageContainer className="space-y-6">
          <ErrorState title="Welcome settings unavailable" message={loadError} onRetry={reloadConfig} />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Welcome"
        subtitle="Configure welcome messages, direct messages, and initial roles."
      />

      <PageContainer className="space-y-6">
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Welcome Configuration Card */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6  space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Public Welcome Message Dispatch
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-[var(--text-secondary)]">
                <Checkbox

                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className=""
                />
                <span>Enable System</span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-[13px]">
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Welcome Target Channel
                  </label>
                  <ChannelSelector
                    channels={channels}
                    selectedChannelId={selectedChannel?.id || ''}
                    onSelectChannel={setSelectedChannel}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Departure / Leave Notification Channel
                  </label>
                  <ChannelSelector
                    channels={channels}
                    selectedChannelId={selectedLeaveChannel?.id || ''}
                    onSelectChannel={setSelectedLeaveChannel}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Auto-Assign Initial Role
                  </label>
                  <Select aria-label="Auto-Assign Initial Role"
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">No Auto-Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Welcome Card Banner Image URL (Optional)
                  </label>
                  <Input aria-label="Welcome Card Banner Image URL (Optional)"
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Welcome Broadcast Template
                  </label>
                  <Textarea aria-label="Welcome Broadcast Template"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-y"
                  />
                  <div className="mt-1 text-[13px] text-[var(--text-secondary)]">
                    Variables: <code className="bg-[var(--surface-2)] px-1 py-0.5 rounded text-[var(--accent)]">{'{user}'}</code>, <code className="bg-[var(--surface-2)] px-1 py-0.5 rounded text-[var(--accent)]">{'{username}'}</code>, <code className="bg-[var(--surface-2)] px-1 py-0.5 rounded text-[var(--accent)]">{'{server}'}</code>, <code className="bg-[var(--surface-2)] px-1 py-0.5 rounded text-[var(--accent)]">{'{memberCount}'}</code>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Departure Broadcast Template
                  </label>
                  <Textarea aria-label="Departure Broadcast Template"
                    rows={2}
                    value={leaveMessage}
                    onChange={(e) => setLeaveMessage(e.target.value)}
                    className="w-full resize-y"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* DM Onboarding Card */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6  space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Automated Direct Message (DM) Onboarding
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-[var(--text-secondary)]">
                <Checkbox

                  checked={dmEnabled}
                  onChange={(e) => setDmEnabled(e.target.checked)}
                  className=""
                />
                <span>Enable Member DMs</span>
              </label>
            </div>

            <div className="text-[13px]">
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Direct Message Content
              </label>
              <Textarea aria-label="Direct Message Content"
                rows={3}
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                className="w-full resize-y"
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Gateway Onboarding Settings</span>
            </Button>
          </div>
        </form>
      </PageContainer>
    </div>
  );
}
