'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { DiscordEmbedPreview, DiscordEmbedData, EmbedField } from '@/components/discord/DiscordEmbedPreview';
import {
  Sparkles,
  Send,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Layers,
  X,
} from 'lucide-react';
import { KRAXX_COLORS } from '@/lib/constants';

const COLOR_PRESETS = [
  { name: 'KRAXX Cyan', hex: '#22D3EE' },
  { name: 'KRAXXSEC Emerald', hex: '#10B981' },
  { name: 'KRAXX Studio Indigo', hex: '#818CF8' },
  { name: 'Corporate Blue', hex: '#38BDF8' },
  { name: 'Warning Amber', hex: '#F59E0B' },
  { name: 'Danger Signal', hex: '#EF4444' },
];

export default function EmbedBuilderPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Embed State
  const [title, setTitle] = useState('OPERATIONAL DISPATCH');
  const [titleUrl, setTitleUrl] = useState('');
  const [description, setDescription] = useState('This is an official communication dispatched from the KRAXX Operations Platform.');
  const [color, setColor] = useState('#22D3EE');
  const [authorName, setAuthorName] = useState('KRAXX HQ');
  const [authorIcon, setAuthorIcon] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [fields, setFields] = useState<EmbedField[]>([
    { name: 'Status', value: 'Active', inline: true },
    { name: 'Division', value: 'KRAXXSEC', inline: true },
  ]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [footerText, setFooterText] = useState('KRAXX Operations System • Internal Network');
  const [footerIcon, setFooterIcon] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

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
    async function loadMeta() {
      try {
        setIsLoadingMeta(true);
        const res = await fetch('/api/discord/meta');
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
  }, []);

  // Field helpers
  const handleAddField = () => {
    setFields([...fields, { name: '', value: '', inline: false }]);
  };

  const handleUpdateField = (index: number, key: keyof EmbedField, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
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
    timestamp: includeTimestamp ? new Date().toISOString() : undefined,
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
        color: isNaN(colorInt) ? 0x22d3ee : colorInt,
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
        timestamp: includeTimestamp ? new Date().toISOString() : undefined,
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: messageContent.trim() || undefined,
          embeds: [payload],
          mentionType: mentionType !== 'NONE' ? mentionType : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch embed');

      setFeedback({
        type: 'success',
        message: `Embed message successfully dispatched to #${selectedChannel.name}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Dispatch error' });
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save template' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="EMBED BUILDER STUDIO"
        subtitle="Visual Rich Discord Embed Composer & Operations Dispatch"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Embed Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>EMBED CONFIGURATION</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#070B10] border border-[#16202E] text-[11px] font-mono text-[#94A3B8] hover:text-[#22D3EE] hover:border-[#22D3EE]/30 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span>SAVE TEMPLATE</span>
                  </button>
                </CardTitle>
              </CardHeader>

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
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                      PLAINTEXT MESSAGE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="Message text preceding embed..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                      MENTION
                    </label>
                    <select
                      value={mentionType}
                      onChange={(e: any) => setMentionType(e.target.value)}
                      className="w-full px-2 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="NONE">No Mention</option>
                      <option value="HERE">@here</option>
                      <option value="EVERYONE">@everyone</option>
                    </select>
                  </div>
                </div>

                {/* Color Accent Picker */}
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                    STRIP COLOR ACCENT
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setColor(p.hex)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070B10] border text-[11px] font-mono transition-all ${
                          color === p.hex
                            ? 'border-[#22D3EE] text-[#F1F5F9]'
                            : 'border-[#16202E] text-[#94A3B8] hover:border-[#1E2C3F]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 pl-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-7 h-7 rounded bg-transparent cursor-pointer border border-[#16202E]"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-20 px-2 py-1 rounded bg-[#070B10] border border-[#16202E] text-[11px] font-mono text-[#F1F5F9] uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Author Section */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2.5">
                  <div className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">
                    AUTHOR METADATA
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Author Name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                    <input
                      type="url"
                      placeholder="Author Icon URL"
                      value={authorIcon}
                      onChange={(e) => setAuthorIcon(e.target.value)}
                      className="px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                    <input
                      type="url"
                      placeholder="Author Click URL"
                      value={authorUrl}
                      onChange={(e) => setAuthorUrl(e.target.value)}
                      className="px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                        EMBED TITLE
                      </label>
                      <input
                        type="text"
                        placeholder="Title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                        TITLE URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={titleUrl}
                        onChange={(e) => setTitleUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                      EMBED BODY DESCRIPTION
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Markdown description content..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                    />
                  </div>
                </div>

                {/* Dynamic Fields Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">
                      CUSTOM FIELDS ({fields.length} / 25)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddField}
                      disabled={fields.length >= 25}
                      className="flex items-center gap-1 text-[11px] font-mono text-[#22D3EE] hover:underline disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>ADD FIELD</span>
                    </button>
                  </div>

                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#070B10] border border-[#16202E] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Field Name"
                          value={field.name}
                          onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] cursor-pointer px-2 py-1 rounded bg-[#0A0F16] border border-[#16202E]">
                          <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => handleUpdateField(idx, 'inline', e.target.checked)}
                            className="accent-[#22D3EE]"
                          />
                          <span>Inline</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(idx)}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Field Value (Markdown supported)"
                        value={field.value}
                        onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                      />
                    </div>
                  ))}
                </div>

                {/* Media Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                      THUMBNAIL URL (TOP RIGHT)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">
                      MAIN IMAGE URL (BANNER)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </div>

                {/* Footer & Timestamp */}
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">
                      FOOTER & TIMESTAMP
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTimestamp}
                        onChange={(e) => setIncludeTimestamp(e.target.checked)}
                        className="accent-[#22D3EE]"
                      />
                      <span>Include Timestamp</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Footer Text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                    <input
                      type="url"
                      placeholder="Footer Icon URL"
                      value={footerIcon}
                      onChange={(e) => setFooterIcon(e.target.value)}
                      className="px-2.5 py-1.5 rounded bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={!selectedChannel}
                    className="w-full font-mono font-bold tracking-wider uppercase text-xs py-2.5"
                  >
                    DISPATCH EMBED TO DISCORD
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Live Realistic Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[#0A0F16] sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>LIVE DISCORD GATEWAY PREVIEW</span>
                </CardTitle>
              </CardHeader>

              <div className="p-1">
                <div className="text-[10px] font-mono text-[#64748B] mb-2 uppercase">
                  Target: {selectedChannel ? `#${selectedChannel.name}` : 'No Channel Selected'}
                </div>

                {messageContent && (
                  <div className="p-3 mb-2 rounded bg-[#313338] text-white text-xs font-sans whitespace-pre-wrap border border-[#232428]">
                    {messageContent}
                  </div>
                )}

                <DiscordEmbedPreview embed={currentEmbed} />
              </div>
            </Card>
          </div>
        </div>

        {/* Save Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#22D3EE]" />
                  <span>SAVE EMBED TEMPLATE</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    TEMPLATE NAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KRAXXSEC Security Advisory"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="SECURITY">Security / KRAXXSEC</option>
                    <option value="STUDIO">Creative / KRAXX Studio</option>
                    <option value="OPERATIONS">Operations / HQ</option>
                    <option value="EMERGENCY">Emergency Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    DESCRIPTION (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of this template layout..."
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplateModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingTemplate}
                  >
                    SAVE TO LIBRARY
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
