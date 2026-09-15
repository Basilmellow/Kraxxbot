'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
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

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/automation/${ruleId}`, {
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
    if (!confirm('Confirm deletion of this automation workflow?')) return;
    try {
      const res = await fetch(`/api/automation/${ruleId}`, { method: 'DELETE' });
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
    if (!name.trim()) return;

    setIsCreating(true);
    setFeedback(null);

    const configPayload: any = {};
    if (selectedChannel) configPayload.channelId = selectedChannel.id;
    if (selectedRole) configPayload.roleId = selectedRole;
    if (messageContent.trim()) configPayload.message = messageContent.trim();

    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Automation error' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Event Automation & Workflow Engine"
        subtitle="Gateway Event Triggers, Condition Handlers & Auto-Action Pipelines"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#667085]">
            Configure autonomous event pipelines triggered by Discord gateway events.
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Automation</span>
          </Button>
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
            description="Create event pipelines to automate role assignments, welcoming messages, and operational tickets."
            actionLabel="Create Automation Rule"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rules.map((rule) => (
              <Card
                key={rule.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-[#101828] truncate">
                      {rule.name}
                    </h4>
                    <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2 mb-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] block mb-0.5">
                        Trigger
                      </span>
                      <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 inline-block text-[11px]">
                        {TRIGGERS.find((t) => t.id === rule.trigger)?.label || rule.trigger}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-[#98A2B3]">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] block mb-0.5">
                        Action
                      </span>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block text-[11px]">
                        {ACTIONS.find((a) => a.id === rule.action)?.label || rule.action}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id, rule.enabled)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {rule.enabled ? 'Pause Workflow' : 'Enable Workflow'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
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
          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Automation Rule Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Welcome & Auto-Role Dispatch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Event Trigger
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Automated Reaction
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  <label className="block font-semibold text-[#344054] mb-1">
                    Message Template Content
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Welcome {user} to KRAXX Operations!"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                  />
                </div>
              </>
            )}

            {(action === 'ASSIGN_ROLE' || action === 'REMOVE_ROLE') && (
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Target Discord Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
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
      </div>
    </div>
  );
}
