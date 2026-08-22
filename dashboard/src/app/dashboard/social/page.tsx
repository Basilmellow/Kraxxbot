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
  Vote,
  Plus,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Hash,
  Sparkles,
  X,
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
        fetch('/api/social/polls'),
        fetch('/api/social/suggestions'),
        fetch('/api/discord/meta'),
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
  }, []);

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
          options: validOpts,
          channelId: selectedChannel.id,
          durationHours,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Poll deployed to Discord channel.' });
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

  const handleUpdateSuggestion = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/social/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSuggestions(
          suggestions.map((s) => (s.id === id ? { ...s, status: newStatus as any } : s))
        );
      }
    } catch (err) {
      console.error('Update suggestion failed:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="COMMUNITY OPS & SUGGESTIONS"
        subtitle="Interactive Discord Polls, Member Feedback Stream & Governance"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded bg-[#0A0F16] border border-[#16202E]">
            <button
              type="button"
              onClick={() => setActiveTab('POLLS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                activeTab === 'POLLS'
                  ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>DISCORD POLLS ({polls.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUGGESTIONS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                activeTab === 'SUGGESTIONS'
                  ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>SUGGESTIONS DESK ({suggestions.length})</span>
            </button>
          </div>

          {activeTab === 'POLLS' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPollModal(true)}
              className="font-mono text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DEPLOY NEW POLL</span>
            </Button>
          )}
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

        {/* Content Tabs */}
        {activeTab === 'POLLS' ? (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : polls.length === 0 ? (
              <EmptyState
                icon={Vote}
                title="NO ACTIVE POLLS RECORDED"
                description="There are currently no active community polls deployed in Discord."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPollModal(true)}
                    className="font-mono text-xs"
                  >
                    DEPLOY FIRST POLL
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {polls.map((p) => {
                  let optArr: string[] = [];
                  try {
                    optArr = JSON.parse(p.options);
                  } catch {}

                  return (
                    <Card
                      key={p.id}
                      className="bg-[#0A0F16] p-4 space-y-3 font-mono text-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={p.status === 'ACTIVE' ? 'brand' : 'neutral'}>
                            {p.status}
                          </Badge>
                          <span className="text-[10px] text-[#64748B]">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-bold text-[#F1F5F9] text-sm">{p.question}</h3>

                        <div className="space-y-1 pt-1">
                          {optArr.map((opt, i) => (
                            <div
                              key={i}
                              className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[11px] text-[#94A3B8]"
                            >
                              {i + 1}. {opt}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#16202E] text-[10px] text-[#64748B]">
                        Target: #{p.channelId}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="NO COMMUNITY SUGGESTIONS"
                description="No incoming community suggestions are currently in the review pipeline."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((s) => (
                  <Card
                    key={s.id}
                    className="bg-[#0A0F16] p-4 space-y-3 font-mono text-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            s.status === 'APPROVED' || s.status === 'IMPLEMENTED'
                              ? 'success'
                              : s.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {s.status}
                        </Badge>
                        <span className="text-[10px] text-[#64748B]">Author: {s.authorId}</span>
                      </div>

                      <h3 className="font-bold text-[#F1F5F9] text-sm">{s.title}</h3>
                      <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                        {s.content}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#16202E] flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>

                      <select
                        value={s.status}
                        onChange={(e) => handleUpdateSuggestion(s.id, e.target.value)}
                        className="bg-[#070B10] border border-[#16202E] rounded px-2 py-1 text-[11px] text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                      >
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="UNDER_REVIEW">UNDER REVIEW</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="IMPLEMENTED">IMPLEMENTED</option>
                      </select>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Poll Modal */}
        {showPollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <Vote className="w-4 h-4 text-[#22D3EE]" />
                  <span>DEPLOY INTERACTIVE POLL</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePoll} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    POLL QUESTION
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Which operational sprint objective should be prioritized?"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={setSelectedChannel}
                />

                <div className="space-y-2">
                  <label className="block text-[10px] text-[#94A3B8] uppercase">
                    POLL OPTIONS
                  </label>
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const updated = [...pollOptions];
                        updated[i] = e.target.value;
                        setPollOptions(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                      className="text-[10px] text-[#22D3EE] hover:underline"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16202E]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPollModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isCreatingPoll}
                    disabled={!selectedChannel}
                  >
                    DEPLOY POLL
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
