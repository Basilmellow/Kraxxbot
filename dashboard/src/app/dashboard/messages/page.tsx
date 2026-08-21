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
  Search,
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
        setFeedback({ type: 'success', message: 'Message loaded from Discord successfully.' });
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Message not found' });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to retrieve message' });
    } finally {
      setIsLoadingMessage(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) {
      setFeedback({ type: 'error', message: 'Please select a target Discord channel.' });
      return;
    }

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
            mentionType,
            mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: 'success',
            message: `Message dispatched successfully to #${selectedChannel.name}!`,
            messageId: data.messageId,
          });
          setContent('');
        } else {
          setFeedback({ type: 'error', message: data.error || 'Failed to dispatch message' });
        }
      } else if (mode === 'edit') {
        if (!targetMessageId.trim()) {
          setFeedback({ type: 'error', message: 'Message ID is required for editing.' });
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`/api/messages/${targetMessageId.trim()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: selectedChannel.id,
            content,
            mentionType,
            mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: 'success',
            message: `Message ${targetMessageId} updated successfully in #${selectedChannel.name}!`,
            messageId: targetMessageId,
          });
        } else {
          setFeedback({ type: 'error', message: data.error || 'Failed to edit message' });
        }
      } else if (mode === 'delete') {
        if (!targetMessageId.trim()) {
          setFeedback({ type: 'error', message: 'Message ID is required for deletion.' });
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}`, {
          method: 'DELETE',
        });

        const data = await res.json();
        if (res.ok) {
          setFeedback({
            type: 'success',
            message: `Message ${targetMessageId} deleted successfully from #${selectedChannel.name}.`,
          });
          setTargetMessageId('');
          setContent('');
        } else {
          setFeedback({ type: 'error', message: data.error || 'Failed to delete message' });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error executing operation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute preview content with mentions
  let previewText = content;
  if (mentionType === 'EVERYONE') {
    previewText = `@everyone\n${content}`;
  } else if (mentionType === 'HERE') {
    previewText = `@here\n${content}`;
  } else if (mentionType === 'ROLE' && selectedRoleId) {
    const role = roles.find((r) => r.id === selectedRoleId);
    previewText = `@${role?.name || 'role'}\n${content}`;
  }

  return (
    <div>
      <Topbar
        title="Message Center"
        subtitle="Compose, Edit & Purge Discord Communication"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0f1318] border border-[#1e2a38] w-fit">
          <button
            type="button"
            onClick={() => { setMode('send'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'send'
                ? 'bg-[#00f0ff] text-[#0a0e15] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send New Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('edit'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'edit'
                ? 'bg-[#00f0ff] text-[#0a0e15] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Bot Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('delete'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'delete'
                ? 'bg-[#ef4444] text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'text-[#94a3b8] hover:text-[#ef4444]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Message</span>
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <div>
                <span className="font-semibold">{feedback.message}</span>
                {feedback.messageId && (
                  <span className="ml-2 font-mono text-[11px] text-[#94a3b8] bg-[#0a0e15] px-1.5 py-0.5 rounded border border-[#1e2a38]">
                    ID: {feedback.messageId}
                  </span>
                )}
              </div>
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
                {/* Channel Selector */}
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                  isLoading={isLoadingMeta}
                />

                {/* Target Message ID (Only in Edit & Delete Mode) */}
                {(mode === 'edit' || mode === 'delete') && (
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                      Target Discord Message ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 123456789012345678"
                        value={targetMessageId}
                        onChange={(e) => setTargetMessageId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                        required
                      />
                      {mode === 'edit' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadMessage}
                          isLoading={isLoadingMessage}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          <span>Load</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mentions Controller (Only in Send & Edit Mode) */}
                {mode !== 'delete' && (
                  <div className="space-y-2 pt-1 border-t border-[#1e2a38]">
                    <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                      Broadcast Mention Level
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setMentionType('NONE')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          mentionType === 'NONE'
                            ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                        }`}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => setMentionType('EVERYONE')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          mentionType === 'EVERYONE'
                            ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#ef4444]'
                        }`}
                      >
                        @everyone
                      </button>
                      <button
                        type="button"
                        onClick={() => setMentionType('HERE')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          mentionType === 'HERE'
                            ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#f59e0b]'
                        }`}
                      >
                        @here
                      </button>
                      <button
                        type="button"
                        onClick={() => setMentionType('ROLE')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                          mentionType === 'ROLE'
                            ? 'bg-[#6366f1]/20 border-[#6366f1] text-[#6366f1]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#6366f1]'
                        }`}
                      >
                        @Role...
                      </button>
                    </div>

                    {mentionType === 'ROLE' && (
                      <div className="pt-2">
                        <select
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                        >
                          <option value="">Select a target role...</option>
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

                {/* Markdown Formatting Toolbar & Text Area (Only in Send & Edit Mode) */}
                {mode !== 'delete' && (
                  <div className="space-y-2 pt-1 border-t border-[#1e2a38]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                        Message Content
                      </label>
                      {/* Character Counter */}
                      <span
                        className={`text-[11px] font-mono ${
                          content.length > 2000 ? 'text-[#ef4444] font-bold' : 'text-[#64748b]'
                        }`}
                      >
                        {content.length} / 2000
                      </span>
                    </div>

                    {/* Markdown Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-1 bg-[#0f1318] rounded-t-lg border border-[#1e2a38] border-b-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**')}
                        title="Bold (**text**)"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*')}
                        title="Italic (*text*)"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`')}
                        title="Inline Code (`code`)"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('```\n', '\n```')}
                        title="Code Block (```lang\ncode\n```)"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('> ')}
                        title="Quote (> quote)"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('[', '](https://)')}
                        title="Markdown Link"
                        className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Textarea */}
                    <textarea
                      id="message-composer"
                      rows={8}
                      placeholder="Type your message with Discord Markdown or use formatting buttons above..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-b-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] font-sans placeholder-[#64748b] focus:outline-none focus:border-[#00f0ff]/50 leading-relaxed"
                    />
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-3 border-t border-[#1e2a38] flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    variant={mode === 'delete' ? 'danger' : 'primary'}
                    isLoading={isSubmitting}
                    disabled={
                      (mode !== 'delete' && !content.trim()) ||
                      ((mode === 'edit' || mode === 'delete') && !targetMessageId.trim())
                    }
                  >
                    {mode === 'send' && <Send className="w-4 h-4 mr-1.5" />}
                    {mode === 'edit' && <Edit3 className="w-4 h-4 mr-1.5" />}
                    {mode === 'delete' && <Trash2 className="w-4 h-4 mr-1.5" />}
                    <span>
                      {mode === 'send' && 'Dispatch Message'}
                      {mode === 'edit' && 'Update Message'}
                      {mode === 'delete' && 'Delete Message'}
                    </span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Live Discord Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Live Client Preview
              </span>
              <span className="text-[11px] text-[#64748b] font-mono">
                {selectedChannel ? `#${selectedChannel.name}` : 'No channel selected'}
              </span>
            </div>

            {/* Discord Styled Message Bubble */}
            <div className="bg-[#313338] rounded-xl p-4 border border-[#232428] text-xs text-[#dbdee1] shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00f0ff] p-0.5 flex items-center justify-center font-bold text-[#0a0e15] text-sm flex-shrink-0">
                  K
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm">KRAXX Bot</span>
                    <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                      APP
                    </span>
                    <span className="text-[10px] text-[#949ba4]">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Message Content */}
                  <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed pt-0.5 font-sans">
                    {previewText ? (
                      previewText
                    ) : (
                      <span className="italic text-[#64748b]">Message preview will appear here in real-time...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Guide Card */}
            <Card className="p-4 bg-[#0f1318]/60">
              <h4 className="text-xs font-bold text-[#e2e8f0] mb-2 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Operational Mentions Guide</span>
              </h4>
              <ul className="space-y-1.5 text-[11px] text-[#94a3b8] leading-normal">
                <li>• <strong className="text-[#ef4444]">@everyone</strong> pings all members in guild (Management Head+).</li>
                <li>• <strong className="text-[#f59e0b]">@here</strong> pings only currently online members.</li>
                <li>• <strong className="text-[#6366f1]">@Role</strong> pings target division or team group.</li>
                <li>• All actions are permanently recorded in the security audit trail.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
