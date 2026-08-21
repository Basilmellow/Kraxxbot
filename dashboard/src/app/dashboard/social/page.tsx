'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
    if (validOpts.length < 2) {
      alert('Please provide at least 2 non-empty poll options.');
      return;
    }

    setIsCreatingPoll(true);
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
        setFeedback({ type: 'success', message: 'Poll published to Discord channel.' });
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['Option 1', 'Option 2']);
        fetchData();
      } else {
        alert(data.error || 'Failed to create poll');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating poll');
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleSuggestionStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/social/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status: newStatus as any } : s)));
        setFeedback({ type: 'success', message: 'Suggestion status updated.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update suggestion');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating suggestion');
    }
  };

  return (
    <div>
      <Topbar
        title="Social & Community"
        subtitle="Live Community Polls, Suggestion Box & Feedback Channels"
        onRefresh={fetchData}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0f1318] border border-[#1e2a38]">
            <button
              type="button"
              onClick={() => setActiveTab('POLLS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'POLLS'
                  ? 'bg-[#00f0ff] text-[#0a0e15]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Polls ({polls.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUGGESTIONS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'SUGGESTIONS'
                  ? 'bg-[#00f0ff] text-[#0a0e15]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Suggestions ({suggestions.length})</span>
            </button>
          </div>

          {activeTab === 'POLLS' && (
            <Button variant="primary" size="sm" onClick={() => setShowPollModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              <span>Create Discord Poll</span>
            </Button>
          )}
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

        {/* Polls Tab */}
        {activeTab === 'POLLS' && (
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#1e2a38]">
              <CardTitle>
                <Vote className="w-4 h-4 text-[#00f0ff]" />
                <span>Live Discord Community Polls</span>
              </CardTitle>
            </div>

            <div className="overflow-x-auto">
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Poll Question</th>
                    <th>Channel Target</th>
                    <th>Expires At</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                        Loading polls...
                      </td>
                    </tr>
                  ) : polls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                        No active polls found. Create a poll to broadcast to Discord.
                      </td>
                    </tr>
                  ) : (
                    polls.map((p) => (
                      <tr key={p.id}>
                        <td className="font-bold text-xs text-[#e2e8f0] max-w-sm">
                          {p.question}
                        </td>

                        <td className="font-mono text-xs text-[#94a3b8]">
                          <div className="flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5 text-[#64748b]" />
                            <span>{p.channelId}</span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap font-mono text-xs text-[#94a3b8]">
                          {p.expiresAt ? new Date(p.expiresAt).toLocaleString() : '—'}
                        </td>

                        <td>
                          <Badge variant={p.isAnonymous ? 'brand' : 'neutral'}>
                            {p.isAnonymous ? 'Anonymous' : 'Public'}
                          </Badge>
                        </td>

                        <td>
                          <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                            {p.status}
                          </Badge>
                        </td>

                        <td className="whitespace-nowrap font-mono text-xs text-[#64748b]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'SUGGESTIONS' && (
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#1e2a38]">
              <CardTitle>
                <Lightbulb className="w-4 h-4 text-[#00f0ff]" />
                <span>Community Feedback & Proposals</span>
              </CardTitle>
            </div>

            <div className="divide-y divide-[#1e2a38]">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-[#64748b]">Loading suggestions...</div>
              ) : suggestions.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#64748b]">No community suggestions submitted yet.</div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#e2e8f0]">{s.title}</h4>
                        <span className="text-[11px] font-mono text-[#64748b]">
                          Author ID: {s.authorId} • {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <select
                        value={s.status}
                        onChange={(e) => handleSuggestionStatus(s.id, e.target.value)}
                        className="px-2.5 py-1 rounded bg-[#0f1318] border border-[#1e2a38] text-xs font-semibold focus:outline-none focus:border-[#00f0ff]/50"
                      >
                        <option value="SUBMITTED">Submitted</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="IMPLEMENTED">Implemented</option>
                      </select>
                    </div>

                    <p className="text-xs text-[#94a3b8] leading-relaxed">{s.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Vote className="w-4 h-4 text-[#00f0ff]" />
                <span>Create Community Poll</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPollModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Poll Question</label>
                <input
                  type="text"
                  placeholder="e.g. Which CTF workshop topic should we host next?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Target Channel</label>
                <ChannelSelector
                  channels={channels}
                  selectedChannelId={selectedChannel?.id || ''}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Poll Options</label>
                <div className="space-y-1.5">
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...pollOptions];
                        updated[idx] = e.target.value;
                        setPollOptions(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                    />
                  ))}
                </div>
                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                    className="mt-1.5 text-[11px] text-[#00f0ff] font-semibold hover:underline"
                  >
                    + Add another option
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Duration (Hours)</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-[#1e2a38] text-[#00f0ff]"
                    />
                    <span>Anonymous Voting</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPollModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreatingPoll}>
                  Broadcast Poll
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
