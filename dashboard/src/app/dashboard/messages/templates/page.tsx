'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { DiscordEmbedPreview, DiscordEmbedData } from '@/components/discord/DiscordEmbedPreview';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  Layers,
  Plus,
  Send,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Calendar,
  X,
  Sparkles,
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
  'SECURITY',
  'STUDIO',
  'OPERATIONS',
  'EMERGENCY',
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
    if (!confirm(`Confirm deletion of template "${name}"?`)) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setFeedback({ type: 'success', message: `Template "${name}" deleted.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete error' });
    }
  };

  const handleQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendModalTemplate || !selectedChannel) return;

    setIsSending(true);
    setFeedback(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch embed');

      setSendModalTemplate(null);
      setFeedback({
        type: 'success',
        message: `Template "${sendModalTemplate.name}" dispatched to #${selectedChannel.name}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to dispatch' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="EMBED TEMPLATE LIBRARY"
        subtitle="Standardized Operational Dispatches & Discord Broadcast Presets"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Header Actions & Categories */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded bg-[#0A0F16] border border-[#16202E] font-mono text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Link href="/dashboard/messages/embed">
            <Button variant="primary" size="sm" className="font-mono text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>NEW EMBED BUILDER</span>
            </Button>
          </Link>
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
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="NO TEMPLATES FOUND IN CATEGORY"
            description="No saved operational embed templates match your current filter criteria."
            action={
              <Link href="/dashboard/messages/embed">
                <Button variant="outline" size="sm" className="font-mono text-xs">
                  CREATE NEW TEMPLATE
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const embed = tpl.embedData || {};
              return (
                <Card
                  key={tpl.id}
                  className="bg-[#0A0F16] flex flex-col justify-between hover:border-[#22D3EE]/30 transition-all p-4 space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="brand">{tpl.category}</Badge>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {new Date(tpl.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-mono font-bold text-[#F1F5F9] truncate">
                        {tpl.name}
                      </h3>
                      {tpl.description && (
                        <p className="text-[11px] text-[#94A3B8] font-sans line-clamp-2 mt-0.5">
                          {tpl.description}
                        </p>
                      )}
                    </div>

                    {embed.title && (
                      <div className="p-2 rounded bg-[#070B10] border border-[#16202E] text-[11px] font-mono text-[#22D3EE] truncate">
                        {embed.title}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#16202E] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(tpl)}
                        className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#94A3B8] hover:text-[#22D3EE] hover:border-[#22D3EE]/30 transition-colors"
                        title="Live Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSendModalTemplate(tpl)}
                      className="font-mono text-xs gap-1 py-1"
                    >
                      <Send className="w-3 h-3 text-[#22D3EE]" />
                      <span>DISPATCH</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Live Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <div>
                  <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-[10px] font-mono text-[#64748B]">CATEGORY: {previewTemplate.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2">
                <DiscordEmbedPreview embed={previewTemplate.embedData} />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#16202E]">
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                  CLOSE
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSendModalTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="font-mono text-xs gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>DISPATCH THIS TEMPLATE</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {sendModalTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#22D3EE]" />
                  <span>DISPATCH TEMPLATE</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSendModalTemplate(null)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickDispatch} className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <span className="text-[10px] text-[#64748B] uppercase">SELECTED TEMPLATE:</span>
                  <div className="font-bold text-[#F1F5F9]">{sendModalTemplate.name}</div>
                </div>

                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSendModalTemplate(null)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSending}
                    disabled={!selectedChannel}
                    className="font-mono font-bold"
                  >
                    DISPATCH NOW
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
