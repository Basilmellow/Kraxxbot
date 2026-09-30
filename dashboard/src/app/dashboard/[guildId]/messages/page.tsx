'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input, Textarea, Select } from '@/components/ui/Form';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { finishMessageOperationKey, messageOperationKey } from '@/lib/message-operation-key';
import { Send, Edit3, Trash2, Bold, Italic, Code, FileCode, Quote, AtSign, AlertTriangle, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';

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
    } catch {
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
        const payload = {
          channelId: selectedChannel.id, guildId, content,
          mentionType: mentionType !== 'NONE' ? mentionType : undefined,
          mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
        };
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': await messageOperationKey(payload) },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        await finishMessageOperationKey(payload, data.operation?.status);
        if (!res.ok) throw new Error(data.error || 'Failed to dispatch message.');
        if (data.operation?.status !== 'SUCCESS') throw new Error(data.message || `Message operation state: ${data.operation?.status || 'UNKNOWN'}.`);

        setFeedback({
          type: 'success',
          message: `Dispatched to #${selectedChannel.name} successfully.`,
          messageId: data.messageId,
        });
        setContent('');
      } else if (mode === 'edit') {
        const payload = {
          channelId: selectedChannel.id, guildId, content,
          mentionType: mentionType !== 'NONE' ? mentionType : undefined,
          mentionRoleId: mentionType === 'ROLE' ? selectedRoleId : undefined,
        };
        const res = await fetch(`/api/messages/${targetMessageId.trim()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': await messageOperationKey({ operation: 'EDIT', targetMessageId, ...payload }) },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        await finishMessageOperationKey({ operation: 'EDIT', targetMessageId, ...payload }, data.operation?.status);
        if (!res.ok) throw new Error(data.error || 'Failed to update message.');
        if (data.operation?.status !== 'SUCCESS') throw new Error(data.message || `Message operation state: ${data.operation?.status || 'UNKNOWN'}.`);

        setFeedback({
          type: 'success',
          message: `Message #${targetMessageId} modified in #${selectedChannel.name}.`,
        });
      } else if (mode === 'delete') {
        const payload = { operation: 'DELETE', targetMessageId, channelId: selectedChannel.id, guildId };
        const res = await fetch(`/api/messages/${targetMessageId.trim()}?channelId=${selectedChannel.id}&guildId=${guildId}`, {
          method: 'DELETE',
          headers: { 'Idempotency-Key': await messageOperationKey(payload) },
        });

        const data = await res.json();
        await finishMessageOperationKey(payload, data.operation?.status);
        if (!res.ok) throw new Error(data.error || 'Failed to delete message.');
        if (data.operation?.status !== 'SUCCESS') throw new Error(data.message || `Message operation state: ${data.operation?.status || 'UNKNOWN'}.`);

        setFeedback({
          type: 'success',
          message: `Message purged from #${selectedChannel.name}.`,
        });
        setTargetMessageId('');
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Operation failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Messages"
        subtitle="Compose and manage messages in your Discord channels."
      />

      <PageContainer className="space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--surface-1)] border border-[var(--border-base)] w-fit ">
          <button
            type="button"
            onClick={() => { setMode('send'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              mode === 'send'
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Dispatch Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('edit'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              mode === 'edit'
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Message</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('delete'); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              mode === 'delete'
                ? 'bg-[var(--danger-bg)] text-[var(--danger)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Message</span>
          </button>
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
            <div className="flex-1">
              <div className="font-medium">{feedback.message}</div>
              {feedback.messageId && (
                <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 font-mono">
                  Message ID: {feedback.messageId}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6 ">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--accent)]" />
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
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                      Target Discord Message ID
                    </label>
                    <div className="flex gap-2">
                      <Input aria-label="Target Discord message ID"
                        type="text"
                        placeholder="e.g. 1198765432109876543"
                        value={targetMessageId}
                        onChange={(e) => setTargetMessageId(e.target.value)}
                        className="flex-1 font-mono"
                        required
                      />
                      {mode === 'edit' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMessage}
                          aria-label="Load message"
                          disabled={isLoadingMessage || !targetMessageId.trim() || !selectedChannel}
                        >
                          {isLoadingMessage ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
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
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="message-composer" className="text-[13px] font-semibold text-[var(--text-secondary)]">
                        Message Content / Payload
                      </label>
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {content.length} / 2000 chars
                      </span>
                    </div>

                    {/* Markdown Toolbar */}
                    <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] border-t border-x border-[var(--border-base)] rounded-t-xl text-[var(--text-secondary)]">
                      <button
                        type="button"
                        onClick={() => insertFormatting('**', '**')}
                        className="p-2 rounded-md hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('*', '*')}
                        className="p-2 rounded-md hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('`', '`')}
                        className="p-2 rounded-md hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                        title="Inline Code (`code`)"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('```\n', '\n```')}
                        className="p-2 rounded-md hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                        title="Code Block (```)"
                      >
                        <FileCode className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('> ')}
                        className="p-2 rounded-md hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)] transition-colors"
                        title="Blockquote (>)"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                    </div>

                    <Textarea
                      id="message-composer"
                      rows={6}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your message payload here. Supports standard Discord markdown formatting..."
                      className="w-full"
                      required
                    />
                  </div>
                )}

                {/* Mention Controls */}
                {mode !== 'delete' && (
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3">
                    <label className="text-[13px] font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-[var(--accent)]" />
                      <span>Ping & Mention Controls</span>
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
                          {m === 'ROLE' && 'Specific Role'}
                        </button>
                      ))}
                    </div>

                    {mentionType === 'ROLE' && (
                      <div className="pt-2">
                        <Select aria-label="selected Role Id"
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(e.target.value)}
                          className="w-full"
                          required
                        >
                          <option value="">Select target role to ping...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              @{r.name}
                            </option>
                          ))}
                        </Select>
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
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 ">
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                Live Discord Message Preview
              </h4>
              <div className="p-4 rounded-xl bg-[#313338] text-[#dbdee1] text-[13px] font-sans space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--text-inverse)] font-bold flex items-center justify-center text-[13px]">
                    K
                  </div>
                  <span className="font-semibold text-white text-[13px]">KRAXX Bot</span>
                  <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                </div>
                <div className="text-[13px] whitespace-pre-wrap pl-8">
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

            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5  text-[13px] space-y-2">
              <h4 className="font-semibold text-[var(--text-primary)]">Security & Clearance</h4>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Messages dispatched via this console are logged in the real-time audit trail and signed with your Discord credentials.
              </p>
            </Card>
          </div>
        </form>
      </PageContainer>
    </div>
  );
}
