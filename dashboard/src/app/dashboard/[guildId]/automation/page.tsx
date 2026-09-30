'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { Zap, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface AutomationRuleItem {
  id: string;
  name: string;
  trigger: string;
  action: string;
  config: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

const TRIGGERS = [
  { id: 'MEMBER_JOIN', label: 'Member Joined Guild' },
  { id: 'MEMBER_LEAVE', label: 'Member Left Guild' },
];

const ACTIONS = [
  { id: 'SEND_MESSAGE', label: 'Send Discord Channel Message' },
  { id: 'SEND_DM', label: 'Send Direct Message to User' },
];

export default function AutomationPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();

  const [rules, setRules] = useState<AutomationRuleItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('MEMBER_JOIN');
  const [action, setAction] = useState('SEND_MESSAGE');
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchRules = async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/automation?guildId=${guildId}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (e) {
      console.error('Failed to load rules:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchRules);
  }, [guildId]);

  useEffect(() => {
    if (!guildId) return;
    async function loadMeta() {
      try {
        const res = await fetch(`/api/discord/meta?guildId=${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          if (data.channels?.length > 0) setSelectedChannel(data.channels[0]);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, [guildId]);

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/automation/${ruleId}?guildId=${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r)));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!await confirm('Confirm deletion of this automation workflow?')) return;
    try {
      const res = await fetch(`/api/automation/${ruleId}?guildId=${guildId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== ruleId));
        setFeedback({ type: 'success', message: 'Automation rule purged.' });
      }
    } catch (err) {
      console.error('Delete rule failed:', err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !guildId) return;

    setIsCreating(true);
    setFeedback(null);

    const configPayload: Record<string, string> = {};
    if (action === 'SEND_MESSAGE' && selectedChannel) configPayload.channelId = selectedChannel.id;
    if (messageContent.trim()) configPayload.message = messageContent.trim();

    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          name: name.trim(),
          trigger,
          action,
          config: JSON.stringify(configPayload),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Automation workflow created.' });
        setShowCreateModal(false);
        setName('');
        setMessageContent('');
        fetchRules();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create rule' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Automation error' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Automations"
        subtitle="Configure event triggers and automated responses."
      />

      <PageContainer className="space-y-6">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-secondary)]">
            Configure autonomous event pipelines triggered by Discord gateway events.
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Automation</span>
          </Button>
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
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Automation Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No automation rules configured"
            description="Create durable member join or leave workflows that send a channel message or a direct message."
            actionLabel="Create Automation Rule"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rules.map((rule) => (
              <Card
                key={rule.id}
                className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5  flex flex-col justify-between hover:border-[var(--accent-border)] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {rule.name}
                    </h4>
                    <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-2 mb-4 text-[13px]">
                    <div>
                      <span className="text-[13px] uppercase font-bold text-[var(--text-secondary)] block mb-0.5">
                        Trigger
                      </span>
                      <span className="text-[var(--accent)] font-semibold bg-[var(--accent-dim)] px-2 py-0.5 rounded-md border border-[var(--accent-border)] inline-block text-[13px]">
                        {TRIGGERS.find((t) => t.id === rule.trigger)?.label || rule.trigger}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-[var(--text-secondary)]">
                      <ArrowRight className="w-4 h-4" />
                    </div>

                    <div>
                      <span className="text-[13px] uppercase font-bold text-[var(--text-secondary)] block mb-0.5">
                        Action
                      </span>
                      <span className="text-[var(--success)] font-semibold bg-[var(--success-bg)] px-2 py-0.5 rounded-md border border-[var(--success-border)] inline-block text-[13px]">
                        {ACTIONS.find((a) => a.id === rule.action)?.label || rule.action}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-base)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {rule.enabled ? 'Pause Workflow' : 'Enable Workflow'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Rule Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Event Automation"
          subtitle="Link gateway events directly to automated discord reactions"
        >
          <form onSubmit={handleCreateRule} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Automation Rule Name
              </label>
              <Input aria-label="Automation Rule Name"
                type="text"
                required
                placeholder="e.g. Welcome & Auto-Role Dispatch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Event Trigger
              </label>
              <Select aria-label="Event Trigger"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Automated Reaction
              </label>
              <Select aria-label="Automated Reaction"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full"
              >
                {ACTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>

            {action === 'SEND_MESSAGE' && (
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                />
            )}
            {(action === 'SEND_MESSAGE' || action === 'SEND_DM') && (
              <>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Message Template Content
                  </label>
                  <Textarea aria-label="Message Template Content"
                    rows={3}
                    placeholder="Welcome {user} to KRAXX Operations!"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="w-full resize-y"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreating}
              >
                Create Workflow
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
