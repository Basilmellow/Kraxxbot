'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  DoorOpen,
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserPlus,
  LogOut,
  Image as ImageIcon,
  Sparkles,
  Terminal,
} from 'lucide-react';

export default function WelcomeSystemPage() {
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
        fetch('/api/discord/meta'),
        fetch('/api/welcome'),
      ]);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          channelId: selectedChannel?.id || null,
          message,
          imageUrl: imageUrl || null,
          roleId: roleId || null,
          dmEnabled,
          dmMessage: dmMessage || null,
          leaveChannelId: selectedLeaveChannel?.id || null,
          leaveMessage: leaveMessage || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Welcome & Onboarding configuration updated.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save welcome configuration' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error saving welcome configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="ONBOARDING & WELCOME SUBSYSTEM"
        subtitle="Automated Personnel Greeting, Auto-Role Allocation & Departure Telemetry"
      />

      <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
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

        <form onSubmit={handleSave} className="space-y-5">
          {/* Main Welcome Subsystem Card */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>GUILD ARRIVAL & ONBOARDING PROTOCOL</span>
                </CardTitle>
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#94A3B8]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="accent-[#22D3EE]"
                  />
                  <span>ENGAGE SUBSYSTEM</span>
                </label>
              </div>
            </CardHeader>

            <div className="space-y-4 font-mono text-xs pt-2">
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={setSelectedChannel}
              />

              <div>
                <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                  ARRIVAL MESSAGE TEMPLATE
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Variables: {user}, {username}, {server}, {memberCount}"
                  className="w-full p-3 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Supported tokens: &#123;user&#125;, &#123;username&#125;, &#123;server&#125;, &#123;memberCount&#125;
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                  AUTOMATIC ONBOARDING ROLE
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                >
                  <option value="">No Auto-Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* DM & Departure Protocols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs">
            {/* Direct Message Greeting */}
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>DIRECT MESSAGE GREETING</span>
                  </CardTitle>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#94A3B8]">
                    <input
                      type="checkbox"
                      checked={dmEnabled}
                      onChange={(e) => setDmEnabled(e.target.checked)}
                      className="accent-[#22D3EE]"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </CardHeader>

              <div className="pt-2">
                <textarea
                  rows={3}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  placeholder="Direct message sent to user on arrival..."
                  className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                />
              </div>
            </Card>

            {/* Departure Logging */}
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>DEPARTURE TELEMETRY</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-3 pt-2">
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedLeaveChannel?.id || ''}
                  onSelectChannel={setSelectedLeaveChannel}
                />

                <textarea
                  rows={2}
                  value={leaveMessage}
                  onChange={(e) => setLeaveMessage(e.target.value)}
                  placeholder="Departure broadcast message..."
                  className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                />
              </div>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className="font-mono font-bold tracking-wider uppercase text-xs px-5 py-2.5"
            >
              SAVE WELCOME SYSTEM CONFIGURATION
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
