'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/Form';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { DiscordEmbedPreview, DiscordEmbedData, EmbedField } from '@/components/discord/DiscordEmbedPreview';
import { Sparkles, Save, Plus, Trash2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

import { finishMessageOperationKey, messageOperationKey } from '@/lib/message-operation-key';

const COLOR_PRESETS = [
  { name: 'Indigo Brand', hex: '#4F46E5' },
  { name: 'KRAXXSEC Emerald', hex: '#10B981' },
  { name: 'Studio Violet', hex: '#8B5CF6' },
  { name: 'Cyan Tech', hex: '#06B6D4' },
  { name: 'Warning Amber', hex: '#F59E0B' },
  { name: 'Danger Signal', hex: '#EF4444' },
];

export default function EmbedBuilderPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Embed State
  const [title, setTitle] = useState('OPERATIONAL DISPATCH');
  const [titleUrl, setTitleUrl] = useState('');
  const [description, setDescription] = useState('This is an official communication dispatched from the KRAXX Operations Platform.');
  const [color, setColor] = useState('#4F46E5');
  const [authorName, setAuthorName] = useState('KRAXX HQ');
  const [authorIcon, setAuthorIcon] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [fields, setFields] = useState<EmbedField[]>([
    { name: 'Status', value: 'Active', inline: true },
    { name: 'Division', value: 'KRAXXSEC', inline: true },
  ]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [footerText, setFooterText] = useState('KRAXX Operations Platform • Internal Network');
  const [footerIcon, setFooterIcon] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [dispatchTimestamp] = useState(() => new Date().toISOString());

  // Mentions & Plaintext message accompanying embed
  const [messageContent, setMessageContent] = useState('');
  const [mentionType, setMentionType] = useState<'NONE' | 'EVERYONE' | 'HERE'>('NONE');

  // Save Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('ANNOUNCEMENT');
  const [templateDesc, setTemplateDesc] = useState('');

  // Status & Feedback
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  useEffect(() => {
    if (!guildId) return;
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch(`/api/discord/meta?guildId=${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          if (data.channels && data.channels.length > 0) {
            setSelectedChannel(data.channels[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, [guildId]);

  // Field helpers
  const handleAddField = () => {
    setFields([...fields, { name: '', value: '', inline: false }]);
  };

  const handleUpdateField = (index: number, key: keyof EmbedField, value: string | boolean) => {
    const updated = [...fields];
    if (key === 'inline' && typeof value === 'boolean') {
      updated[index] = { ...updated[index], inline: value };
    } else if (key !== 'inline' && typeof value === 'string') {
      updated[index] = { ...updated[index], [key]: value };
    } else {
      return;
    }
    setFields(updated);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Build current embed payload
  const currentEmbed: DiscordEmbedData = {
    title: title.trim() || undefined,
    description: description.trim() || undefined,
    url: titleUrl.trim() || undefined,
    color,
    author: authorName.trim()
      ? {
          name: authorName.trim(),
          icon_url: authorIcon.trim() || undefined,
          url: authorUrl.trim() || undefined,
        }
      : undefined,
    fields: fields.filter((f) => f.name.trim() && f.value.trim()),
    thumbnail: thumbnailUrl.trim() ? { url: thumbnailUrl.trim() } : undefined,
    image: imageUrl.trim() ? { url: imageUrl.trim() } : undefined,
    footer: footerText.trim()
      ? {
          text: footerText.trim(),
          icon_url: footerIcon.trim() || undefined,
        }
      : undefined,
    timestamp: includeTimestamp ? dispatchTimestamp : undefined,
  };

  // Dispatch Embed
  const handleSendEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setFeedback(null);
    setIsSubmitting(true);

    try {
      // Color string to integer
      const colorInt = parseInt(color.replace('#', ''), 16);

      const payload = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        url: titleUrl.trim() || undefined,
        color: isNaN(colorInt) ? 0x4f46e5 : colorInt,
        author: authorName.trim()
          ? {
              name: authorName.trim(),
              icon_url: authorIcon.trim() || undefined,
              url: authorUrl.trim() || undefined,
            }
          : undefined,
        fields: fields
          .filter((f) => f.name.trim() && f.value.trim())
          .map((f) => ({
            name: f.name.trim(),
            value: f.value.trim(),
            inline: Boolean(f.inline),
          })),
        thumbnail: thumbnailUrl.trim() ? { url: thumbnailUrl.trim() } : undefined,
        image: imageUrl.trim() ? { url: imageUrl.trim() } : undefined,
        footer: footerText.trim()
          ? {
              text: footerText.trim(),
              icon_url: footerIcon.trim() || undefined,
            }
          : undefined,
        timestamp: includeTimestamp ? dispatchTimestamp : undefined,
      };

      const operationPayload = {
        channelId: selectedChannel.id, guildId,
        content: messageContent.trim() || undefined, embeds: [payload],
        mentionType: mentionType !== 'NONE' ? mentionType : undefined,
      };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': await messageOperationKey(operationPayload) },
        body: JSON.stringify(operationPayload),
      });

      const data = await res.json();
      await finishMessageOperationKey(operationPayload, data.operation?.status);
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch embed');
      if (data.operation?.status !== 'SUCCESS') throw new Error(data.message || `Message operation state: ${data.operation?.status || 'UNKNOWN'}.`);

      setFeedback({
        type: 'success',
        message: `Embed message successfully dispatched to #${selectedChannel.name}.`,
      });
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Dispatch error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          category: templateCategory,
          description: templateDesc.trim(),
          embedData: currentEmbed,
          guildId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');

      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDesc('');
      setFeedback({
        type: 'success',
        message: `Template "${data.template?.name || templateName}" saved to operations library.`,
      });
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save template' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Embed builder"
        subtitle="Create rich Discord messages and preview them before sending."
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Embed Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6 ">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span>Embed Configuration</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-base)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors "
                >
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </button>
              </div>

              <form onSubmit={handleSendEmbed} className="space-y-4">
                {/* Target Channel */}
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                  isLoading={isLoadingMeta}
                />

                {/* Plaintext Accompaniment & Mention */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                      Plaintext Message (Optional)
                    </label>
                    <Input aria-label="Plaintext Message (Optional)"
                      type="text"
                      placeholder="Message text preceding embed..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                      Mention
                    </label>
                    <Select aria-label="Mention"
                      value={mentionType}
                      onChange={(e) => setMentionType(e.target.value as 'NONE' | 'EVERYONE' | 'HERE')}
                      className="w-full"
                    >
                      <option value="NONE">No Mention</option>
                      <option value="HERE">@here</option>
                      <option value="EVERYONE">@everyone</option>
                    </Select>
                  </div>
                </div>

                {/* Color Accent Picker */}
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-2">
                    Embed Strip Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setColor(p.hex)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                          color === p.hex
                            ? 'border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                            : 'border-[var(--border-base)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-2 pl-2">
                      <Input aria-label="color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8"
                      />
                      <Input aria-label="color"
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-20 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Author Section */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3">
                  <div className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Author Metadata
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input aria-label="Author Name"
                      type="text"
                      placeholder="Author Name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className=""
                    />
                    <Input aria-label="Author Icon URL"
                      type="url"
                      placeholder="Author Icon URL"
                      value={authorIcon}
                      onChange={(e) => setAuthorIcon(e.target.value)}
                      className=""
                    />
                    <Input aria-label="Author Click URL"
                      type="url"
                      placeholder="Author Click URL"
                      value={authorUrl}
                      onChange={(e) => setAuthorUrl(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                        Embed Title
                      </label>
                      <Input aria-label="Embed Title"
                        type="text"
                        placeholder="Title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                        Title Link URL
                      </label>
                      <Input aria-label="Title Link URL"
                        type="url"
                        placeholder="https://..."
                        value={titleUrl}
                        onChange={(e) => setTitleUrl(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                      Embed Body Description
                    </label>
                    <Textarea aria-label="Embed Body Description"
                      rows={4}
                      placeholder="Markdown description content..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-y"
                    />
                  </div>
                </div>

                {/* Dynamic Fields Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-[var(--text-secondary)]">
                      Custom Fields ({fields.length} / 25)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddField}
                      disabled={fields.length >= 25}
                      className="flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Field</span>
                    </button>
                  </div>

                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input aria-label="Field Name"
                          type="text"
                          placeholder="Field Name"
                          value={field.name}
                          onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-base)]">
                          <Checkbox

                            checked={field.inline}
                            onChange={(e) => handleUpdateField(idx, 'inline', e.target.checked)}
                            className=""
                          />
                          <span>Inline</span>
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove embed field ${idx + 1}`}
                          onClick={() => handleDeleteField(idx)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Textarea aria-label="Field Value (Markdown supported)"
                        rows={2}
                        placeholder="Field Value (Markdown supported)"
                        value={field.value}
                        onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                        className="w-full resize-y"
                      />
                    </div>
                  ))}
                </div>

                {/* Media Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                      Thumbnail URL (Top Right)
                    </label>
                    <Input aria-label="Thumbnail URL (Top Right)"
                      type="url"
                      placeholder="https://..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">
                      Main Banner Image URL
                    </label>
                    <Input aria-label="Main Banner Image URL"
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Footer & Timestamp */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Footer & Timestamp
                    </span>
                    <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
                      <Checkbox

                        checked={includeTimestamp}
                        onChange={(e) => setIncludeTimestamp(e.target.checked)}
                        className=""
                      />
                      <span>Include Timestamp</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input aria-label="Footer Text"
                      type="text"
                      placeholder="Footer Text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className=""
                    />
                    <Input aria-label="Footer Icon URL"
                      type="url"
                      placeholder="Footer Icon URL"
                      value={footerIcon}
                      onChange={(e) => setFooterIcon(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!selectedChannel}
                    className="w-full font-semibold text-[13px] py-3"
                  >
                    Dispatch Embed to Discord
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Live Realistic Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6  sticky top-20">
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent)]" />
                  <span>Live Discord Preview</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="text-[13px] text-[var(--text-secondary)]">
                  Target: <span className="font-semibold text-[var(--text-primary)]">{selectedChannel ? `#${selectedChannel.name}` : 'None'}</span>
                </div>

                {messageContent && (
                  <div className="p-4 rounded-xl bg-[#313338] text-white text-[13px] font-sans whitespace-pre-wrap border border-[#232428]">
                    {messageContent}
                  </div>
                )}

                <DiscordEmbedPreview embed={currentEmbed} />
              </div>
            </Card>
          </div>
        </div>

        {/* Save Template Modal */}
        <Modal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          title="Save Embed Template"
          subtitle="Store this embed layout in your operations template library"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Template Name
              </label>
              <Input aria-label="Template Name"
                type="text"
                required
                placeholder="e.g. KRAXXSEC Security Advisory"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Category
              </label>
              <Select aria-label="Category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full"
              >
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="SECURITY">Security / KRAXXSEC</option>
                <option value="STUDIO">Creative / KRAXX Studio</option>
                <option value="OPERATIONS">Operations / HQ</option>
                <option value="EMERGENCY">Emergency Alert</option>
              </Select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Description (Optional)
              </label>
              <Input aria-label="Description (Optional)"
                type="text"
                placeholder="Brief description of this template..."
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingTemplate}
              >
                Save to Library
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
