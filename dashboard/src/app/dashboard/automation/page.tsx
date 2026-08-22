'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  X,
  Radio,
} from 'lucide-react';

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
  { id: 'ROLE_ADDED', label: 'Role Assigned to Member' },
  { id: 'ROLE_REMOVED', label: 'Role Revoked from Member' },
  { id: 'TICKET_CREATED', label: 'Support Ticket Created' },
  { id: 'TICKET_CLOSED', label: 'Support Ticket Closed' },
  { id: 'TASK_CREATED', label: 'Task Created' },
  { id: 'TASK_COMPLETED', label: 'Task Completed' },
  { id: 'MEETING_STARTING', label: 'Meeting Starting Soon' },
];

const ACTIONS = [
  { id: 'SEND_MESSAGE', label: 'Send Discord Channel Message' },
  { id: 'SEND_EMBED', label: 'Send Formatted Embed' },
  { id: 'ASSIGN_ROLE', label: 'Assign Role to User' },
  { id: 'REMOVE_ROLE', label: 'Revoke Role from User' },
  { id: 'CREATE_TASK', label: 'Create Automated Task' },
  { id: 'CREATE_REMINDER', label: 'Create Timed Reminder' },
  { id: 'SEND_DM', label: 'Send Direct Message to User' },
];

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRuleItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('MEMBER_JOIN');
  const [action, setAction] = useState('SEND_MESSAGE');
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/automation');
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
    fetchRules();
  }, []);

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/discord/meta');
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
          setRoles(data.roles || []);
          if (data.channels?.length > 0) setSelectedChannel(data.channels[0]);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const configObj: any = {
        channelId: selectedChannel?.id,
        roleId: selectedRole || undefined,
        message: messageContent.trim() || undefined,
      };

      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          trigger,
          action,
          config: JSON.stringify(configObj),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Automation rule deployed to gateway.' });
        setShowCreateModal(false);
        setName('');
        setMessageContent('');
        fetchRules();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create automation rule' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error deploying automation' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/automation/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentStatus }),
      });

      if (res.ok) {
        setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled: !currentStatus } : r)));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Confirm deletion of automation rule?')) return;
    try {
      const res = await fetch(`/api/automation/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== ruleId));
        setFeedback({ type: 'success', message: 'Automation rule removed.' });
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="EVENT AUTOMATION ENGINE"
        subtitle="Gateway Triggers, Reactive Webhooks & Autonomous Ops Logic"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Header Action */}
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="text-[11px] text-[#64748B] uppercase">
            ACTIVE PIPELINES: {rules.filter((r) => r.enabled).length} / {rules.length}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="font-mono text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE AUTOMATION RULE</span>
          </Button>
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

        {/* Rules Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="NO AUTOMATION RULES ACTIVE"
            description="Deploy event listeners to trigger automatic dispatches, tasks, and role allocations."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="font-mono text-xs"
              >
                CREATE FIRST RULE
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              let parsedConfig: any = {};
              try {
                parsedConfig = JSON.parse(rule.config);
              } catch {}

              return (
                <Card
                  key={rule.id}
                  className={`bg-[#0A0F16] flex flex-col justify-between border transition-all p-4 space-y-3 font-mono text-xs ${
                    rule.enabled ? 'border-[#16202E] hover:border-[#22D3EE]/30' : 'border-[#16202E]/60 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-3.5 h-3.5 ${rule.enabled ? 'text-[#22D3EE]' : 'text-[#64748B]'}`} />
                        <h3 className="font-bold text-[#F1F5F9] text-sm">{rule.name}</h3>
                      </div>
                      <Badge variant={rule.enabled ? 'brand' : 'neutral'}>
                        {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>

                    {/* Trigger -> Action Flow Visual */}
                    <div className="p-2.5 rounded bg-[#070B10] border border-[#16202E] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#64748B] uppercase">IF TRIGGER:</span>
                        <Badge variant="warning">{rule.trigger}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#64748B] uppercase">THEN ACTION:</span>
                        <Badge variant="brand">{rule.action}</Badge>
                      </div>

                      {parsedConfig.channelId && (
                        <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#16202E]">
                          Target Channel: #{parsedConfig.channelId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#16202E] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                      title="Purge Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <Button
                      variant={rule.enabled ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className="font-mono text-xs py-1"
                    >
                      {rule.enabled ? 'DEACTIVATE' : 'ACTIVATE'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Rule Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#22D3EE]" />
                  <span>DEPLOY AUTOMATION PIPELINE</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    RULE NAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Auto-Notify On Ticket Creation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    GATEWAY EVENT TRIGGER (IF)
                  </label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  >
                    {TRIGGERS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    OPERATIONAL ACTION (THEN)
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  >
                    {ACTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(action === 'SEND_MESSAGE' || action === 'SEND_EMBED') && (
                  <>
                    <ChannelSelector
                      channels={channels}
                      selectedChannelId={selectedChannel?.id || ''}
                      onSelectChannel={setSelectedChannel}
                    />

                    <div>
                      <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                        MESSAGE TEMPLATE
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Message payload dispatched on trigger event..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                      />
                    </div>
                  </>
                )}

                {(action === 'ASSIGN_ROLE' || action === 'REMOVE_ROLE') && (
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      TARGET GUILD ROLE
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="">Select Discord role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16202E]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isCreating}
                  >
                    DEPLOY RULE
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
