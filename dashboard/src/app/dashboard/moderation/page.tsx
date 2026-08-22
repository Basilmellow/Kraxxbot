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
  const [timeoutDuration, setTimeoutDuration] = useState(3600); // 1 hr default
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
        `CONFIRM CRITICAL ACTION: Execute [${selectedAction}] on Discord user ID: ${targetId}?`
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
          message: `Disciplinary action [${selectedAction}] executed on ${targetId}.`,
        });
        setTargetId('');
        setReason('');
        fetchLogs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to execute moderation action' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Execution error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'WARN':
        return <Badge variant="warning">WARN</Badge>;
      case 'TIMEOUT':
        return <Badge variant="neutral">TIMEOUT</Badge>;
      case 'KICK':
        return <Badge variant="danger">KICK</Badge>;
      case 'BAN':
        return <Badge variant="danger">BAN</Badge>;
      case 'UNBAN':
        return <Badge variant="success">UNBAN</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="SECURITY & DISCIPLINARY CONTROL"
        subtitle="KRAXXSEC Protocol Enforcement, Gateway Sanctions & Audit Log"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
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

        {/* Action Dispatch Console & Log Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Action Console (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[#0A0F16]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>DISCIPLINARY ACTION CONSOLE</span>
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleSubmitModAction} className="space-y-4 font-mono text-xs">
                {/* Target User ID */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                    TARGET DISCORD USER ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 842109876543210987"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                {/* Action Selector */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1.5">
                    SANCTION TYPE
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'WARN', label: 'WARN', color: 'border-[#F59E0B]/40 text-[#F59E0B]' },
                      { id: 'TIMEOUT', label: 'TIMEOUT', color: 'border-[#94A3B8]/40 text-[#94A3B8]' },
                      { id: 'KICK', label: 'KICK', color: 'border-[#EF4444]/40 text-[#EF4444]' },
                      { id: 'BAN', label: 'BAN', color: 'border-[#EF4444]/60 text-[#EF4444]' },
                      { id: 'UNBAN', label: 'UNBAN', color: 'border-[#10B981]/40 text-[#10B981]' },
                    ].map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedAction(a.id as any)}
                        className={`p-2 rounded border text-center font-bold transition-all ${
                          selectedAction === a.id
                            ? 'bg-[#111823] border-[#22D3EE] text-[#22D3EE]'
                            : `bg-[#070B10] border-[#16202E] ${a.color} hover:border-[#1E2C3F]`
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeout Duration */}
                {selectedAction === 'TIMEOUT' && (
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      TIMEOUT DURATION
                    </label>
                    <select
                      value={timeoutDuration}
                      onChange={(e) => setTimeoutDuration(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value={300}>5 Minutes</option>
                      <option value={900}>15 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={86400}>24 Hours</option>
                      <option value={604800}>7 Days</option>
                    </select>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                    FORMAL INCIDENT REASON
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter formal justification for audit logs..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                  />
                </div>

                {/* Execute Button */}
                <Button
                  type="submit"
                  variant={selectedAction === 'BAN' || selectedAction === 'KICK' ? 'danger' : 'primary'}
                  isLoading={isSubmitting}
                  disabled={!targetId.trim()}
                  className="w-full font-mono font-bold tracking-wider uppercase text-xs py-2.5"
                >
                  EXECUTE [{selectedAction}] SANCTION
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Moderation Log Stream (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[#0A0F16] overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>SANCTION AUDIT LOGS ({logs.length})</span>
                  </CardTitle>

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1 p-0.5 rounded bg-[#070B10] border border-[#16202E] font-mono text-[10px]">
                    {ACTION_FILTERS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setActionFilter(f)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          actionFilter === f
                            ? 'bg-[#111823] text-[#22D3EE] font-bold border border-[#1E2C3F]'
                            : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              {isLoading ? (
                <div className="p-4">
                  <SkeletonTable rows={6} />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Shield}
                    title="NO MODERATION LOGS RECORDED"
                    description="No disciplinary actions match your current filter parameters."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                        <th className="py-2.5 px-3 font-semibold">ACTION</th>
                        <th className="py-2.5 px-3 font-semibold">TARGET USER ID</th>
                        <th className="py-2.5 px-3 font-semibold">JUSTIFICATION</th>
                        <th className="py-2.5 px-3 font-semibold">MODERATOR</th>
                        <th className="py-2.5 px-3 font-semibold text-right">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16202E]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#0D131C] transition-colors">
                          <td className="py-2.5 px-3">{getActionBadge(log.action)}</td>
                          <td className="py-2.5 px-3 font-bold text-[#F1F5F9]">{log.targetId}</td>
                          <td className="py-2.5 px-3 text-[#94A3B8] max-w-xs truncate">
                            {log.reason || 'No justification provided'}
                          </td>
                          <td className="py-2.5 px-3 text-[#64748B]">{log.moderatorId}</td>
                          <td className="py-2.5 px-3 text-right text-[#64748B]">
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
