'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserPlus,
  Loader2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ guildId: string }>;
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

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const [metaRes, welcomeRes] = await Promise.all([
        fetch(`/api/discord/meta?guildId=${guildId}`),
        fetch(`/api/welcome?guildId=${guildId}`),
      ]);

      if (welcomeRes.status === 401 || metaRes.status === 401) {
        router.push('/login');
        return;
      }
      if (welcomeRes.status === 403 || welcomeRes.status === 404) {
        setFeedback({ type: 'error', message: 'You do not have permission to manage this server or bot is not installed.' });
        return;
      }

      let chList: ChannelItem[] = [];
      if (metaRes.ok) {
        const meta = await metaRes.json();
        chList = meta.channels || [];
        setChannels(chList);
        setRoles(meta.roles || []);
      }

      if (welcomeRes.ok) {
        const data = await welcomeRes.json();
        const cfg = data.config;
        if (cfg) {
          setEnabled(cfg.enabled);
          if (cfg.message) setMessage(cfg.message);
          if (cfg.imageUrl) setImageUrl(cfg.imageUrl);
          if (cfg.roleId) setRoleId(cfg.roleId);
          setDmEnabled(cfg.dmEnabled);
          if (cfg.dmMessage) setDmMessage(cfg.dmMessage);
          if (cfg.leaveMessage) setLeaveMessage(cfg.leaveMessage);

          if (cfg.channelId && chList.length > 0) {
            const ch = chList.find((c) => c.id === cfg.channelId);
            if (ch) setSelectedChannel(ch);
          }
          if (cfg.leaveChannelId && chList.length > 0) {
            const lch = chList.find((c) => c.id === cfg.leaveChannelId);
            if (lch) setSelectedLeaveChannel(lch);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load welcome configuration:', e);
      setFeedback({ type: 'error', message: 'Failed to load welcome configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [guildId]);

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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Save error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs text-[#716D65]">Loading welcome configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Member Welcome & Gateway Onboarding"
        subtitle="Automated Greeting Dispatches, Onboarding Direct Messages & Auto-Role Assignment"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Welcome Configuration Card */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Public Welcome Message Dispatch
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#344054]">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="accent-amber-600 rounded"
                />
                <span>Enable System</span>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Welcome Target Channel
                  </label>
                  <ChannelSelector
                    channels={channels}
                    selectedChannelId={selectedChannel?.id || ''}
                    onSelectChannel={setSelectedChannel}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Departure / Leave Notification Channel
                  </label>
                  <ChannelSelector
                    channels={channels}
                    selectedChannelId={selectedLeaveChannel?.id || ''}
                    onSelectChannel={setSelectedLeaveChannel}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Auto-Assign Initial Role
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">No Auto-Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Welcome Card Banner Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Welcome Broadcast Template
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed shadow-2xs resize-y"
                  />
                  <div className="mt-1 text-[11px] text-[#667085]">
                    Variables: <code className="bg-[#F3F5FA] px-1 py-0.5 rounded text-amber-600">{'{user}'}</code>, <code className="bg-[#F3F5FA] px-1 py-0.5 rounded text-amber-600">{'{username}'}</code>, <code className="bg-[#F3F5FA] px-1 py-0.5 rounded text-amber-600">{'{server}'}</code>, <code className="bg-[#F3F5FA] px-1 py-0.5 rounded text-amber-600">{'{memberCount}'}</code>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Departure Broadcast Template
                  </label>
                  <textarea
                    rows={2}
                    value={leaveMessage}
                    onChange={(e) => setLeaveMessage(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed shadow-2xs resize-y"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* DM Onboarding Card */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Automated Direct Message (DM) Onboarding
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#344054]">
                <input
                  type="checkbox"
                  checked={dmEnabled}
                  onChange={(e) => setDmEnabled(e.target.checked)}
                  className="accent-amber-600 rounded"
                />
                <span>Enable Member DMs</span>
              </label>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-[#344054] mb-1">
                Direct Message Content
              </label>
              <textarea
                rows={3}
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed shadow-2xs resize-y"
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
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Gateway Onboarding Settings</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
