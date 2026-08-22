'use client';

import React, { useState, useEffect } from 'react';
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

  // Load channels & roles on mount
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
  }, []);

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
      const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.message.content || '');
        setFeedback({ type: 'success', message: 'Message loaded from Discord gateway successfully.' });
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
        const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}`, {
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
        title="MESSAGE CENTER"
        subtitle="Direct Discord Channel Messaging & Content Operations"
      />

      <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded bg-[#0A0F16] border border-[#16202E] w-fit font-mono text-xs">
          <button
            type="button"
            onClick={() => { setMode('send'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
              mode === 'send'
                ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>DISPATCH MESSAGE</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('edit'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
              mode === 'edit'
                ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>EDIT MESSAGE</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('delete'); setFeedback(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
              mode === 'delete'
                ? 'bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/30'
                : 'text-[#94A3B8] hover:text-[#EF4444]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>DELETE MESSAGE</span>
          </button>
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
            <div className="flex-1">
              <div>{feedback.message}</div>
              {feedback.messageId && (
                <div className="text-[10px] text-[#64748B] mt-0.5">
                  MESSAGE ID: {feedback.messageId}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>
                    {mode === 'send' && 'DISPATCH MESSAGE CONSOLE'}
                    {mode === 'edit' && 'EDIT BOT MESSAGE CONSOLE'}
                    {mode === 'delete' && 'PURGE MESSAGE CONSOLE'}
                  </span>
                </CardTitle>
              </CardHeader>

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
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                      TARGET DISCORD MESSAGE ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1198765432109876543"
                        value={targetMessageId}
                        onChange={(e) => setTargetMessageId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                        required
                      />
                      {mode === 'edit' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMessage}
                          disabled={isLoadingMessage || !targetMessageId.trim() || !selectedChannel}
                          className="font-mono text-xs"
                        >
                          {isLoadingMessage ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            'LOAD'
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
                      <label className="text-[11px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">
                        RAW CONTENT / PAYLOAD
                      </label>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {content.length} / 2000 CHARS
                      </span>
                    </div>

                    {/* Markdown Toolbar */}
                    <div className="flex items-center gap-1 p-1 bg-[#070B10] border-t border-x border-[#16202E] rounded-t text-[#94A3B8]">
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Inline Code (`code`)"
                      >
                        <Code className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('```\n', '\n```')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Code Block (```block```)"
                      >
                        <FileCode className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('> ')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Quote (> quote)"
                      >
                        <Quote className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('[', '](https://)')}
                        className="p-1.5 rounded hover:bg-[#111823] hover:text-[#22D3EE] transition-colors"
                        title="Link ([text](url))"
                      >
                        <LinkIcon className="w-3 h-3" />
                      </button>
                    </div>

                    <textarea
                      id="message-composer"
                      rows={6}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your markdown-formatted message here..."
                      className="w-full p-3 rounded-b bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                      maxLength={2000}
                    />
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant={mode === 'delete' ? 'danger' : 'primary'}
                    isLoading={isSubmitting}
                    disabled={
                      !selectedChannel ||
                      (mode !== 'delete' && !content.trim()) ||
                      (mode !== 'send' && !targetMessageId.trim())
                    }
                    className="w-full font-mono font-bold tracking-wider uppercase text-xs py-2.5"
                  >
                    {mode === 'send' && 'DISPATCH TO DISCORD'}
                    {mode === 'edit' && 'OVERWRITE DISCORD MESSAGE'}
                    {mode === 'delete' && 'PURGE MESSAGE PERMANENTLY'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Parameters Column */}
          <div className="space-y-4">
            {/* Mention Matrix */}
            {mode !== 'delete' && (
              <Card className="bg-[#0A0F16]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AtSign className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>BROADCAST MENTION MATRIX</span>
                  </CardTitle>
                </CardHeader>

                <div className="space-y-2.5 font-mono text-xs">
                  <label className="flex items-center gap-2.5 p-2 rounded bg-[#070B10] border border-[#16202E] cursor-pointer hover:border-[#1E2C3F]">
                    <input
                      type="radio"
                      name="mention"
                      value="NONE"
                      checked={mentionType === 'NONE'}
                      onChange={() => setMentionType('NONE')}
                      className="accent-[#22D3EE]"
                    />
                    <span className="text-[#F1F5F9]">NO MENTION</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded bg-[#070B10] border border-[#16202E] cursor-pointer hover:border-[#1E2C3F]">
                    <input
                      type="radio"
                      name="mention"
                      value="EVERYONE"
                      checked={mentionType === 'EVERYONE'}
                      onChange={() => setMentionType('EVERYONE')}
                      className="accent-[#22D3EE]"
                    />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-[#F1F5F9]">@everyone</span>
                      <Badge variant="danger">MASS</Badge>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded bg-[#070B10] border border-[#16202E] cursor-pointer hover:border-[#1E2C3F]">
                    <input
                      type="radio"
                      name="mention"
                      value="HERE"
                      checked={mentionType === 'HERE'}
                      onChange={() => setMentionType('HERE')}
                      className="accent-[#22D3EE]"
                    />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-[#F1F5F9]">@here</span>
                      <Badge variant="warning">ONLINE</Badge>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded bg-[#070B10] border border-[#16202E] cursor-pointer hover:border-[#1E2C3F]">
                    <input
                      type="radio"
                      name="mention"
                      value="ROLE"
                      checked={mentionType === 'ROLE'}
                      onChange={() => setMentionType('ROLE')}
                      className="accent-[#22D3EE]"
                    />
                    <span className="text-[#F1F5F9]">ROLE TARGET</span>
                  </label>

                  {mentionType === 'ROLE' && (
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="w-full mt-2 p-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
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
              </Card>
            )}

            {/* Operational Guidelines Card */}
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>SECURITY & PROTOCOLS</span>
                </CardTitle>
              </CardHeader>
              <div className="space-y-2 text-[11px] font-mono text-[#94A3B8] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-[#22D3EE] font-bold">1.</span>
                  <span>All dispatched messages are permanently logged to the KRAXX Audit database.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#22D3EE] font-bold">2.</span>
                  <span>Mass mentions (@everyone/@here) require Management Head clearance.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#22D3EE] font-bold">3.</span>
                  <span>Message deletion requires confirmation and cannot be undone.</span>
                </div>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
