'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
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
  const router = useRouter();
  const guildId = useGuildId();

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

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchTemplates = async () => {
    if (!guildId) return;
    try {
      setIsLoading(true);
      const url = selectedCategory === 'ALL'
        ? `/api/templates?guildId=${guildId}`
        : `/api/templates?category=${selectedCategory}&guildId=${guildId}`;
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
  }, [selectedCategory, guildId]);

  useEffect(() => {
    if (!guildId) return;
    async function loadChannels() {
      try {
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
      }
    }
    loadChannels();
  }, [guildId]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}" permanently?`)) return;
    try {
      const res = await fetch(`/api/templates/${id}?guildId=${guildId}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Template "${name}" deleted.` });
        fetchTemplates();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete error' });
    }
  };

  const handleSendFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch template');

      setSendModalTemplate(null);
      setFeedback({
        type: 'success',
        message: `Template "${sendModalTemplate.name}" dispatched to #${selectedChannel.name}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Dispatch error' });
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'SECURITY':
        return <Badge variant="success">KRAXXSEC</Badge>;
      case 'STUDIO':
        return <Badge variant="studio">STUDIO</Badge>;
      case 'EMERGENCY':
        return <Badge variant="danger">EMERGENCY</Badge>;
      case 'OPERATIONS':
        return <Badge variant="brand">HQ OPS</Badge>;
      default:
        return <Badge variant="neutral">{cat}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Embed Template Library"
        subtitle="Saved Embed Layouts, Division Archetypes & Instant Dispatch"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Header Actions & Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Link href={`/dashboard/${guildId}/messages/embed`}>
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Embed</span>
            </Button>
          </Link>
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
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Template Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No templates found in library"
            description="Create rich embed templates in the Embed Builder to store them in this operations library."
            actionLabel="Open Embed Builder"
            onAction={() => {
              router.push(`/dashboard/${guildId}/messages/embed`);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-[#101828] truncate">
                      {tpl.name}
                    </h4>
                    {getCategoryBadge(tpl.category)}
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-[#667085] line-clamp-2 mb-3 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  {/* Embed Mini Strip Indicator */}
                  <div
                    className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs font-mono space-y-1 mb-4"
                    style={{
                      borderLeft: `4px solid ${
                        typeof tpl.embedData?.color === 'string'
                          ? tpl.embedData.color
                          : '#4F46E5'
                      }`,
                    }}
                  >
                    <div className="font-bold text-[#101828] truncate">
                      {tpl.embedData?.title || 'No Title'}
                    </div>
                    {tpl.embedData?.description && (
                      <div className="text-[11px] text-[#667085] line-clamp-1">
                        {tpl.embedData.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F3F9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="p-1.5 rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F3F5FA] transition-colors"
                      title="Preview Template"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSendModalTemplate(tpl)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Dispatch</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <Modal
            isOpen={true}
            onClose={() => setPreviewTemplate(null)}
            title={`Preview: ${previewTemplate.name}`}
            subtitle={`Category: ${previewTemplate.category}`}
            maxWidth="2xl"
          >
            <div className="space-y-4">
              <DiscordEmbedPreview embed={previewTemplate.embedData} />
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const t = previewTemplate;
                    setPreviewTemplate(null);
                    setSendModalTemplate(t);
                  }}
                >
                  Proceed to Dispatch
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Dispatch Template Modal */}
        {sendModalTemplate && (
          <Modal
            isOpen={true}
            onClose={() => setSendModalTemplate(null)}
            title={`Dispatch "${sendModalTemplate.name}"`}
            subtitle="Select the target channel to broadcast this saved template"
          >
            <form onSubmit={handleSendFromTemplate} className="space-y-4">
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSending}
                  disabled={!selectedChannel}
                >
                  Confirm & Dispatch
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
