'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
        console.error('Failed to load meta:', err);
      }
    }
    loadMeta();
  }, []);

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/automation/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (res.ok) {
        setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r)));
        setFeedback({ type: 'success', message: `Rule ${!currentEnabled ? 'enabled' : 'disabled'}.` });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update rule');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating rule');
    }
  };

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Delete automation rule "${ruleName}"?`)) return;

    try {
      const res = await fetch(`/api/automation/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== ruleId));
        setFeedback({ type: 'success', message: 'Automation rule deleted.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete rule');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting rule');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const configObj: any = {};
      if (action === 'SEND_MESSAGE' || action === 'SEND_EMBED') {
        configObj.channelId = selectedChannel?.id;
        configObj.message = messageContent.trim();
      } else if (action === 'ASSIGN_ROLE' || action === 'REMOVE_ROLE') {
        configObj.roleId = selectedRole;
      } else if (action === 'SEND_DM') {
        configObj.message = messageContent.trim();
      }

      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          trigger,
          action,
          config: configObj,
          enabled: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Automation rule "${name}" created.` });
        setShowCreateModal(false);
        setName('');
        setMessageContent('');
        fetchRules();
      } else {
        alert(data.error || 'Failed to create automation rule');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating rule');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Automation Engine"
        subtitle="Event-Driven Rule Pipeline & Operational Automation Workflows"
        onRefresh={fetchRules}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#e2e8f0]">Active Automation Rules</h3>
            <p className="text-xs text-[#64748b]">Configure triggers and automated responses across Discord & Database</p>
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            <span>New Rule</span>
          </Button>
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

        {/* Rules Table */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <Zap className="w-4 h-4 text-[#00f0ff]" />
              <span>Event Triggers & Action Pipeline ({rules.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Audited Rule Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Event Trigger</th>
                  <th>Automated Action</th>
                  <th>Active Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      Loading automation rules...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      No automation rules created yet.
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id}>
                      <td className="font-bold text-xs text-[#e2e8f0]">
                        {r.name}
                      </td>

                      <td>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                          {r.trigger}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
                          <ArrowRight className="w-3 h-3 text-[#64748b]" />
                          <span className="font-mono text-[#10b981] font-medium">{r.action}</span>
                        </div>
                      </td>

                      <td>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.enabled}
                            onChange={() => handleToggle(r.id, r.enabled)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#1e2a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00f0ff]"></div>
                        </label>
                      </td>

                      <td className="whitespace-nowrap font-mono text-xs text-[#64748b]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.name)}
                          className="p-1.5 rounded hover:bg-[#141a22] text-[#64748b] hover:text-[#ef4444]"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Automation Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00f0ff]" />
                <span>Create Automation Rule</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Rule Name / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Onboarding Security Role Sync"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Event Trigger</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Automated Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.id})
                    </option>
                  ))}
                </select>
              </div>

              {(action === 'SEND_MESSAGE' || action === 'SEND_EMBED') && (
                <div className="space-y-2 pt-2 border-t border-[#1e2a38]">
                  <div>
                    <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Target Channel</label>
                    <ChannelSelector
                      channels={channels}
                      selectedChannelId={selectedChannel?.id || ''}
                      onSelectChannel={(ch) => setSelectedChannel(ch)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Message Content</label>
                    <textarea
                      rows={2}
                      placeholder="Message dispatched when trigger executes..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  </div>
                </div>
              )}

              {(action === 'ASSIGN_ROLE' || action === 'REMOVE_ROLE') && (
                <div className="pt-2 border-t border-[#1e2a38]">
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Target Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value="">Select target role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Create Automation Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
