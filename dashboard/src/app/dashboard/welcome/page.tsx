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
          imageUrl: imageUrl.trim() || null,
          roleId: roleId || null,
          dmEnabled,
          dmMessage,
          leaveChannelId: selectedLeaveChannel?.id || null,
          leaveMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Welcome configuration updated and synced with bot.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save configuration' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error saving welcome configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setMessage((prev) => `${prev} ${variable}`);
  };

  const formatPreview = (text: string) => {
    return text
      .replace(/{user}/g, '@NewOperator')
      .replace(/{username}/g, 'NewOperator')
      .replace(/{server}/g, 'KRAXX Operations HQ')
      .replace(/{memberCount}/g, '2,481')
      .replace(/{rules}/g, '#rules-and-guidelines')
      .replace(/{website}/g, 'https://kraxx.org');
  };

  return (
    <div>
      <Topbar
        title="Welcome System"
        subtitle="Automated Onboarding, Member Greeting & Auto-Role Assignment"
        onRefresh={fetchConfig}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
            {/* Master Toggle Card */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#e2e8f0]">Welcome System Module</h3>
                  <p className="text-xs text-[#94a3b8]">Enable or disable automated arrival broadcasts and onboarding</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1e2a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f0ff]"></div>
                </label>
              </div>
            </Card>

            {/* Welcome Broadcast Channel & Message */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>
                  <DoorOpen className="w-4 h-4 text-[#00f0ff]" />
                  <span>Welcome Channel & Broadcast</span>
                </CardTitle>
              </CardHeader>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                  Target Welcome Channel
                </label>
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Welcome Message Template
                  </label>
                  <div className="flex gap-1">
                    {['{user}', '{username}', '{server}', '{memberCount}', '{rules}'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-1.5 py-0.5 rounded bg-[#0a0e15] border border-[#1e2a38] text-[10px] text-[#00f0ff] font-mono hover:bg-[#141a22]"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 leading-relaxed font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                  Welcome Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>
            </Card>

            {/* Auto-Role & Direct Message Settings */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>
                  <UserPlus className="w-4 h-4 text-[#00f0ff]" />
                  <span>Auto-Role & DM Greetings</span>
                </CardTitle>
              </CardHeader>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                  Auto-Assign Role on Join
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                >
                  <option value="">Disabled / No Role Assigned</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-[#1e2a38] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                    Direct Message (DM) Greeting
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-[#94a3b8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dmEnabled}
                      onChange={(e) => setDmEnabled(e.target.checked)}
                      className="rounded border-[#1e2a38] text-[#00f0ff]"
                    />
                    <span>Send DM on Join</span>
                  </label>
                </div>

                {dmEnabled && (
                  <textarea
                    rows={3}
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    placeholder="Direct message sent to new operator inbox..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 leading-relaxed font-sans"
                  />
                )}
              </div>
            </Card>

            {/* Farewell / Departure Broadcast */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>
                  <LogOut className="w-4 h-4 text-[#ef4444]" />
                  <span>Departure / Farewell Notice</span>
                </CardTitle>
              </CardHeader>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                  Leave Channel (Optional)
                </label>
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedLeaveChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedLeaveChannel(ch)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
                  Departure Message
                </label>
                <input
                  type="text"
                  value={leaveMessage}
                  onChange={(e) => setLeaveMessage(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>
            </Card>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving}>
                <Save className="w-4 h-4 mr-1.5" />
                <span>Save Welcome Configuration</span>
              </Button>
            </div>
          </form>

          {/* Right Column: Live Discord Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Live Discord Welcome Preview
              </span>
              <Badge variant={enabled ? 'success' : 'neutral'}>
                {enabled ? 'Active System' : 'Disabled'}
              </Badge>
            </div>

            {/* Discord Box Rendering */}
            <div className="bg-[#313338] rounded-xl p-4 border border-[#232428] text-xs text-[#dbdee1] space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00f0ff] p-0.5 flex items-center justify-center font-bold text-[#0a0e15] text-sm flex-shrink-0">
                  K
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm">KRAXX Bot</span>
                    <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">APP</span>
                  </div>

                  <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                    {formatPreview(message)}
                  </div>
                </div>
              </div>

              {imageUrl.trim() && (
                <div className="rounded-lg overflow-hidden border border-[#232428] mt-2">
                  <img src={imageUrl} alt="Welcome Banner" className="w-full object-cover max-h-48" />
                </div>
              )}
            </div>

            {dmEnabled && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Direct Message Preview
                </span>
                <div className="bg-[#2b2d31] rounded-xl p-3.5 border border-[#1e2024] text-xs text-[#dbdee1] leading-relaxed">
                  {formatPreview(dmMessage)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
