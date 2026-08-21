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
} from 'lucide-react';
import { KRAXX_COLORS } from '@/lib/constants';

const COLOR_PRESETS = [
  { name: 'KRAXX Brand Aqua', hex: '#00f0ff' },
  { name: 'KRAXXSEC Emerald', hex: '#10b981' },
  { name: 'KRAXX Studio Indigo', hex: '#6366f1' },
  { name: 'Corporate Blue', hex: '#3b82f6' },
  { name: 'Warning Amber', hex: '#f59e0b' },
  { name: 'Danger Crimson', hex: '#ef4444' },
];

export default function EmbedBuilderPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);

  // Embed State
  const [title, setTitle] = useState('OPERATIONAL DISPATCH');
  const [titleUrl, setTitleUrl] = useState('');
  const [description, setDescription] = useState('This is an official communication dispatched from the KRAXX Operations Platform.');
  const [color, setColor] = useState('#00f0ff');
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

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Build the embed object
  const buildEmbedPayload = (): DiscordEmbedData => {
    // Convert hex color to decimal integer for Discord API
    const colorInt = parseInt(color.replace('#', ''), 16) || 0x00f0ff;

    const embedObj: DiscordEmbedData = {
      color: colorInt,
    };

    if (title.trim()) embedObj.title = title.trim();
    if (titleUrl.trim()) embedObj.url = titleUrl.trim();
    if (description.trim()) embedObj.description = description.trim();

    if (authorName.trim()) {
      embedObj.author = {
        name: authorName.trim(),
        icon_url: authorIcon.trim() || undefined,
        url: authorUrl.trim() || undefined,
      };
    }

    const validFields = fields.filter((f) => f.name.trim() && f.value.trim());
    if (validFields.length > 0) {
      embedObj.fields = validFields;
    }

    if (thumbnailUrl.trim()) {
      embedObj.thumbnail = { url: thumbnailUrl.trim() };
    }

    if (imageUrl.trim()) {
      embedObj.image = { url: imageUrl.trim() };
    }

    if (footerText.trim() || footerIcon.trim()) {
      embedObj.footer = {
        text: footerText.trim() || undefined,
        icon_url: footerIcon.trim() || undefined,
      };
    }

    if (includeTimestamp) {
      embedObj.timestamp = new Date().toISOString();
    }

    return embedObj;
  };

  // Send Embed Handler
  const handleSendEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) {
      setFeedback({ type: 'error', message: 'Please select a target Discord channel.' });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const embedPayload = buildEmbedPayload();

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: messageContent.trim() || undefined,
          mentionType,
          embeds: [embedPayload],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Rich embed successfully dispatched to #${selectedChannel.name}! (Message ID: ${data.messageId})`,
        });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch embed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error sending embed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as Template Handler
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert('Please enter a template name.');
      return;
    }

    setIsSavingTemplate(true);

    try {
      const embedPayload = buildEmbedPayload();

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          category: templateCategory,
          description: templateDesc.trim() || null,
          title: title.trim() || null,
          embedData: embedPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Template "${templateName}" saved successfully! Available in Embed Templates.`,
        });
        setShowTemplateModal(false);
        setTemplateName('');
        setTemplateDesc('');
      } else {
        alert(data.error || 'Failed to save template');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Embed Builder"
        subtitle="Visual Rich Embed Designer & Template Creator"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
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
          {/* Left Column: Embed Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Target Channel & Message Context */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Send className="w-4 h-4 text-[#00f0ff]" />
                  <span>Dispatch Target</span>
                </CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                  isLoading={isLoadingMeta}
                />

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
                    Optional Message Text (Above Embed)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Attention all operators..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-[#94a3b8] font-medium">Mention:</span>
                  <div className="flex gap-2">
                    {(['NONE', 'EVERYONE', 'HERE'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMentionType(m)}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                          mentionType === m
                            ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                            : 'bg-[#0f1318] border-[#1e2a38] text-[#64748b] hover:text-[#e2e8f0]'
                        }`}
                      >
                        {m === 'NONE' ? 'None' : `@${m.toLowerCase()}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Author & Color Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Palette className="w-4 h-4 text-[#00f0ff]" />
                  <span>Branding & Header</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-4">
                {/* Accent Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-2 uppercase tracking-wider">
                    Accent Color Bar
                  </label>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setColor(preset.hex)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          color.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-[#00f0ff] bg-[#141a22] text-[#e2e8f0]'
                            : 'border-[#1e2a38] bg-[#0f1318] text-[#94a3b8] hover:text-[#e2e8f0]'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                        <span>{preset.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded border border-[#1e2a38] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#00f0ff"
                      className="w-28 px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>

                {/* Author Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#1e2a38]">
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Author Name</label>
                    <input
                      type="text"
                      placeholder="e.g. KRAXX HQ"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Author Icon URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={authorIcon}
                      onChange={(e) => setAuthorIcon(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Title & Description */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                  <span>Main Content</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="Embed Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-semibold focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Title URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={titleUrl}
                      onChange={(e) => setTitleUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Description (Markdown Supported)</label>
                  <textarea
                    rows={4}
                    placeholder="Write detailed embed description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#00f0ff]/50 leading-relaxed"
                  />
                </div>
              </div>
            </Card>

            {/* Dynamic Fields Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>Embed Fields ({fields.length} / 25)</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddField}
                  disabled={fields.length >= 25}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Field</span>
                </Button>
              </CardHeader>

              <div className="space-y-3">
                {fields.length === 0 ? (
                  <p className="text-xs text-[#64748b] italic text-center py-3">No fields added yet. Click &quot;Add Field&quot; to insert grid items.</p>
                ) : (
                  fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Field Name"
                          value={field.name}
                          onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] font-semibold focus:outline-none focus:border-[#00f0ff]/50"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(field.inline)}
                            onChange={(e) => handleUpdateField(idx, 'inline', e.target.checked)}
                            className="rounded border-[#1e2a38] text-[#00f0ff]"
                          />
                          <span>Inline</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="text-[#64748b] hover:text-[#ef4444] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Field Value (Markdown supported)"
                        value={field.value}
                        onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                        className="w-full px-2.5 py-1 rounded bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Media & Footer Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <ImageIcon className="w-4 h-4 text-[#00f0ff]" />
                  <span>Media & Footer</span>
                </CardTitle>
              </CardHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Thumbnail URL (Top Right)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Large Banner Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1e2a38]">
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Footer Text</label>
                    <input
                      type="text"
                      placeholder="Footer text..."
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Footer Icon URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={footerIcon}
                      onChange={(e) => setFooterIcon(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="rounded border-[#1e2a38] text-[#00f0ff]"
                    />
                    <span>Include Timestamp</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplateModal(true)}
              >
                <FolderPlus className="w-4 h-4 mr-1.5 text-[#00f0ff]" />
                <span>Save as Template</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleSendEmbed}
                isLoading={isSubmitting}
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span>Send Embed</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Live Embed Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Live Discord Embed Preview
              </span>
              <span className="text-[11px] text-[#64748b] font-mono">
                {selectedChannel ? `#${selectedChannel.name}` : 'No target'}
              </span>
            </div>

            {/* Render Preview */}
            <DiscordEmbedPreview embed={buildEmbedPayload()} />

            {/* Embed Specs Card */}
            <Card className="p-4 bg-[#0f1318]/60">
              <h4 className="text-xs font-bold text-[#e2e8f0] mb-2">Embed Specifications</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94a3b8]">
                <div>Title: <span className="font-mono text-[#e2e8f0]">{title.length}/256</span></div>
                <div>Description: <span className="font-mono text-[#e2e8f0]">{description.length}/4096</span></div>
                <div>Fields: <span className="font-mono text-[#e2e8f0]">{fields.length}/25</span></div>
                <div>Color: <span className="font-mono text-[#00f0ff]">{color}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Save className="w-4 h-4 text-[#00f0ff]" />
                <span>Save Embed as Template</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Template Identifier / Name</label>
                <input
                  type="text"
                  placeholder="e.g. weekly_security_report"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                >
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="KRAXXSEC">KRAXXSEC</option>
                  <option value="KRAXX_STUDIO">KRAXX STUDIO</option>
                  <option value="RECRUITMENT">Recruitment</option>
                  <option value="EVENT">Event</option>
                  <option value="MEETING">Meeting</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="WARNING">Warning</option>
                  <option value="UPDATE">Update</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Standard template for CTF and security updates"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
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
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
