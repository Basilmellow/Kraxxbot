'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DiscordEmbedPreview, DiscordEmbedData } from '@/components/discord/DiscordEmbedPreview';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  Layers,
  Plus,
  Send,
  Eye,
  Copy,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  title: string | null;
  embedData: DiscordEmbedData;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'ALL',
  'ANNOUNCEMENT',
  'KRAXXSEC',
  'KRAXX_STUDIO',
  'RECRUITMENT',
  'EVENT',
  'MEETING',
  'MAINTENANCE',
  'WARNING',
  'UPDATE',
  'CUSTOM',
];

export default function EmbedTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [sendModalTemplate, setSendModalTemplate] = useState<TemplateItem | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const url = selectedCategory === 'ALL' ? '/api/templates' : `/api/templates?category=${selectedCategory}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  useEffect(() => {
    async function loadChannels() {
      try {
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
      }
    }
    loadChannels();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
        setFeedback({ type: 'success', message: `Template "${name}" deleted.` });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete template');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting template');
    }
  };

  const handleDuplicate = async (template: TemplateItem) => {
    const newName = prompt('Enter name for duplicate template:', `${template.name}_copy`);
    if (!newName || !newName.trim()) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: template.category,
          description: template.description,
          title: template.title,
          embedData: template.embedData,
        }),
      });

      if (res.ok) {
        fetchTemplates();
        setFeedback({ type: 'success', message: `Template duplicated as "${newName}".` });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to duplicate template');
      }
    } catch (e: any) {
      alert(e.message || 'Error duplicating');
    }
  };

  const handleSendFromModal = async () => {
    if (!sendModalTemplate || !selectedChannel) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          embeds: [sendModalTemplate.embedData],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Template "${sendModalTemplate.name}" dispatched to #${selectedChannel.name}! (ID: ${data.messageId})`,
        });
        setSendModalTemplate(null);
      } else {
        alert(data.error || 'Failed to send template');
      }
    } catch (e: any) {
      alert(e.message || 'Error sending template');
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryBadgeVariant = (cat: string) => {
    if (cat === 'KRAXXSEC') return 'success';
    if (cat === 'KRAXX_STUDIO') return 'brand';
    if (cat === 'WARNING' || cat === 'MAINTENANCE') return 'warning';
    return 'neutral';
  };

  return (
    <div>
      <Topbar
        title="Embed Templates"
        subtitle="Reusable Rich Embed Library & Quick Dispatch"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Actions & Category Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Categories Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Link href="/dashboard/messages/embed">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create New Template</span>
            </Button>
          </Link>
        </div>

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
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-xs text-[#64748b]">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card className="text-center py-16">
            <FolderOpen className="w-10 h-10 text-[#64748b] mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">No Embed Templates Found</h3>
            <p className="text-xs text-[#64748b] mt-1 max-w-sm mx-auto">
              No templates saved in &quot;{selectedCategory}&quot;. Create a rich embed in Embed Builder and click &quot;Save as Template&quot;.
            </p>
            <Link href="/dashboard/messages/embed" className="mt-4 inline-block">
              <Button variant="primary" size="sm">Create First Template</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="flex flex-col justify-between hover:border-[#00f0ff]/30 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#e2e8f0] font-mono truncate">{tpl.name}</h4>
                      {tpl.title && <p className="text-xs text-[#00f0ff] truncate font-medium">{tpl.title}</p>}
                    </div>
                    <Badge variant={getCategoryBadgeVariant(tpl.category)}>{tpl.category}</Badge>
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">{tpl.description}</p>
                  )}

                  {/* Mini Preview Box */}
                  <div
                    className="p-2.5 rounded bg-[#0a0e15] border-l-2 text-[11px] space-y-1 text-[#94a3b8]"
                    style={{
                      borderLeftColor:
                        typeof tpl.embedData.color === 'number'
                          ? `#${tpl.embedData.color.toString(16).padStart(6, '0')}`
                          : (tpl.embedData.color as string) || '#00f0ff',
                    }}
                  >
                    <div className="font-semibold text-white text-xs truncate">
                      {tpl.embedData.title || tpl.name}
                    </div>
                    {tpl.embedData.description && (
                      <p className="truncate text-[#64748b]">{tpl.embedData.description}</p>
                    )}
                    {tpl.embedData.fields && (
                      <span className="text-[10px] text-[#00f0ff]">
                        {tpl.embedData.fields.length} dynamic field(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 mt-4 border-t border-[#1e2a38] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#00f0ff]"
                      title="Preview Full Embed"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(tpl)}
                      className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#e2e8f0]"
                      title="Duplicate Template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="p-1.5 rounded hover:bg-[#141a22] text-[#64748b] hover:text-[#ef4444]"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSendModalTemplate(tpl)}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#e2e8f0] font-mono">{previewTemplate.name}</h3>
                <span className="text-[11px] text-[#64748b]">{previewTemplate.category} Template</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <div className="py-2">
              <DiscordEmbedPreview embed={previewTemplate.embedData} />
            </div>

            <div className="pt-3 border-t border-[#1e2a38] flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Template Modal */}
      {sendModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#00f0ff]" />
                <span>Dispatch Template: {sendModalTemplate.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSendModalTemplate(null)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={(ch) => setSelectedChannel(ch)}
              />

              <div className="p-3 rounded bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#94a3b8]">
                Dispatches rich embed specification configured in template <strong className="text-[#e2e8f0] font-mono">{sendModalTemplate.name}</strong>.
              </div>

              <div className="pt-3 border-t border-[#1e2a38] flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSendModalTemplate(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendFromModal}
                  isLoading={isSending}
                >
                  Confirm & Dispatch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
