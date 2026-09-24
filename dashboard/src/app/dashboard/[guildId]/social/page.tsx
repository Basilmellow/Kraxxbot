'use client';

import React, { useState, useEffect } from 'react';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ChannelSelector, ChannelItem } from '@/components/discord/ChannelSelector';
import {
  Vote,
  Plus,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  MessageSquare,
} from 'lucide-react';

interface PollItem {
  id: string;
  question: string;
  options: string;
  channelId: string;
  isAnonymous: boolean;
  expiresAt: string | null;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
}

interface SuggestionItem {
  id: string;
  title: string;
  content: string;
  authorId: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  reviewerNotes: string | null;
  createdAt: string;
}

export default function SocialPage() {
  const guildId = useGuildId();
  const [activeTab, setActiveTab] = useState<'POLLS' | 'SUGGESTIONS'>('POLLS');
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Poll Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [durationHours, setDurationHours] = useState(24);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
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
  };

  useEffect(() => {
    fetchData();
  }, [guildId]);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !selectedChannel) return;
    const validOpts = pollOptions.filter((o) => o.trim().length > 0);
    if (validOpts.length < 2) return;

    setIsCreatingPoll(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/social/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          guildId,
          options: validOpts,
          channelId: selectedChannel.id,
          durationHours,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Interactive poll published.' });
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['Option 1', 'Option 2']);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to dispatch poll' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Poll creation error' });
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleUpdateSuggestionStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/social/suggestions/${id}?guildId=${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status: status as any } : s)));
      }
    } catch (err) {
      console.error('Failed to update suggestion status:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Community Engagement & Social Signals"
        subtitle="Live Polls, Operator Suggestions & Guild Sentiment Engine"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('POLLS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'POLLS'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Interactive Polls ({polls.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUGGESTIONS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'SUGGESTIONS'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Operator Suggestions ({suggestions.length})</span>
            </button>
          </div>

          {activeTab === 'POLLS' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPollModal(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Poll</span>
            </Button>
          )}
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
                let optionsArr: string[] = [];
                try {
                  optionsArr = JSON.parse(p.options);
                } catch {
                  optionsArr = [p.options];
                }

                return (
                  <Card
                    key={p.id}
                    className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-[#101828]">
                          {p.question}
                        </h4>
                        <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {p.status}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        {optionsArr.map((opt, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#344054] flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            <span className="text-[10px] text-[#98A2B3] font-mono">Option {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F1F3F9] text-xs text-[#667085] flex items-center justify-between">
                      <span>Channel: #{p.channelId}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          /* Suggestions Tab */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {suggestions.map((s) => (
              <Card
                key={s.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-[#101828]">
                      {s.title}
                    </h4>
                    <Badge variant={s.status === 'APPROVED' ? 'success' : s.status === 'IMPLEMENTED' ? 'cyan' : 'neutral'}>
                      {s.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#667085] line-clamp-3 mb-4 leading-relaxed">
                    {s.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
                  <select
                    value={s.status}
                    onChange={(e) => handleUpdateSuggestionStatus(s.id, e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="IMPLEMENTED">Implemented</option>
                    <option value="REJECTED">Rejected</option>
                  </select>

                  <span className="text-[11px] text-[#98A2B3]">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Poll Modal */}
        <Modal
          isOpen={showPollModal}
          onClose={() => setShowPollModal(false)}
          title="Create Interactive Poll"
          subtitle="Deploy a real-time community poll to target Discord channel"
        >
          <form onSubmit={handleCreatePoll} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Poll Question / Prompt
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Preferred time for security sync?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Target Channel
              </label>
              <ChannelSelector
                channels={channels}
                selectedChannelId={selectedChannel?.id || ''}
                onSelectChannel={setSelectedChannel}
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-[#344054]">
                Voting Options (2-5)
              </label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      className="p-2 text-[#98A2B3] hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
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
      </div>
    </div>
  );
}
