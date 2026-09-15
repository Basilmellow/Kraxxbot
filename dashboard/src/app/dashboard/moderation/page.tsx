'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  UserX,
  UserCheck,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Shield,
} from 'lucide-react';

interface ModLogItem {
  id: string;
  guildId: string;
  targetId: string;
  moderatorId: string;
  action: 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN';
  reason: string | null;
  duration: number | null;
  active: boolean;
  createdAt: string;
}

const ACTION_FILTERS = ['ALL', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'];

export default function ModerationPage() {
  const [logs, setLogs] = useState<ModLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchTarget, setSearchTarget] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [targetId, setTargetId] = useState('');
  const [selectedAction, setSelectedAction] = useState<'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN'>('WARN');
  const [reason, setReason] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (searchTarget) params.set('targetId', searchTarget);

      const res = await fetch(`/api/moderation?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load moderation logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, searchTarget]);

  const handleSubmitModAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) return;

    if (selectedAction === 'BAN' || selectedAction === 'KICK') {
      const confirmed = confirm(
        `Confirm critical security action: Execute [${selectedAction}] on Discord user ID: ${targetId}?`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: targetId.trim(),
          action: selectedAction,
          reason: reason.trim() || undefined,
          durationSeconds: selectedAction === 'TIMEOUT' ? timeoutDuration : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Moderation action ${selectedAction} successfully dispatched against ${targetId}.`,
        });
        setTargetId('');
        setReason('');
        fetchLogs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch moderation action' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Action error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BAN':
        return <Badge variant="danger">BAN</Badge>;
      case 'KICK':
        return <Badge variant="danger">KICK</Badge>;
      case 'TIMEOUT':
        return <Badge variant="warning">TIMEOUT</Badge>;
      case 'WARN':
        return <Badge variant="brand">WARNING</Badge>;
      case 'UNBAN':
        return <Badge variant="success">UNBAN</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Moderation & Security Center"
        subtitle="Guild Threat Enforcement, Incident Telemetry & Sanction Records"
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
          {/* Left Column: Action Console (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1F3F9]">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Enforcement Console</span>
                </h3>
              </div>

              <form onSubmit={handleSubmitModAction} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Target Discord User ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 719283928192839128"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#344054] mb-1.5">
                    Security Action Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setSelectedAction(a)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          selectedAction === a
                            ? a === 'BAN' || a === 'KICK'
                              ? 'bg-red-50 border-red-600 text-red-700'
                              : 'bg-indigo-50 border-indigo-600 text-indigo-700'
                            : 'bg-white border-[#E5E7EB] text-[#475467] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedAction === 'TIMEOUT' && (
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Timeout Duration
                    </label>
                    <select
                      value={timeoutDuration}
                      onChange={(e) => setTimeoutDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    >
                      <option value={60}>1 Minute (Test)</option>
                      <option value={300}>5 Minutes</option>
                      <option value={600}>10 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={86400}>24 Hours (1 Day)</option>
                      <option value={604800}>1 Week</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Formal Sanction Reason
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Reason for audit log and DM dispatch..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs resize-y"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant={selectedAction === 'BAN' || selectedAction === 'KICK' ? 'danger' : 'primary'}
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!targetId.trim()}
                    className="w-full font-semibold text-xs py-2.5"
                  >
                    Execute {selectedAction} Command
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Mod Log Records (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-[#F1F3F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Moderation Audit Trail ({logs.length})</span>
                </h3>

                <div className="flex flex-wrap items-center gap-1">
                  {ACTION_FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActionFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        actionFilter === f
                          ? 'bg-indigo-50 text-indigo-600 font-semibold'
                          : 'text-[#667085] hover:text-[#101828]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="p-4">
                  <SkeletonTable rows={6} />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Shield}
                    title="No moderation records found"
                    description="No moderation actions logged matching your filter parameters."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="kraxx-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Target User</th>
                        <th>Reason</th>
                        <th>Moderator</th>
                        <th className="text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td>{getActionBadge(log.action)}</td>
                          <td className="font-mono text-xs text-[#101828]">
                            {log.targetId}
                          </td>
                          <td className="max-w-xs truncate text-xs text-[#475467]">
                            {log.reason || 'No reason specified'}
                          </td>
                          <td className="text-xs text-[#667085]">
                            @{log.moderatorId}
                          </td>
                          <td className="text-right text-xs text-[#667085]">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
