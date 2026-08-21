'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  AlertTriangle,
  Clock,
  UserX,
  UserCheck,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Hash,
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
        `CAUTION: Are you sure you want to execute [${selectedAction}] on Discord user ID: ${targetId}?`
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
          message: `Moderation action [${selectedAction}] executed on user ${targetId}.`,
        });
        setTargetId('');
        setReason('');
        fetchLogs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to execute moderation action' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error executing action' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case 'BAN':
        return <Badge variant="danger">BAN</Badge>;
      case 'KICK':
        return <Badge variant="danger">KICK</Badge>;
      case 'TIMEOUT':
        return <Badge variant="warning">TIMEOUT</Badge>;
      case 'WARN':
        return <Badge variant="neutral">WARN</Badge>;
      case 'UNBAN':
        return <Badge variant="success">UNBAN</Badge>;
      default:
        return <Badge variant="neutral">{act}</Badge>;
    }
  };

  return (
    <div>
      <Topbar
        title="Moderation Console"
        subtitle="Security Enforcement, Sanctions & Audit History"
        onRefresh={fetchLogs}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Moderation Action Console */}
          <div className="lg:col-span-5 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Shield className="w-4 h-4 text-[#00f0ff]" />
                  <span>Execute Moderation Sanction</span>
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleSubmitModAction} className="space-y-4 text-xs">
                {/* Target User ID */}
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Target Discord User ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 849204829103948201"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                    required
                  />
                </div>

                {/* Action Selector Pills */}
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1.5 uppercase">Sanction Action</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(['WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'] as const).map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setSelectedAction(act)}
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all ${
                          selectedAction === act
                            ? act === 'BAN' || act === 'KICK'
                              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                              : act === 'TIMEOUT'
                              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                              : act === 'UNBAN'
                              ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                              : 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                            : 'bg-[#0a0e15] border-[#1e2a38] text-[#64748b] hover:text-[#e2e8f0]'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeout duration selector */}
                {selectedAction === 'TIMEOUT' && (
                  <div>
                    <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Timeout Duration</label>
                    <select
                      value={timeoutDuration}
                      onChange={(e) => setTimeoutDuration(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    >
                      <option value={300}>5 Minutes</option>
                      <option value={900}>15 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={86400}>24 Hours (1 Day)</option>
                      <option value={604800}>7 Days (1 Week)</option>
                    </select>
                  </div>
                )}

                {/* Reason Field */}
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Audit Log Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for this disciplinary sanction..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant={selectedAction === 'BAN' || selectedAction === 'KICK' ? 'danger' : 'primary'}
                    className="w-full"
                    isLoading={isSubmitting}
                  >
                    <span>Execute {selectedAction}</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Moderation History Logs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                {['ALL', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setActionFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                      actionFilter === st
                        ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                        : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Target user ID..."
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 rounded bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                />
              </div>
            </div>

            {/* Moderation Logs Table Card */}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="kraxx-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target ID</th>
                      <th>Reason / Note</th>
                      <th>Moderator</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-xs text-[#64748b]">
                          Loading moderation logs...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-xs text-[#64748b]">
                          No moderation history records found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td>{getActionBadge(log.action)}</td>

                          <td className="font-mono text-xs text-[#00f0ff]">
                            {log.targetId}
                          </td>

                          <td className="max-w-xs text-xs text-[#e2e8f0] truncate">
                            {log.reason || <span className="text-[#64748b] italic">No reason logged</span>}
                          </td>

                          <td className="font-mono text-xs text-[#94a3b8]">
                            {log.moderatorId}
                          </td>

                          <td className="whitespace-nowrap font-mono text-xs text-[#64748b]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
