'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  Bold,
  Italic,
  Code,
  FileCode,
  Quote,
  Link as LinkIcon,
  AtSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

export default function MessageCenterPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Mode: 'send' | 'edit' | 'delete'
  const [mode, setMode] = useState<'send' | 'edit' | 'delete'>('send');

  // Form Fields
  const [content, setContent] = useState('');
  const [targetMessageId, setTargetMessageId] = useState('');
  const [mentionType, setMentionType] = useState<'NONE' | 'EVERYONE' | 'HERE' | 'ROLE'>('NONE');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Status & Feedback
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; messageId?: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  // Load channels & roles on mount
  useEffect(() => {
    if (!guildId) return;
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch(`/api/discord/meta?guildId=${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setRoles(data.roles || []);
          if (data.channels && data.channels.length > 0) {
            setSelectedChannel(data.channels[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load channels/roles:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, [guildId]);

  // Formatting helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('message-composer') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    setContent(content.substring(0, start) + replacement + content.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 0);
  };

  // Load message for editing
  const handleLoadMessage = async () => {
    if (!selectedChannel || !targetMessageId.trim()) return;
    try {
      setIsLoadingMessage(true);
      setFeedback(null);
      const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}&guildId=${guildId}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.message.content || '');
        setFeedback({ type: 'success', message: 'Message loaded from Discord successfully.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Message not found in channel.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to connect to Discord gateway.' });
    } finally {
      setIsLoadingMessage(false);
    }
  };

  // Submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (mode === 'send') {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            guildId,
            content,
            mentionType: mentionType !== 'NONE' ? mentionType : undefined,
            mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to dispatch message.');

        setFeedback({
          type: 'success',
          message: `Dispatched to #${selectedChannel.name} successfully.`,
          messageId: data.messageId,
        });
        setContent('');
      } else if (mode === 'edit') {
        const res = await fetch(`/api/messages/${targetMessageId.trim()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            guildId,
            content,
            mentionType: mentionType !== 'NONE' ? mentionType : undefined,
            mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update message.');

        setFeedback({
          type: 'success',
          message: `Message #${targetMessageId} modified in #${selectedChannel.name}.`,
        });
      } else if (mode === 'delete') {
        const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}&guildId=${guildId}`, {
          method: 'DELETE',
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete message.');

        setFeedback({
          type: 'success',
          message: `Message purged from #${selectedChannel.name}.`,
        });
        setTargetMessageId('');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Message Center"
        subtitle="Direct Discord Channel Messaging & Content Operations"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => { setMode('send'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'send'
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('edit'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'edit'
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('delete'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'delete'
                ? 'bg-red-50 text-red-600 font-semibold'
                : 'text-[#667085] hover:text-red-600 hover:bg-[#F8FAFC]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Message</span>
          </button>
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
            <div className="flex-1">
              <div className="font-medium">{feedback.message}</div>
              {feedback.messageId && (
                <div className="text-[11px] text-[#667085] mt-0.5 font-mono">
                  Message ID: {feedback.messageId}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>
                    {mode === 'send' && 'Dispatch Message Console'}
                    {mode === 'edit' && 'Edit Bot Message Console'}
                    {mode === 'delete' && 'Purge Message Console'}
                  </span>
                </h3>
              </div>

              <div className="space-y-4">
                {/* Target Channel */}
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                  isLoading={isLoadingMeta}
                />

                {/* Target Message ID for Edit/Delete */}
                {mode !== 'send' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                      Target Discord Message ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1198765432109876543"
                        value={targetMessageId}
                        onChange={(e) => setTargetMessageId(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                        required
                      />
                      {mode === 'edit' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMessage}
                          disabled={isLoadingMessage || !targetMessageId.trim() || !selectedChannel}
                        >
                          {isLoadingMessage ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Load'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Content (for Send and Edit) */}
                {mode !== 'delete' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#344054]">
                        Message Content / Payload
                      </label>
                      <span className="text-[11px] text-[#667085]">
                        {content.length} / 2000 chars
                      </span>
                    </div>

                    {/* Markdown Toolbar */}
                    <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] border-t border-x border-[#E5E7EB] rounded-t-xl text-[#667085]">
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**')}
                        className="p-1.5 rounded-md hover:bg-white hover:text-[#101828] transition-colors"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*')}
                        className="p-1.5 rounded-md hover:bg-white hover:text-[#101828] transition-colors"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`')}
                        className="p-1.5 rounded-md hover:bg-white hover:text-[#101828] transition-colors"
                        title="Inline Code (`code`)"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('```\n', '\n```')}
                        className="p-1.5 rounded-md hover:bg-white hover:text-[#101828] transition-colors"
                        title="Code Block (```)"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('> ')}
                        className="p-1.5 rounded-md hover:bg-white hover:text-[#101828] transition-colors"
                        title="Blockquote (>)"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      id="message-composer"
                      rows={6}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your message payload here. Supports standard Discord markdown formatting..."
                      className="w-full p-3.5 rounded-b-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed shadow-2xs"
                      required
                    />
                  </div>
                )}

                {/* Mention Controls */}
                {mode !== 'delete' && (
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-3">
                    <label className="text-xs font-semibold text-[#344054] flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ping & Mention Controls</span>
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
                          {m === 'ROLE' && 'Specific Role'}
                        </button>
                      ))}
                    </div>

                    {mentionType === 'ROLE' && (
                      <div className="pt-2">
                        <select
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          required
                        >
                          <option value="">Select target role to ping...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              @{r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant={mode === 'delete' ? 'danger' : 'primary'}
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!selectedChannel || (mode !== 'delete' && !content.trim()) || (mode === 'delete' && !targetMessageId.trim())}
                    className="w-full sm:w-auto"
                  >
                    {mode === 'send' && 'Dispatch Message to Channel'}
                    {mode === 'edit' && 'Save Modified Message'}
                    {mode === 'delete' && 'Purge Target Message'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Info & Live Preview Column */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-semibold text-[#101828] uppercase tracking-wider mb-2">
                Live Discord Message Preview
              </h4>
              <div className="p-3.5 rounded-xl bg-[#313338] text-[#dbdee1] text-xs font-sans space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    K
                  </div>
                  <span className="font-semibold text-white text-xs">KRAXX Bot</span>
                  <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                </div>
                <div className="text-xs whitespace-pre-wrap pl-8">
                  {mentionType === 'EVERYONE' && <span className="text-[#c9cdfb] font-medium mr-1">@everyone</span>}
                  {mentionType === 'HERE' && <span className="text-[#c9cdfb] font-medium mr-1">@here</span>}
                  {mentionType === 'ROLE' && selectedRoleId && (
                    <span className="text-[#c9cdfb] font-medium mr-1">
                      @{roles.find(r => r.id === selectedRoleId)?.name || 'Role'}
                    </span>
                  )}
                  {content || <span className="text-[#949ba4] italic">Message content will preview here...</span>}
                </div>
              </div>
            </Card>

            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs text-xs space-y-2">
              <h4 className="font-semibold text-[#101828]">Security & Clearance</h4>
              <p className="text-[#667085] leading-relaxed">
                Messages dispatched via this console are logged in the real-time audit trail and signed with your Discord credentials.
              </p>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
