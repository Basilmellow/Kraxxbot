'use client';

import { PageContainer } from '@/components/ui/Page';
import { Select, Input } from '@/components/ui/Form';

import React, { useState, useEffect, useCallback } from 'react';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import { finishMessageOperationKey, messageOperationKey } from '@/lib/message-operation-key';
import { Vote, Plus, Lightbulb, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

interface PollItem {
  id: string;
  question: string;
  options: string[];
  results: { option: string; votes: number; percentage: number }[];
  totalVotes: number;
  channelId: string;
  isAnonymous: boolean;
  expiresAt: string | null;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'UNKNOWN' | 'FAILED';
  messageSyncStatus: 'SYNCED' | 'NEEDS_UPDATE';
  createdAt: string;
}

interface SuggestionItem {
  id: string;
  title: string;
  content: string;
  authorId: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  deliveryStatus: 'NOT_SENT' | 'PENDING' | 'SYNCED' | 'FAILURE' | 'UNKNOWN';
  messageSyncStatus: 'SYNCED' | 'NEEDS_UPDATE' | 'FAILURE' | 'UNKNOWN';
  channelId: string | null;
  messageId: string | null;
  reviewerNotes: string | null;
  createdAt: string;
}

const isSuggestionStatus = (value: string): value is SuggestionItem['status'] =>
  value === 'SUBMITTED' || value === 'UNDER_REVIEW' || value === 'APPROVED' || value === 'REJECTED' || value === 'IMPLEMENTED';

export default function SocialPage() {
  const guildId = useGuildId();
  const [activeTab, setActiveTab] = useState<'POLLS' | 'SUGGESTIONS'>('POLLS');
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [suggestionChannelId, setSuggestionChannelId] = useState('');
  const [suggestionPanelStatus, setSuggestionPanelStatus] = useState('NOT_CONFIGURED');
  const [isPublishingSuggestionPanel, setIsPublishingSuggestionPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Create Poll Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [durationHours, setDurationHours] = useState<number | null>(24);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pollsRes, suggRes, metaRes] = await Promise.all([
        fetch(`/api/social/polls?guildId=${guildId}`),
        fetch(`/api/social/suggestions?guildId=${guildId}`),
        fetch(`/api/discord/meta?guildId=${guildId}`),
      ]);

      if (pollsRes.ok) {
        const pData = await pollsRes.json();
        setPolls(pData.polls || []);
      }
      if (suggRes.ok) {
        const sData = await suggRes.json();
        setSuggestions(sData.suggestions || []);
        setSuggestionChannelId(sData.suggestionConfig?.channelId || '');
        setSuggestionPanelStatus(sData.suggestionConfig?.panelStatus || 'NOT_CONFIGURED');
      }
      if (metaRes.ok) {
        const mData = await metaRes.json();
        setChannels(mData.channels || []);
        if (mData.channels?.length > 0) setSelectedChannel(mData.channels[0]);
      }
    } catch (e) {
      console.error('Failed to load social data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !selectedChannel) return;
    const validOpts = pollOptions.filter((o) => o.trim().length > 0);
    if (validOpts.length < 2) return;

    setIsCreatingPoll(true);
    setFeedback(null);

    const payload = {
      question: pollQuestion.trim(), guildId, options: validOpts, channelId: selectedChannel.id, durationHours, isAnonymous: true,
    };
    try {
      const idempotencyKey = await messageOperationKey(payload);
      const res = await fetch('/api/social/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotencyKey }),
      });

      const data = await res.json();
      if (res.ok && data.operationStatus === 'SUCCESS') {
        await finishMessageOperationKey(payload, 'SUCCESS');
        setFeedback({ type: 'success', message: 'Interactive poll published.' });
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['Option 1', 'Option 2']);
        await fetchData();
      } else if (data.operationStatus === 'UNKNOWN' || data.operationStatus === 'PENDING') {
        setFeedback({ type: 'error', message: 'Poll delivery is not confirmed. Keep this request open and retry to safely check its status.' });
        await fetchData();
      } else {
        if (data.operationStatus === 'FAILURE') await finishMessageOperationKey(payload, 'FAILURE');
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch poll' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Poll creation error' });
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      const res = await fetch(`/api/social/polls/${pollId}/close?guildId=${guildId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guildId }),
      });
      const data = await res.json();
      if (data.operationStatus === 'SUCCESS') setFeedback({ type: 'success', message: 'Poll closed. Final results are shown below.' });
      else setFeedback({ type: 'error', message: data.error || 'Poll closure is recorded; Discord message synchronization is pending.' });
      await fetchData();
    } catch {
      setFeedback({ type: 'error', message: 'Could not confirm poll closure. Refresh to verify its state.' });
    }
  };

  const handleRetryPoll = async (pollId: string) => {
    try {
      const res = await fetch(`/api/social/polls/${pollId}/retry?guildId=${guildId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guildId }),
      });
      const data = await res.json();
      setFeedback(data.operationStatus === 'SUCCESS'
        ? { type: 'success', message: 'Poll delivery was confirmed.' }
        : { type: 'error', message: data.error || 'Poll delivery remains unconfirmed. No duplicate message was sent.' });
      await fetchData();
    } catch {
      setFeedback({ type: 'error', message: 'Could not confirm poll delivery. Retry status to verify safely.' });
    }
  };

  const handleUpdateSuggestionStatus = async (id: string, status: SuggestionItem['status']) => {
    try {
      const res = await fetch(`/api/social/suggestions/${id}?guildId=${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      setFeedback(data.operationStatus === 'SUCCESS'
        ? { type: 'success', message: 'Suggestion review saved and Discord message synchronized.' }
        : { type: 'error', message: data.error || 'Review saved, but Discord synchronization is unconfirmed.' });
      await fetchData();
    } catch (err) {
      console.error('Failed to update suggestion status:', err);
    }
  };

  const handleRecoverSuggestion = async (id: string) => {
    try {
      const response = await fetch(`/api/social/suggestions/${id}/recover?guildId=${guildId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await response.json();
      setFeedback(data.operationStatus === 'SYNCED'
        ? { type: 'success', message: 'Existing Discord submission was confirmed.' }
        : { type: 'error', message: data.operationStatus === 'FAILURE' ? 'Discord rejected the existing submission.' : 'Delivery remains uncertain; no new message was sent.' });
      await fetchData();
    } catch { setFeedback({ type: 'error', message: 'Recovery could not be confirmed. No new message was sent.' }); }
  };

  const handleSuggestionPanel = async () => {
    if (!suggestionChannelId) return;
    setIsPublishingSuggestionPanel(true);
    const payload = { guildId, channelId: suggestionChannelId };
    try {
      const idempotencyKey = await messageOperationKey(payload);
      const res = await fetch('/api/social/suggestions/panel', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotencyKey }) });
      const data = await res.json();
      if (data.operationStatus === 'SUCCESS') {
        await finishMessageOperationKey(payload, 'SUCCESS');
        setSuggestionPanelStatus('SYNCED');
        setFeedback({ type: 'success', message: 'Suggestion panel delivery was confirmed.' });
      } else {
        if (data.operationStatus === 'FAILURE') await finishMessageOperationKey(payload, 'FAILURE');
        setSuggestionPanelStatus(data.operationStatus || 'UNKNOWN');
        setFeedback({ type: 'error', message: data.error || 'Panel delivery is unconfirmed. Retry to safely check the same operation.' });
      }
      await fetchData();
    } catch {
      setFeedback({ type: 'error', message: 'Could not confirm panel delivery. Retry without changing the channel to check the same operation.' });
    } finally { setIsPublishingSuggestionPanel(false); }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Social"
        subtitle="Manage polls, suggestions, and community feedback."
      />

      <PageContainer className="space-y-6">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--surface-1)] border border-[var(--border-base)] ">
            <button
              type="button"
              onClick={() => setActiveTab('POLLS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                activeTab === 'POLLS'
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Interactive Polls ({polls.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUGGESTIONS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                activeTab === 'SUGGESTIONS'
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Operator Suggestions ({suggestions.length})</span>
            </button>
          </div>

          {activeTab === 'POLLS' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPollModal(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Poll</span>
            </Button>
          )}
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

        {/* Content Section */}
        {activeTab === 'POLLS' ? (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : polls.length === 0 ? (
            <EmptyState
              icon={Vote}
              title="No active polls"
              description="Deploy a community voting survey with interactive reactions."
              actionLabel="Launch Poll"
              onAction={() => setShowPollModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {polls.map((p) => {
                return (
                  <Card
                    key={p.id}
                    className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5  flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                          {p.question}
                        </h4>
                        <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {p.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        {p.results.map((result, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px] text-[var(--text-secondary)] flex items-center justify-between"
                          >
                            <span>{result.option}</span>
                            <span className="text-[13px] text-[var(--text-secondary)] font-mono">
                              {p.status === 'CLOSED' ? `${result.votes} votes · ${result.percentage}%` : `Option ${i + 1} · ${result.votes} votes`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-base)] text-[13px] text-[var(--text-secondary)] flex items-center justify-between gap-2">
                      <span>{p.totalVotes} total votes · #{p.channelId}</span>
                      {p.status === 'ACTIVE' ? <Button variant="ghost" size="sm" onClick={() => void handleClosePoll(p.id)}>Close poll</Button>
                        : p.status === 'PENDING' || p.status === 'UNKNOWN'
                          ? <Button variant="ghost" size="sm" onClick={() => void handleRetryPoll(p.id)}>Check / resume delivery</Button>
                          : <span>{p.messageSyncStatus === 'NEEDS_UPDATE' ? 'Message update pending' : new Date(p.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          /* Suggestions Tab */
          <div className="space-y-5">
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 ">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div><ChannelSelector channels={channels} selectedChannelId={suggestionChannelId}
                onSelectChannel={(channel) => setSuggestionChannelId(channel.id)} isLoading={isLoading} /></div>
              <Button variant="primary" size="sm" disabled={!suggestionChannelId || isPublishingSuggestionPanel} onClick={() => void handleSuggestionPanel()}>
                {isPublishingSuggestionPanel ? 'Checking delivery…' : suggestionPanelStatus === 'SYNCED' ? 'Verify / publish panel' : 'Configure & publish panel'}
              </Button>
            </div>
            <p className="mt-3 text-[13px] text-[var(--text-secondary)]">Panel state: {suggestionPanelStatus}. Community members submit through Discord; staff decisions are managed below.</p>
          </Card>
          {isLoading ? <div className="text-sm text-[var(--text-secondary)]">Loading suggestions…</div> : suggestions.length === 0 ?
            <EmptyState icon={Lightbulb} title="No suggestions yet" description="Publish the panel above to accept community suggestions." /> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {suggestions.map((s) => (
              <Card
                key={s.id}
                className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5  flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {s.title}
                    </h4>
                    <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'IMPLEMENTED' ? 'cyan' : 'neutral'}>
                      {s.status}
                    </Badge>
                  </div>

                  <p className="text-[13px] text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                    {s.content}
                  </p>
                  {s.deliveryStatus !== 'SYNCED' && <p className="text-[13px] text-[var(--accent)] mb-2">Discord delivery: {s.deliveryStatus}. Do not resubmit; staff should verify the existing message operation.</p>}
                  {s.messageSyncStatus !== 'SYNCED' && <p className="text-[13px] text-[var(--accent)] mb-2">Discord review update: {s.messageSyncStatus}; local status is authoritative, message update is not confirmed.</p>}
                </div>

                <div className="pt-3 border-t border-[var(--border-base)] flex items-center justify-between">
                  <Select aria-label="status"
                    value={s.status}
                    onChange={(e) => { if (isSuggestionStatus(e.target.value)) void handleUpdateSuggestionStatus(s.id, e.target.value); }}
                    className=""
                  >
                    {(s.status === 'SUBMITTED' ? ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']
                      : s.status === 'UNDER_REVIEW' ? ['UNDER_REVIEW', 'APPROVED', 'REJECTED']
                      : s.status === 'APPROVED' ? ['APPROVED', 'IMPLEMENTED', 'REJECTED'] : [s.status]).map(status =>
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                  </Select>

                  <span className="text-[13px] text-[var(--text-secondary)]">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {(s.deliveryStatus === 'PENDING' || s.deliveryStatus === 'UNKNOWN') &&
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => void handleRecoverSuggestion(s.id)}>Check existing delivery</Button>}
                {s.messageSyncStatus !== 'SYNCED' &&
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => void handleUpdateSuggestionStatus(s.id, s.status)}>Retry Discord status sync</Button>}
              </Card>
            ))}
          </div>}
          </div>
        )}

        {/* Create Poll Modal */}
        <Modal
          isOpen={showPollModal}
          onClose={() => setShowPollModal(false)}
          title="Create Interactive Poll"
          subtitle="Deploy a real-time community poll to target Discord channel"
        >
          <form onSubmit={handleCreatePoll} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Poll Question / Prompt
              </label>
              <Input aria-label="Poll Question / Prompt"
                type="text"
                required
                placeholder="e.g. Preferred time for security sync?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">Expires after</label>
              <Select aria-label="Expires after" value={durationHours ?? ''} onChange={event => setDurationHours(event.target.value ? Number(event.target.value) : null)}
                className="w-full">
                <option value="">No expiry</option>
                <option value={1}>1 hour</option><option value={6}>6 hours</option><option value={24}>24 hours</option>
                <option value={72}>3 days</option><option value={168}>7 days</option>
              </Select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Target Channel
              </label>
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={setSelectedChannel}
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-[var(--text-secondary)]">
                Voting Options (2-5)
              </label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input aria-label={`Option ${idx + 1}`}
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Remove poll option ${idx + 1}`}
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--danger)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                  className="text-[13px] text-[var(--accent)] font-semibold hover:underline"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPollModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreatingPoll}
              >
                Launch Poll
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
