'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { Table } from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MODERATION_ACTIONS, isChannelAction, type ModerationAction } from '../../../../../../src/services/moderation-contract';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, Shield } from 'lucide-react';

interface ModLogItem {
  id: string;
  guildId: string;
  targetId: string;
  moderatorId: string;
  action: string;
  caseNumber: number;
  status: string;
  errorCode: string | null;
  reason: string | null;
  evidence: string | null;
  duration: number | null;
  active: boolean;
  createdAt: string;
}

const ACTION_FILTERS = ['ALL', ...MODERATION_ACTIONS.filter(a => a !== 'ESCALATE')];

export default function ModerationPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();

  const [logs, setLogs] = useState<ModLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchTarget] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [targetId, setTargetId] = useState('');
  const [selectedAction, setSelectedAction] = useState<ModerationAction>('WARN');
  const [purgeCount, setPurgeCount] = useState(50);
  const [sourceCaseNumber, setSourceCaseNumber] = useState(1);
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const [reason, setReason] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [timeoutDuration, setTimeoutDuration] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSequence = useRef(0);
  const fetchLogs = useCallback(async () => {
    if (!guildId) return;
    const sequence = ++fetchSequence.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('guildId', guildId);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (searchTarget) params.set('targetId', searchTarget);

      const res = await fetch(`/api/moderation?${params.toString()}`);
      if (sequence !== fetchSequence.current) return;
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else throw new Error('Failed to load history.');
    } catch {
      if (sequence !== fetchSequence.current) return;
      setLogs([]);
      setFeedback({ type: 'error', message: 'Failed to load moderation history. Check server access and try again.' });
    } finally {
      if (sequence === fetchSequence.current) setIsLoading(false);
    }
  }, [guildId, actionFilter, searchTarget]);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
    const sequenceAtSetup = fetchSequence;
    void Promise.resolve().then(fetchLogs);
    return () => { sequenceAtSetup.current++; };
  }, [fetchLogs, guildId, router]);

  const handleSubmitModAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) return;

    if (!guildId) {
      setFeedback({ type: 'error', message: 'No server selected.' });
      return;
    }

    if (['BAN', 'KICK', 'PURGE', 'ESCALATE', 'LOCK', 'UNLOCK'].includes(selectedAction)) {
      const confirmed = await confirm(
        `Execute ${selectedAction} on target ${targetId}? Purge is irreversible; escalation advances WARN to TIMEOUT or TIMEOUT to BAN.`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = { guildId, targetId: targetId.trim(), action: selectedAction, reason: reason.trim() || undefined,
        evidence: evidenceInput.split(/\r?\n/).map(url => url.trim()).filter(Boolean),
        durationSeconds: selectedAction === 'SLOWMODE' ? slowmodeSeconds : timeoutDuration,
        count: purgeCount, sourceCaseNumber: selectedAction === 'ESCALATE' ? sourceCaseNumber : undefined };
      const fingerprint = JSON.stringify(payload);
      if (!attempt.current || attempt.current.payload !== fingerprint) attempt.current = { payload: fingerprint, key: crypto.randomUUID() };
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestKey: attempt.current.key }),
      });

      const data = await res.json();
      if (res.ok) {
        const details = data.log.details ? JSON.parse(data.log.details) : {};
        setFeedback({
          type: 'success',
          message: `Case #${data.log.caseNumber}: ${data.log.action} confirmed.${selectedAction === 'PURGE' ? ` Deleted ${details.deletedCount} messages; skipped ${details.skippedCount}.` : details.noChange ? ' No change was needed.' : ''}`,
        });
        setTargetId('');
        setReason('');
        setEvidenceInput('');
        attempt.current = null;
        fetchLogs();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch moderation action' });
        if (data.log?.status === 'FAILURE') attempt.current = null;
        void fetchLogs();
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Action error' });
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
        title="Moderation"
        subtitle="Manage moderation actions and review cases."
      />

      <PageContainer className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            role="status"
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Action Console (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 sm:p-6 ">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-base)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
                  <span>Enforcement Console</span>
                </h3>
              </div>

              <form onSubmit={handleSubmitModAction} className="space-y-4 text-[13px]">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    {isChannelAction(selectedAction) ? 'Target Discord Text Channel ID' : 'Target Discord User ID'}
                  </label>
                  <Input aria-label={isChannelAction(selectedAction) ? 'Target Discord Text Channel ID' : 'Target Discord User ID'}
                    type="text"
                    required
                    placeholder="e.g. 719283928192839128"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-2">
                    Security Action Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MODERATION_ACTIONS.map((a) => (
                      <button
                        key={a}
                        aria-pressed={selectedAction === a}
                        type="button"
                        onClick={() => setSelectedAction(a)}
                        className={`py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                          selectedAction === a
                            ? a === 'BAN' || a === 'KICK'
                              ? 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]'
                              : 'bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]'
                            : 'bg-[var(--surface-1)] border-[var(--border-base)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {['TIMEOUT', 'ESCALATE'].includes(selectedAction) && (
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Timeout Duration
                    </label>
                    <Select aria-label="Timeout Duration"
                      value={timeoutDuration}
                      onChange={(e) => setTimeoutDuration(Number(e.target.value))}
                      className="w-full"
                    >
                      <option value={60}>1 Minute (Test)</option>
                      {selectedAction === 'TIMEOUT' && <option value={0}>Remove timeout</option>}
                      <option value={300}>5 Minutes</option>
                      <option value={600}>10 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={86400}>24 Hours (1 Day)</option>
                      <option value={604800}>1 Week</option>
                    </Select>
                  </div>
                )}

                {selectedAction === 'PURGE' && <label className="block">Inspect last messages (1–100; pinned and messages near/over 14 days old are skipped)
                  <Input aria-label="Purge message count" type="number" min={1} max={100} value={purgeCount} onChange={e => setPurgeCount(Number(e.target.value))} className="w-full" />
                </label>}
                {selectedAction === 'SLOWMODE' && <label className="block">Slowmode seconds (text channels only; 0 disables; maximum 21600)
                  <Input aria-label="Slowmode seconds" type="number" min={0} max={21600} value={slowmodeSeconds} onChange={e => setSlowmodeSeconds(Number(e.target.value))} className="w-full" />
                </label>}
                {selectedAction === 'ESCALATE' && <label className="block">Active source case number (WARN → TIMEOUT, TIMEOUT → BAN)
                  <Input aria-label="Source case number" type="number" min={1} value={sourceCaseNumber} onChange={e => setSourceCaseNumber(Number(e.target.value))} className="w-full" />
                </label>}
                {['LOCK', 'UNLOCK'].includes(selectedAction) && <p>Controls @everyone Send Messages only. Explicit role/member allows and administrators can bypass this lock. Unlock restores the previous setting and preserves other permissions.</p>}

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Formal Sanction Reason
                  </label>
                  <Textarea aria-label="Formal Sanction Reason"
                    rows={3}
                    placeholder="Reason saved in the case and audit history..."
                    maxLength={400}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full resize-y"
                  />
                </div>

                <div>
                  <label htmlFor="moderation-evidence" className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Evidence links (up to 5 Discord messages in this server)
                  </label>
                  <Textarea
                    id="moderation-evidence"
                    rows={2}
                    placeholder="One Discord message URL per line"
                    value={evidenceInput}
                    onChange={(e) => setEvidenceInput(e.target.value)}
                    className="w-full resize-y"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant={selectedAction === 'BAN' || selectedAction === 'KICK' ? 'danger' : 'primary'}
                    size="md"
                    isLoading={isSubmitting}
                    disabled={!targetId.trim()}
                    className="w-full font-semibold text-[13px] py-3"
                  >
                    Execute {selectedAction} Command
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Mod Log Records (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
              <div className="p-5 border-b border-[var(--border-base)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--accent)]" />
                  <span>Moderation Audit Trail ({logs.length})</span>
                </h3>

                <div className="flex flex-wrap items-center gap-1">
                  {ACTION_FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActionFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-colors ${
                        actionFilter === f
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
                  <Table className="kraxx-table">
                    <thead>
                      <tr>
                        <th>Case / Action / Result</th>
                        <th>Target</th>
                        <th>Reason</th>
                        <th>Moderator</th>
                        <th className="text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td>#{log.caseNumber} {getActionBadge(log.action)}<div>{log.status} {log.errorCode}</div></td>
                          <td className="font-mono text-[13px] text-[var(--text-primary)]">
                            {log.targetId}
                          </td>
                          <td className="max-w-xs truncate text-[13px] text-[var(--text-secondary)]">
                            {log.reason || 'No reason specified'}
                            {log.evidence && (() => {
                              try {
                                const evidence = JSON.parse(log.evidence) as string[];
                                return evidence.map((url) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer" className="ml-2 text-[var(--accent)] underline">
                                    Evidence
                                  </a>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                          </td>
                          <td className="text-[13px] text-[var(--text-secondary)]">
                            @{log.moderatorId}
                          </td>
                          <td className="text-right text-[13px] text-[var(--text-secondary)]">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
