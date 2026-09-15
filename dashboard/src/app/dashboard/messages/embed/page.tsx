'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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
  { name: 'Indigo Brand', hex: '#4F46E5' },
  { name: 'KRAXXSEC Emerald', hex: '#10B981' },
  { name: 'Studio Violet', hex: '#8B5CF6' },
  { name: 'Cyan Tech', hex: '#06B6D4' },
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
        title="Embed Builder Studio"
        subtitle="Visual Rich Discord Embed Composer & Operations Dispatch"
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Embed Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Embed Configuration</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-medium text-[#475467] hover:text-[#101828] hover:bg-[#F8FAFC] transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
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
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Plaintext Message (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Message text preceding embed..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Mention
                    </label>
                    <select
                      value={mentionType}
                      onChange={(e: any) => setMentionType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    >
                      <option value="NONE">No Mention</option>
                      <option value="HERE">@here</option>
                      <option value="EVERYONE">@everyone</option>
                    </select>
                  </div>
                </div>

                {/* Color Accent Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Embed Strip Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setColor(p.hex)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          color === p.hex
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold'
                            : 'border-[#E5E7EB] bg-white text-[#475467] hover:bg-[#F8FAFC]'
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
                        className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-[#E5E7EB]"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] uppercase shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Author Section */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                    Author Metadata
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Author Name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      type="url"
                      placeholder="Author Icon URL"
                      value={authorIcon}
                      onChange={(e) => setAuthorIcon(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      type="url"
                      placeholder="Author Click URL"
                      value={authorUrl}
                      onChange={(e) => setAuthorUrl(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Embed Title
                      </label>
                      <input
                        type="text"
                        placeholder="Title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#344054] mb-1">
                        Title Link URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={titleUrl}
                        onChange={(e) => setTitleUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Embed Body Description
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Markdown description content..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-y shadow-2xs"
                    />
                  </div>
                </div>

                {/* Dynamic Fields Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#344054]">
                      Custom Fields ({fields.length} / 25)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddField}
                      disabled={fields.length >= 25}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                  </div>

                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Field Name"
                          value={field.name}
                          onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-[#475467] cursor-pointer px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E7EB]">
                          <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => handleUpdateField(idx, 'inline', e.target.checked)}
                            className="accent-indigo-600 rounded"
                          />
                          <span>Inline</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(idx)}
                          className="p-1.5 text-[#667085] hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Field Value (Markdown supported)"
                        value={field.value}
                        onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                      />
                    </div>
                  ))}
                </div>

                {/* Media Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Thumbnail URL (Top Right)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Main Banner Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Footer & Timestamp */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                      Footer & Timestamp
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-[#475467] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTimestamp}
                        onChange={(e) => setIncludeTimestamp(e.target.checked)}
                        className="accent-indigo-600 rounded"
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
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <input
                      type="url"
                      placeholder="Footer Icon URL"
                      value={footerIcon}
                      onChange={(e) => setFooterIcon(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full font-semibold text-xs py-2.5"
                  >
                    Dispatch Embed to Discord
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Live Realistic Discord Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs sticky top-20">
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Live Discord Preview</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-[#667085]">
                  Target: <span className="font-semibold text-[#101828]">{selectedChannel ? `#${selectedChannel.name}` : 'None'}</span>
                </div>

                {messageContent && (
                  <div className="p-3.5 rounded-xl bg-[#313338] text-white text-xs font-sans whitespace-pre-wrap border border-[#232428]">
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
          <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Template Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KRAXXSEC Security Advisory"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Category
              </label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="SECURITY">Security / KRAXXSEC</option>
                <option value="STUDIO">Creative / KRAXX Studio</option>
                <option value="OPERATIONS">Operations / HQ</option>
                <option value="EMERGENCY">Emergency Alert</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief description of this template..."
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
      </div>
    </div>
  );
}
